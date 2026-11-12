# Cyber30: think like a security expert in 30 days

One app for **Kali Linux** and **Android**, sharing **one database** (SQLite on your Kali machine).

## Install (Kali)
```bash
./install.sh
```
This starts the server automatically at login and adds **Cyber30** to your app menu.
To try it without installing, run `python3 server.py` and open http://localhost:8730.

## Add your Android phone
1. Phone on the same Wi-Fi as Kali.
2. On Kali, open the app → **Me** tab → scan the QR code with your phone.
3. In Chrome: menu ⋮ → **Add to Home screen**.
The phone works offline too and syncs when it's back on your Wi-Fi.

**Phone reminders:** install the free **ntfy** app, then in Cyber30's Me tab tap *New* to create a private
topic, *Save*, and subscribe to the same topic in ntfy. Linux reminders appear as desktop pop-ups.

## What's inside
- 30 days, each split into 2–4-minute steps: mindset → micro-lessons → attack breakdowns (how it works,
  the attacker's thinking, how to detect and stop it) → real incident → spot-the-bug drill → Kali lab →
  quiz → vocabulary → "talk like a pro" drill → journal.
- Recall: spaced-repetition flashcards for every term, plus a searchable glossary.
- Live threats: CISA's Known Exploited Vulnerabilities list, refreshed daily and linked to the lesson that
  teaches each weakness type.
- Streaks, XP, levels, 25-minute focus/break reminder, dark and light themes, backup export and import.

## Helper agents (Claude Code)
In `.claude/agents/`, each keeps its own memory file in `.claude/agent-memory/`:
- **threat-intel**: checks new exploited vulns and zero-days, maps them to lessons, and updates memory.
- **curriculum-writer**: writes or refreshes lessons to `content/CONTENT_SPEC.md`.
- **app-qa**: tests the app and its security.

## Files
`server.py` server and DB · `web/` app · `content/days/` lessons · `data/` database, access key, and threat cache
(keep `data/access_key.txt` private).
