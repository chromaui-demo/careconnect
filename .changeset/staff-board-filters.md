---
"@careconnect/api": patch
"@careconnect/api-client": patch
"@careconnect/ehr": patch
---

Clinical staff can filter the tracking board by provider and location: the lists came from admin-only endpoints, so staff saw only "All". Choosing a provider now filters the board for everyone; it matched no visits before, because the board sent "First Last" and the API expected "Dr. First Last". The board now filters by provider id.
