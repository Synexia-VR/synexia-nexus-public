# Stats & MMR (Shooter)

## Shooter match stats (current)
Per-match per-player stats are stored in `ShooterMatchStat`:
- kills, deaths, assists, adr
- roundsPlayed (derived)

Match-level fields:
- roundsWon, roundsLost
- result (win/loss/draw)

## Aggregated endpoints
- `GET /api/stats/shooter/players`
- `GET /api/stats/shooter/maps`
- `GET /api/stats/shooter/team`

## NPR definition
**NPR (Net Performance Rating) = roundsWon - roundsLost**

## MMR (last 30 days)
`POST /api/mmr/recalculate`

Weighted components:
- Performance (60%): ADR + K/D (scaled)
- Commitment (25%): attendance / convocations
- Behaviour (15%): 100 - (sanction severity * 10)

## Notes
- Player MMR endpoint may return 404 if no MMR history exists yet.
