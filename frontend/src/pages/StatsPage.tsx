import React from 'react'
import enTranslations from '../i18n/en.json'
import { useOrganization } from '../org/OrganizationContext'
import { getAuthToken } from '../api/client'
import {
  Team,
  ShooterPlayerAggregateStats,
  ShooterMapAggregateStats,
  fetchShooterPlayerStats,
  fetchShooterMapStats,
  ShooterTeamOverview,
  fetchShooterTeamOverview,
} from '../api/nexusTeams'
import {
  getShooterGameProfile,
  ShooterGameKey,
  PlayerStatKey,
  TeamStatKey,
  MapStatKey,
} from '../config/shooterStatsProfiles'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

export function StatsPage() {
  const t = enTranslations
  const { activeOrganization, isLoading: isOrgLoading } = useOrganization()

  const token = getAuthToken()
  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {}

  const [teams, setTeams] = React.useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>("")
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string>("all")

  const [playersStats, setPlayersStats] = React.useState<ShooterPlayerAggregateStats[]>([])
  const [mapsStats, setMapsStats] = React.useState<ShooterMapAggregateStats[]>([])
  const [teamOverview, setTeamOverview] = React.useState<ShooterTeamOverview | null>(null)
  const [isLoadingTeamOverview, setIsLoadingTeamOverview] = React.useState(false)

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const shooterGameKey: ShooterGameKey = "breachers"
  const statProfile = getShooterGameProfile(shooterGameKey)

  const showPlayerStat = (key: PlayerStatKey) => statProfile.enabledPlayerStats.includes(key)
  const showTeamStat = (key: TeamStatKey) => statProfile.enabledTeamStats.includes(key)
  const showMapStat = (key: MapStatKey) => statProfile.enabledMapStats.includes(key)

  const fmt = (v: number | null | undefined, decimals: number = 2) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "-"
    return Number(v).toFixed(decimals)
  }

  const fmtPct = (v: number | null | undefined) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "-"
    return `${(Number(v) * 100).toFixed(0)}%`
  }

  // 1) Cuando cambia la org activa, cargamos los equipos
  React.useEffect(() => {
    if (isOrgLoading) return

    if (!activeOrganization) {
      setTeams([])
      setSelectedTeamId("")
      setPlayersStats([])
      setMapsStats([])
      return
    }

    const orgId = activeOrganization.organizationId
    setError(null)

      fetch(`${API_URL}/api/organizations/${orgId}/teams`, {
        headers: authHeaders,
      })
      .then(r => r.json())
      .then(data => {
        setTeams(Array.isArray(data) ? data : [])
        setSelectedTeamId("")        // obligamos a elegir equipo
        setPlayersStats([])
        setMapsStats([])
      })
      .catch(err => {
        console.error("Error fetching teams for stats:", err)
        setError("Failed to load teams for stats")
      })
  }, [activeOrganization, isOrgLoading]);

  // 2) Cuando hay equipo seleccionado, pedimos stats de players + maps + team overview
  React.useEffect(() => {
    if (!activeOrganization) return
    if (!selectedTeamId) {
      setTeamOverview(null)
      return
    }

    const orgId = activeOrganization.organizationId
    setLoading(true)
    setIsLoadingTeamOverview(true)
    setError(null)

    Promise.all([
      fetchShooterPlayerStats({ organizationId: orgId, teamId: selectedTeamId }),
      fetchShooterMapStats({ organizationId: orgId, teamId: selectedTeamId }),
      fetchShooterTeamOverview({ organizationId: orgId, teamId: selectedTeamId }),
    ])
      .then(([playersData, mapsData, overviewData]) => {
        setPlayersStats(Array.isArray(playersData) ? playersData : [])
        setMapsStats(Array.isArray(mapsData) ? mapsData : [])
        setTeamOverview(overviewData)
      })
      .catch(err => {
        console.error("Error fetching shooter stats:", err)
        setError("Failed to load shooter stats")
      })
      .finally(() => {
        setLoading(false)
        setIsLoadingTeamOverview(false)
      })
  }, [activeOrganization, selectedTeamId])

  // --- Estados especiales ---

  if (isOrgLoading) return <div>{t.common.loading}</div>

  if (!activeOrganization) {
    return (
      <div>
        <h2>{t.stats?.title ?? "Shooter Stats"}</h2>
        <p style={{ color: "#666" }}>
          No active organization selected. Please select an organization from the header.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2>{t.stats?.title ?? "Shooter Stats"}</h2>
      <p style={{ marginBottom: "1rem", color: "#666" }}>
        Showing stats for: <strong>{activeOrganization.organizationName}</strong>
      </p>

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#ffebee",
            border: "1px solid #ef5350",
            borderRadius: "4px",
            color: "#c62828",
          }}
        >
          {error}
        </div>
      )}

      {/* Selector de equipo y jugador */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label
            htmlFor="stats-team-select"
            style={{ marginRight: "0.5rem", fontWeight: "bold" }}
          >
            Team:
          </label>
          <select
            id="stats-team-select"
            value={selectedTeamId}
            onChange={(e) => {
              setSelectedTeamId(e.target.value)
              setSelectedPlayerId("all")
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontSize: "1rem",
              minWidth: "200px",
            }}
          >
            <option value="">-- Select a team --</option>
            {teams.map((team: any) => (
              <option key={team.id} value={team.id}>
                {team.name} {team.tag ? `[${team.tag}]` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedTeamId && playersStats.length > 0 && (
          <div>
            <label
              htmlFor="stats-player-select"
              style={{ marginRight: "0.5rem", fontWeight: "bold" }}
            >
              Player:
            </label>
            <select
              id="stats-player-select"
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "1rem",
                minWidth: "180px",
              }}
            >
              <option value="all">All players</option>
              {playersStats.map((p: any) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.nickname ?? p.playerName ?? p.playerId}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedTeamId ? (
        <p style={{ color: "#666" }}>
          Please select a team to see aggregated shooter stats.
        </p>
      ) : loading ? (
        <div>{t.common.loading}</div>
      ) : (
        <>
          {/* Team Overview Section */}
          {isLoadingTeamOverview ? (
            <p style={{ color: "#666" }}>Loading team stats...</p>
          ) : teamOverview ? (
            <>
              {/* Team Summary Cards */}
              <h3 style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>Team Overview</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                {showTeamStat("matchesPlayed") && (
                  <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: "6px", textAlign: "center", border: "1px solid #ddd" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Matches Played</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{teamOverview.summary.matchesPlayed}</div>
                  </div>
                )}
                {showTeamStat("winRate") && (
                  <div style={{
                    background: teamOverview.summary.winRate > 50 ? "#e8f5e9" : teamOverview.summary.winRate < 50 ? "#ffebee" : "#f5f5f5",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    textAlign: "center",
                    border: "1px solid #ddd",
                  }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Win Rate</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{fmt(teamOverview.summary.winRate, 2)}%</div>
                  </div>
                )}
                {showTeamStat("teamNpr") && (
                  <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: "6px", textAlign: "center", border: "1px solid #ddd" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Team NPR</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{teamOverview.summary.teamNpr}</div>
                  </div>
                )}
                {showTeamStat("teamAdr") && (
                  <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: "6px", textAlign: "center", border: "1px solid #ddd" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Team ADR</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{fmt(teamOverview.summary.teamAdr, 2)}</div>
                  </div>
                )}
                {showTeamStat("teamKad") && (
                  <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: "6px", textAlign: "center", border: "1px solid #ddd" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Team KAD</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{fmt(teamOverview.summary.teamKad, 2)}</div>
                  </div>
                )}
                {showTeamStat("teamKd") && (
                  <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: "6px", textAlign: "center", border: "1px solid #ddd" }}>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Team KD</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{fmt(teamOverview.summary.teamKd, 2)}</div>
                  </div>
                )}
              </div>

              {/* Matches Table */}
              <h3 style={{ marginBottom: "0.5rem" }}>Matches Summary</h3>
              {teamOverview.matches.length === 0 ? (
                <p style={{ color: "#666", marginBottom: "1.5rem" }}>No matches with stats yet for this team.</p>
              ) : (
                <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                        <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Date</th>
                        <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Opponent</th>
                        <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Map</th>
                        <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Rds Won</th>
                        <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Rds Lost</th>
                        {showTeamStat("teamNpr") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>NPR</th>}
                        {showTeamStat("teamAdr") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>ADR</th>}
                        {showTeamStat("teamKad") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>KAD</th>}
                        {showTeamStat("teamKd") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>KD</th>}
                        <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamOverview.matches.map((m) => (
                        <tr key={m.matchId} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "0.5rem" }}>
                            {m.playedAtUtc ? new Date(m.playedAtUtc).toLocaleDateString() : "-"}
                          </td>
                          <td style={{ padding: "0.5rem" }}>{m.opponentName ?? "-"}</td>
                          <td style={{ padding: "0.5rem" }}>{m.mapName ?? "-"}</td>
                          <td style={{ padding: "0.5rem" }}>{m.roundsWon ?? "-"}</td>
                          <td style={{ padding: "0.5rem" }}>{m.roundsLost ?? "-"}</td>
                          {showTeamStat("teamNpr") && <td style={{ padding: "0.5rem" }}>{m.teamNpr ?? "-"}</td>}
                          {showTeamStat("teamAdr") && <td style={{ padding: "0.5rem" }}>{fmt(m.teamAdr, 2)}</td>}
                          {showTeamStat("teamKad") && <td style={{ padding: "0.5rem" }}>{fmt(m.teamKad, 2)}</td>}
                          {showTeamStat("teamKd") && <td style={{ padding: "0.5rem" }}>{fmt(m.teamKd, 2)}</td>}
                          <td style={{
                            padding: "0.5rem",
                            fontWeight: "bold",
                            color: m.result === "win" ? "#2e7d32" : m.result === "loss" ? "#c62828" : "#666",
                          }}>
                            {m.result === "win" ? "Win" : m.result === "loss" ? "Loss" : m.result === "draw" ? "Draw" : "Pending"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: "#666", marginBottom: "1rem" }}>No team stats available yet.</p>
          )}

          {/* Player summary panel - visible when a specific player is selected */}
          {selectedPlayerId !== "all" && (() => {
            const selectedPlayer = playersStats.find((p: any) => p.playerId === selectedPlayerId)
            if (!selectedPlayer) return null
            return (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  background: "#f0f4f8",
                  borderRadius: "8px",
                  border: "1px solid #d0d7de",
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
                  {selectedPlayer.nickname ?? "Player"} - Summary
                  {selectedPlayer.mainRole && (
                    <span style={{ fontWeight: "normal", color: "#666", marginLeft: "0.5rem" }}>
                      ({selectedPlayer.mainRole})
                    </span>
                  )}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {showPlayerStat("matchesPlayed") && (
                    <div style={{ background: "white", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.85rem", color: "#666" }}>Matches</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{selectedPlayer.matchesPlayed ?? 0}</div>
                    </div>
                  )}
                  {showPlayerStat("adr") && (
                    <div style={{ background: "white", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.85rem", color: "#666" }}>ADR Avg</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{fmt(selectedPlayer.adr, 1)}</div>
                    </div>
                  )}
                  {showPlayerStat("kad") && (
                    <div style={{ background: "white", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.85rem", color: "#666" }}>KAD Avg</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{fmt(selectedPlayer.kad, 2)}</div>
                    </div>
                  )}
                  {showPlayerStat("kd") && (
                    <div style={{ background: "white", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.85rem", color: "#666" }}>KD Avg</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{fmt(selectedPlayer.kd, 2)}</div>
                    </div>
                  )}
                  {showPlayerStat("roleScore") && (
                    <div style={{ background: "#e8f5e9", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.85rem", color: "#2e7d32" }}>Role Score</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2e7d32" }}>{selectedPlayer.roleScore ?? 0}</div>
                    </div>
                  )}
                  {showPlayerStat("score") && (
                    <div style={{ background: "#e3f2fd", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.85rem", color: "#1565c0" }}>Score</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1565c0" }}>{fmt(selectedPlayer.score, 1)}</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Tabla de jugadores */}
          <h3 style={{ marginTop: "1rem" }}>Players summary</h3>
          {playersStats.length === 0 ? (
            <p>No stats found for this team and period.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "0.5rem",
                marginBottom: "2rem",
              }}
            >
              <thead>
                <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Player</th>
                  <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Role</th>
                  {showPlayerStat("matchesPlayed") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Matches</th>}
                  {showPlayerStat("roundsPlayed") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Rounds</th>}
                  {showPlayerStat("kills") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>K</th>}
                  {showPlayerStat("deaths") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>D</th>}
                  {showPlayerStat("assists") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>A</th>}
                  {showPlayerStat("adr") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>ADR Avg</th>}
                  {showPlayerStat("kd") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>KD Avg</th>}
                  {showPlayerStat("kad") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>KAD Avg</th>}
                  {showPlayerStat("roleScore") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd", background: "#e8f5e9" }}>Role Score</th>}
                  {showPlayerStat("score") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd", background: "#e3f2fd" }}>Score</th>}
                </tr>
              </thead>
              <tbody>
                {playersStats
                  .filter((p) => selectedPlayerId === "all" || p.playerId === selectedPlayerId)
                  .map((p) => (
                  <tr key={p.playerId} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "0.5rem" }}><strong>{p.nickname ?? p.playerId}</strong></td>
                    <td style={{ padding: "0.5rem" }}>{p.mainRole ?? "-"}</td>
                    {showPlayerStat("matchesPlayed") && <td style={{ padding: "0.5rem" }}>{p.matchesPlayed ?? "-"}</td>}
                    {showPlayerStat("roundsPlayed") && <td style={{ padding: "0.5rem" }}>{p.roundsPlayed ?? "-"}</td>}
                    {showPlayerStat("kills") && <td style={{ padding: "0.5rem" }}>{p.kills ?? "-"}</td>}
                    {showPlayerStat("deaths") && <td style={{ padding: "0.5rem" }}>{p.deaths ?? "-"}</td>}
                    {showPlayerStat("assists") && <td style={{ padding: "0.5rem" }}>{p.assists ?? "-"}</td>}
                    {showPlayerStat("adr") && <td style={{ padding: "0.5rem" }}>{fmt(p.adr, 2)}</td>}
                    {showPlayerStat("kd") && <td style={{ padding: "0.5rem" }}>{fmt(p.kd, 2)}</td>}
                    {showPlayerStat("kad") && <td style={{ padding: "0.5rem" }}>{fmt(p.kad, 2)}</td>}
                    {showPlayerStat("roleScore") && <td style={{ padding: "0.5rem", background: "#f1f8e9" }}>{fmt(p.roleScore, 2)}</td>}
                    {showPlayerStat("score") && <td style={{ padding: "0.5rem", background: "#e3f2fd" }}>{fmt(p.score, 1)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Tabla de mapas */}
          <h3>Maps summary</h3>
          {mapsStats.length === 0 ? (
            <p>No map stats found for this team and period.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "0.5rem",
              }}
            >
              <thead>
                <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Map</th>
                  {showMapStat("matchesPlayed") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Matches</th>}
                  {showMapStat("wins") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>W</th>}
                  {showMapStat("losses") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>L</th>}
                  {showMapStat("draws") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>D</th>}
                  {showMapStat("mapWinRate") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>WinRate</th>}
                  {showMapStat("teamAdr") && <th style={{ padding: "0.5rem", borderBottom: "2px solid #ddd" }}>Team ADR</th>}
                </tr>
              </thead>
              <tbody>
                {mapsStats.map((m) => (
                  <tr key={m.mapName} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "0.5rem" }}><strong>{m.mapName}</strong></td>
                    {showMapStat("matchesPlayed") && <td style={{ padding: "0.5rem" }}>{m.matchesPlayed ?? "-"}</td>}
                    {showMapStat("wins") && <td style={{ padding: "0.5rem" }}>{m.wins ?? "-"}</td>}
                    {showMapStat("losses") && <td style={{ padding: "0.5rem" }}>{m.losses ?? "-"}</td>}
                    {showMapStat("draws") && <td style={{ padding: "0.5rem" }}>{m.draws ?? "-"}</td>}
                    {showMapStat("mapWinRate") && <td style={{ padding: "0.5rem" }}>{fmtPct(m.mapWinRate)}</td>}
                    {showMapStat("teamAdr") && <td style={{ padding: "0.5rem" }}>{fmt(m.teamAdr)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
