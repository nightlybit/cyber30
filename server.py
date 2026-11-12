#!/usr/bin/env python3
"""Cyber30 server: one shared SQLite database for the Linux and Android app.

Pure Python standard library - nothing to pip install.
  python3 server.py            # serve on 0.0.0.0:8730
  python3 server.py --port 9000

* Serves the installable web app (web/) and the lessons (content/days/).
* /api/* is protected by an access key (except from this machine itself), so
  other people on your Wi-Fi can't read or change your progress.
* Sync is "last write wins" per record, so the phone can work offline and
  merge later.
* Pulls CISA's Known Exploited Vulnerabilities feed daily (real, current
  in-the-wild exploits) for the Threats tab.
* Sends reminders: desktop notification (notify-send) and, optionally, a push
  to your phone through the free ntfy app.
"""
import argparse, datetime as dt, json, mimetypes, os, re, secrets, socket, sqlite3, subprocess
import threading, time, urllib.request
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ROOT, "web")
CONTENT = os.path.join(ROOT, "content", "days")
DATA = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA, "cyber30.db")
KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
KEV_CACHE = os.path.join(DATA, "kev.json")
os.makedirs(DATA, exist_ok=True)

# ---------------------------------------------------------------- database
SCHEMA = """
CREATE TABLE IF NOT EXISTS kv       (key TEXT PRIMARY KEY, value TEXT, updated REAL);
CREATE TABLE IF NOT EXISTS progress (id TEXT PRIMARY KEY, day INT, done INT, updated REAL);
CREATE TABLE IF NOT EXISTS quiz     (day INT PRIMARY KEY, score INT, total INT, updated REAL);
CREATE TABLE IF NOT EXISTS journal  (day INT PRIMARY KEY, text TEXT, updated REAL);
CREATE TABLE IF NOT EXISTS flash    (term TEXT PRIMARY KEY, box INT, due TEXT, updated REAL);
CREATE TABLE IF NOT EXISTS activity (date TEXT PRIMARY KEY, updated REAL);
"""
_lock = threading.Lock()


def db():
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    return con


with db() as c:
    c.executescript(SCHEMA)

TABLES = {  # table -> (primary key, columns)
    "kv": ("key", ["key", "value", "updated"]),
    "progress": ("id", ["id", "day", "done", "updated"]),
    "quiz": ("day", ["day", "score", "total", "updated"]),
    "journal": ("day", ["day", "text", "updated"]),
    "flash": ("term", ["term", "box", "due", "updated"]),
    "activity": ("date", ["date", "updated"]),
}
PRIVATE_KV = {"ntfy_topic"}  # still synced, but never logged


def dump_state():
    with db() as c:
        return {t: [dict(r) for r in c.execute(f"SELECT * FROM {t}")] for t in TABLES}


def merge(incoming):
    """Last-write-wins merge of client records into the database."""
    with _lock, db() as c:
        for table, (pk, cols) in TABLES.items():
            for rec in incoming.get(table, []) or []:
                if not isinstance(rec, dict) or pk not in rec:
                    continue
                rec = {k: rec.get(k) for k in cols}
                try:
                    rec["updated"] = float(rec.get("updated") or 0)
                except (TypeError, ValueError):
                    continue
                row = c.execute(f"SELECT updated FROM {table} WHERE {pk}=?", (rec[pk],)).fetchone()
                if row is None or rec["updated"] > (row["updated"] or 0):
                    c.execute(
                        f"INSERT OR REPLACE INTO {table} ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
                        [rec[k] for k in cols],
                    )


def kv_get(key, default=None):
    with db() as c:
        r = c.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
    return r["value"] if r and r["value"] not in (None, "") else default


# ---------------------------------------------------------------- access key
KEY_FILE = os.path.join(DATA, "access_key.txt")
if not os.path.exists(KEY_FILE):
    with open(KEY_FILE, "w") as f:
        f.write(secrets.token_urlsafe(18))
    os.chmod(KEY_FILE, 0o600)
ACCESS_KEY = open(KEY_FILE).read().strip()


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


# ---------------------------------------------------------------- lessons
def day_files():
    return sorted(f for f in os.listdir(CONTENT) if re.fullmatch(r"day\d\d\.json", f)) if os.path.isdir(CONTENT) else []


def course_index():
    out = []
    for f in day_files():
        try:
            d = json.load(open(os.path.join(CONTENT, f), encoding="utf-8"))
            out.append({k: d.get(k) for k in ("day", "week", "title", "theme", "minutes", "mindset")})
        except (OSError, ValueError):
            continue
    return out


