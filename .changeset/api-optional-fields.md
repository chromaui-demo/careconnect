---
"@careconnect/api": patch
---

Requests that leave optional fields out no longer fail with a server error. Registering a walk-in from the EHR (which sends no phone or email) and saving any section of an encounter chart both failed before.
