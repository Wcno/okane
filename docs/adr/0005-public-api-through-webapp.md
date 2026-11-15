---
status: proposed
---

# Public API through the existing webapp boundary

Personal integrations need to read financial data and create records, including
from Google Apps Script. Extend the existing `webapp` entry point with `/api/v1`
and revocable personal access tokens: this supports scripts while preserving
the four required containers and a single external authentication boundary.
The browser application continues to use sessions and CSRF protection.

## Considered options

- Exposing `api-service` directly would duplicate authentication and expose a
  second service. Keep its authenticated internal identity contract instead.
- OAuth would support delegated third-party applications but adds a consent and
  authorization flow beyond the agreed personal-integration scope.

## Consequences

- `webapp-db` owns token hashes and scopes; `api-db` owns financial records and
  creation idempotency so each record and its retry result commit atomically.
- `webapp` validates tokens on every request, derives the User and enforces
  scopes before forwarding a trusted identity. Client identity headers are discarded.
- Session logout and token revocation are distinct operations. Password changes
  and resets revoke tokens; deleting a User blocks both forms of access.
- The public schema is versioned independently of the existing course endpoints.
  Both surfaces use the same financial rules; no additional accounting model is added.
- This is a proposal for team review. Authentication details and acceptance
  examples are specified in [contracts](../contratos.md); no API is implemented yet.