# ---------------------------------------------------------------- threat feed (CISA KEV)
def refresh_kev(force=False):
    fresh = os.path.exists(KEV_CACHE) and time.time() - os.path.getmtime(KEV_CACHE) < 6 * 3600
    if fresh and not force:
        return
    try:
        req = urllib.request.Request(KEV_URL, headers={"User-Agent": "cyber30-learning-app"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        tmp = KEV_CACHE + ".tmp"
        json.dump(data, open(tmp, "w"))
        os.replace(tmp, KEV_CACHE)
        print(f"[threats] KEV feed updated: {len(data.get('vulnerabilities', []))} entries")
    except Exception as e:  # offline is fine - keep old cache
        print(f"[threats] could not refresh KEV feed: {e}")


def threats(limit=40):
    if not os.path.exists(KEV_CACHE):
        refresh_kev(force=True)
    try:
        data = json.load(open(KEV_CACHE))
    except (OSError, ValueError):
        return {"updated": None, "items": []}
    vulns = sorted(data.get("vulnerabilities", []), key=lambda v: v.get("dateAdded", ""), reverse=True)
    keep = ("cveID", "vendorProject", "product", "vulnerabilityName", "dateAdded", "shortDescription",
            "requiredAction", "dueDate", "knownRansomwareCampaignUse", "cwes")
    return {"updated": data.get("dateReleased"), "count": len(vulns),
            "items": [{k: v.get(k) for k in keep} for v in vulns[:limit]]}


# ---------------------------------------------------------------- reminders
def notify(title, body):
    try:  # Linux desktop
        subprocess.run(["notify-send", "-a", "Cyber30", "-i", "security-high", title, body], timeout=5)
    except Exception:
        pass
    topic = kv_get("ntfy_topic")
    if topic and re.fullmatch(r"[A-Za-z0-9_-]{6,64}", topic):  # Android via the ntfy app
        try:
            req = urllib.request.Request(f"https://ntfy.sh/{topic}", data=body.encode(),
                                         headers={"Title": title, "Tags": "shield", "Priority": "high"})
            urllib.request.urlopen(req, timeout=10).close()
        except Exception as e:
            print(f"[notify] ntfy failed: {e}")


def current_day():
    start = kv_get("start_date")
    if not start:
        return None
    try:
        n = (dt.date.today() - dt.date.fromisoformat(start)).days + 1
    except ValueError:
        return None
    return max(1, min(30, n))


def did_today():
    with db() as c:
        return c.execute("SELECT 1 FROM activity WHERE date=?", (dt.date.today().isoformat(),)).fetchone() is not None


def reminder_loop():
    sent = set()
    while True:
        try:
            now = dt.datetime.now()
            hhmm, today = now.strftime("%H:%M"), now.date().isoformat()
            day = current_day()
            if day and kv_get("notify_enabled", "1") == "1":
                morning = kv_get("notify_time", "08:00")
                evening = kv_get("nudge_time", "20:00")
                if hhmm == morning and (today, "m") not in sent:
                    sent.add((today, "m"))
                    notify(f"Day {day} is ready", "Your next 5-minute card is waiting. Small steps, every day.")
                if hhmm == evening and (today, "e") not in sent and not did_today():
                    sent.add((today, "e"))
                    notify("Keep your streak alive", f"Just one card from Day {day} keeps your streak going. Takes 3 minutes.")
            if now.minute == 0 and (today, now.hour, "kev") not in sent:
                sent.add((today, now.hour, "kev"))
                refresh_kev()
        except Exception as e:
            print(f"[reminder] {e}")
        time.sleep(20)


# ---------------------------------------------------------------- HTTP
SEC_HEADERS = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; "
                               "style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; "
                               "frame-ancestors 'none'; base-uri 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
}
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/javascript", ".js")


class Handler(BaseHTTPRequestHandler):
    server_version = "Cyber30"
    sys_version = ""

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            print(f"[{self.client_address[0]}] {self.command} {urlparse(self.path).path} {args[1] if len(args) > 1 else ''}")

    def send(self, code, body, ctype="application/json", extra=None):
        if not isinstance(body, bytes):
            body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in {**SEC_HEADERS, **(extra or {})}.items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def authorized(self):
        if self.client_address[0] in ("127.0.0.1", "::1"):
            return True
        return secrets.compare_digest(self.headers.get("X-Key", ""), ACCESS_KEY)

    def static(self, path):
        if path == "/":
            path = "/index.html"
        base = CONTENT if path.startswith("/content/days/") else WEB
        rel = path[len("/content/days/"):] if base == CONTENT else path.lstrip("/")
        full = os.path.realpath(os.path.join(base, rel))
        if not full.startswith(os.path.realpath(base) + os.sep) or not os.path.isfile(full):
            return self.send(404, {"error": "not found"})  # blocks ../ path traversal (see Day 20!)
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype.endswith(("json", "javascript")):
            ctype += "; charset=utf-8"
        self.send(200, open(full, "rb").read(), ctype, {"Cache-Control": "no-cache"})

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return self.static(u.path)
        if not self.authorized():
            return self.send(401, {"error": "access key required"})
        if u.path == "/api/state":
            return self.send(200, dump_state())
        if u.path == "/api/course":
            return self.send(200, course_index())
        if u.path == "/api/threats":
            return self.send(200, threats(int(parse_qs(u.query).get("limit", ["40"])[0])))
        if u.path == "/api/connect":  # only shown on this machine
            if self.client_address[0] not in ("127.0.0.1", "::1"):
                return self.send(403, {"error": "open this page on the Kali machine"})
            return self.send(200, {"url": f"http://{lan_ip()}:{self.server.server_port}/?k={ACCESS_KEY}",
                                   "key": ACCESS_KEY})
        self.send(404, {"error": "unknown endpoint"})

    def do_POST(self):
        u = urlparse(self.path)
        if not self.authorized():
            return self.send(401, {"error": "access key required"})
        length = int(self.headers.get("Content-Length") or 0)
        if length > 2_000_000:
            return self.send(413, {"error": "too large"})
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            return self.send(400, {"error": "bad json"})
        if u.path == "/api/sync":
            merge(payload)
            return self.send(200, dump_state())
        if u.path == "/api/test-notify":
            notify("Cyber30 test", "Notifications are working. See you tomorrow!")
            return self.send(200, {"ok": True})
        self.send(404, {"error": "unknown endpoint"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8730)
    ap.add_argument("--host", default="0.0.0.0")
    a = ap.parse_args()
    threading.Thread(target=refresh_kev, daemon=True).start()
    threading.Thread(target=reminder_loop, daemon=True).start()
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    print(f"\n  Cyber30 is running.\n  On this Kali machine:  http://localhost:{a.port}\n"
          f"  On your Android phone (same Wi-Fi): http://{lan_ip()}:{a.port}/?k={ACCESS_KEY}\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
