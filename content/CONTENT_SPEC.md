# Cyber30 content spec

Learner: complete beginner on Kali Linux. Goal after 30 days: think like a security professional,
understand how each major attack works and the thinking behind it, speak the vocabulary with peers,
and get in the habit of spotting vulnerabilities.

## Style rules (very important)
- Write for a smart layman. Every technical word is explained the first time, with an everyday analogy
  (houses, locks, post office, restaurants, phone calls...).
- Bite-sized: each card body is 40-110 words. Short sentences. No walls of text.
- Always teach the *why* and the *attacker's thinking*, not only the *what*.
- Accurate. Commands must work on current Kali Linux (2026). Do not invent tools, flags, CVEs or incidents.
  Real-world stories must be well-documented public incidents (e.g. Equifax/Apache Struts 2017, Log4Shell 2021,
  MOVEit 2023, Target 2013, SolarWinds 2020, WannaCry/EternalBlue 2017, Colonial Pipeline 2021, Heartbleed 2014).
- Ethics: labs ONLY against the learner's own machine/VMs, localhost, or platforms that grant permission
  (OverTheWire, TryHackMe free rooms, Hack The Box, PortSwigger Web Security Academy, scanme.nmap.org for
  light nmap scans, VulnHub/Metasploitable 2 VMs in VirtualBox). Every lab has a `safety` note.
- Light markdown allowed inside strings: **bold**, `code`, and line breaks as \n. No HTML.

## File format
One file per day: `content/days/dayNN.json` (two digits, e.g. day07.json). Must be valid JSON (check with
`python3 -m json.tool FILE > /dev/null`).

```json
{
  "day": 7,
  "week": 1,
  "title": "Short catchy title",
  "theme": "Which skill area (e.g. Networking, Web, Recon)",
  "minutes": 45,
  "mindset": "One sentence: the mental shift for today (e.g. 'Every input box is a question the developer forgot to ask')",
  "cards": [
    { "title": "Card title", "body": "40-110 words, layman, with an analogy." }
  ],
  "attacks": [
    {
      "name": "Attack name",
      "analogy": "Everyday analogy in 1-2 sentences",
      "how": ["Step 1 of how it works", "Step 2", "Step 3"],
      "thinking": "What the attacker notices/asks themselves that makes them try this",
      "signs": "How defenders detect it (logs, symptoms)",
      "defend": "How to prevent/fix it"
    }
  ],
  "story": { "title": "Real incident name + year", "body": "60-120 words: what happened, which weakness, lesson." },
  "lab": {
    "title": "Hands-on task title",
    "goal": "What you will achieve",
    "steps": ["Plain step", "Plain step"],
    "commands": [ { "cmd": "nmap -sV scanme.nmap.org", "explain": "What each part does, in plain words" } ],
    "safety": "Legal/ethical note for this lab"
  },
  "hunt": "A 'vulnerability-spotting' thinking exercise: describe a small scenario and ask what is wrong. Then 'Answer:' with the explanation.",
  "terms": [ { "term": "CVE", "def": "Layman definition (1-2 sentences)", "use": "Example sentence a pro would say in conversation" } ],
  "quiz": [ { "q": "Question", "options": ["A", "B", "C", "D"], "answer": 0, "why": "Why that is correct" } ],
  "talk": { "scenario": "A peer/manager asks you X", "model": "A model professional answer (3-5 sentences) using today's terms" },
  "reflect": "Journal question to answer in your own words"
}
```

Counts per day: 5-7 cards, 1-3 attacks (attacks may be [] on pure foundation days), 1 story, 1 lab with 2-6
commands, 1 hunt, 5-7 terms, 4-5 quiz questions (vary the correct answer index), 1 talk, 1 reflect.

## 30-day outline
Week 1 - Foundations & mindset
1. The hacker mindset: CIA triad, threat/vulnerability/risk, hat colors, the law & permission, Kali tour
2. Linux terminal essentials: filesystem, navigation, files, pipes, man pages
3. Linux users, permissions, processes, services (SUID, sudo, why least privilege matters)
4. Networking 101: IP, MAC, ports, TCP/UDP, the 3-way handshake, OSI/TCP-IP model in plain words
5. How the web works: DNS, HTTP requests/responses, cookies, HTTPS/TLS
6. Seeing traffic: Wireshark & tcpdump, reading packets, plaintext protocols
Week 2 - Recon & network attacks
7. Threat modeling & attack surface (STRIDE, assets, trust boundaries), thinking in attack trees
8. OSINT & passive recon (whois, DNS enumeration, Google dorks, theHarvester, Shodan concept)
9. Nmap deep dive: host discovery, scan types, service/version detection, NSE scripts
10. Service enumeration: FTP, SSH, SMB, HTTP banners; enum4linux, gobuster/ffuf directory brute force
11. Vulnerabilities explained: CVE, CWE, CVSS, CISA KEV, exploit-db/searchsploit, zero-day vs n-day
12. Passwords: hashing vs encryption, salts, cracking with john/hashcat, brute force & spraying, hydra
Week 3 - Network/web attacks
13. Man-in-the-middle: ARP spoofing, sniffing, DNS spoofing, why HTTPS & HSTS matter
14. Wireless security: WPA2/WPA3, handshake capture concept, evil twin, aircrack-ng suite (own network only)
15. Web proxying with Burp Suite: intercepting, Repeater, how to read a web app like an attacker
16. OWASP Top 10 overview + Broken Access Control & IDOR
17. SQL injection (in-band, blind), sqlmap, parameterized queries
18. Cross-Site Scripting (reflected, stored, DOM), CSP, output encoding
Week 4 - Web, exploitation & privilege escalation
19. Authentication & sessions: session hijacking, CSRF, JWT flaws, MFA, credential stuffing
20. SSRF, path traversal/LFI, file upload flaws, OS command injection
21. API security (OWASP API Top 10: BOLA, mass assignment, rate limiting) + deserialization concept
22. Exploitation: Metasploit framework, payloads, bind vs reverse shells, listeners (netcat)
23. Linux privilege escalation: SUID, sudo misconfig, cron, kernel exploits, linpeas
24. Windows & Active Directory: domains, Kerberos, pass-the-hash, Kerberoasting, BloodHound, mimikatz concept
Final stretch - Defender's view & professional practice
25. Malware & social engineering: phishing anatomy, ransomware, C2, macros, pretexting
26. Blue team: logs, SIEM, IDS (Snort/Suricata), MITRE ATT&CK, the cyber kill chain, detection engineering
27. Cloud & container security: shared responsibility, misconfigured S3 buckets, IAM, Docker escape concept, secrets
28. Zero-days & vuln research: fuzzing, patch diffing, responsible disclosure, bug bounty methodology
29. Speaking & writing like a pro: pentest report structure, severity, executive summary, incident response (PICERL)
30. Capstone: full methodology on a practice box (recon -> enum -> exploit -> privesc -> report) + career roadmap
