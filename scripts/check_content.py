"""Validate content/days/*.json against the spec. Usage: python3 scripts/check_content.py"""
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "days")
problems, present = [], []
for n in range(1, 31):
    p = os.path.join(D, f"day{n:02d}.json")
    if not os.path.exists(p):
        continue
    present.append(n)
    try:
        d = json.load(open(p, encoding="utf-8"))
    except ValueError as e:
        problems.append(f"day{n:02d}: invalid JSON {e}"); continue
    need = ["day", "title", "theme", "mindset", "cards", "lab", "terms", "quiz", "talk", "reflect"]
    problems += [f"day{n:02d}: missing {k}" for k in need if not d.get(k)]
    if d.get("day") != n: problems.append(f"day{n:02d}: 'day' field is {d.get('day')}")
    for i, c in enumerate(d.get("cards", [])):
        w = len(str(c.get("body", "")).split())
        if w > 130: problems.append(f"day{n:02d}: card {i+1} is {w} words (keep it bite-sized)")
    for i, q in enumerate(d.get("quiz", [])):
        if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < len(q.get("options", [])):
            problems.append(f"day{n:02d}: quiz {i+1} answer index out of range")
    for a in d.get("attacks", []) or []:
        problems += [f"day{n:02d}: attack '{a.get('name')}' missing {k}" for k in ("analogy", "how", "thinking", "signs", "defend") if not a.get(k)]
missing = [n for n in range(1, 31) if n not in present]
print(f"{len(present)}/30 days present" + (f"; missing: {missing}" if missing else ""))
print("\n".join(problems) or "No problems found.")
sys.exit(1 if problems else 0)
