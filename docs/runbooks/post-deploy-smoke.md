# Post-deploy Smoke Runbook

## Purpose
Quickly verify the platform is healthy after deploy:
- health endpoint is up
- auth refresh works
- sessions endpoint works
- RBAC isolation is enforced for key read endpoints

## Script
`scripts/smoke/rbac-smoke-test.sh`

## Requirements
- Two users:
  - UserA: NOT a member of OrgB
  - UserB: member of OrgB with at least one team and one player
- `jq` installed

## Run (normal mode)
`bash
BASE_URL="https://<your-host>" \
A_EMAIL="..." A_PASS="..." \
B_EMAIL="..." B_PASS="..." \
./scripts/smoke/rbac-smoke-test.sh
`
## Run (setup mode)

If the environment is empty (optional):

`./scripts/smoke/rbac-smoke-test.sh --setup`

## Expected outcome

- Exit code 0
- Summary shows 0 failed checks
- Non-member checks return 403
- Member checks return 200 (MMR may be 404 if no history exists)

## If it fails

- Open the log in logs/ and capture:
* endpoint
* expected vs actual status
* response snippet
* x-request-id
- Create a GitHub issue with the evidence.
