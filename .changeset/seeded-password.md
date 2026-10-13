---
"@careconnect/api": minor
"@careconnect/ehr": patch
---

Deployed environments no longer use the public demo password. The API reads the seeded accounts' password from `SEEDED_PASSWORD`, which the installer generates on first install, and refuses to seed accounts with the documented default under `NODE_ENV=production`. Creating an employee now requires a password of at least 12 characters, and the EHR's Add Employee dialog asks for one.
