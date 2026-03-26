import React from 'react'
import { useOrganization } from '../org/OrganizationContext'
import { getAuthToken } from '../api/client'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

type PlayerStats = { kills: string; assists: string; deaths: string; adr: string; roundsPlayed?: string }

export function MatchesPage() {
  const { activeOrganization, isLoading: isOrgLoading } = useOrganization()
  const [matches, setMatches] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [selectedMatchId, setSelectedMatchId] = React.useState<string | null>(null)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [statsMessage, setStatsMessage] = React.useState<string | null>(null)
  const [savingStats, setSavingStats] = React.useState(false)
  const [deletingMatchId, setDeletingMatchId] = React.useState<string | null>(null)
  const [teamRoundsWon, setTeamRoundsWon] = React.useState("")
  const [teamRoundsLost, setTeamRoundsLost] = React.useState("")
  const [players, setPlayers] = React.useState<{ id: string; nickname: string }[]>([])
  const [statsByPlayer, setStatsByPlayer] = React.useState<Record<string, PlayerStats>>({})

  const STAFF_ROLES = ['OWNER', 'MANAGER', 'COACH', 'ANALYST'] as const
  const isStaffForOrg = !!activeOrganization && STAFF_ROLES.includes((activeOrganization as any).role)
  const canViewStats = true
  const canEditStats = isStaffForOrg
  const canDeleteMatch = isStaffForOrg

  const reloadMatches = React.useCallback(async () => {
    if (!activeOrganization) {
      setMatches([])
      return
    }

    const orgId = activeOrganization.organizationId

    try {
      setLoading(true)
      setError(null)
      const matchesRes = await fetch(`${API_URL}/api/matches?organizationId=${orgId}`).then(r => r.json())
      setMatches(Array.isArray(matchesRes) ? matchesRes : [])
    } catch (err) {
      console.error('Error loading matches:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [activeOrganization])

  React.useEffect(() => {
    if (isOrgLoading) return
    reloadMatches()
  }, [isOrgLoading, reloadMatches])

  // --- Abrir partido en modo view o edit ---
  const handleOpenMatch = async (matchId: string, edit: boolean) => {
    if (!activeOrganization) return
    const orgId = activeOrganization.organizationId
    const token = getAuthToken()

    setSelectedMatchId(matchId)
    setIsEditMode(edit)
    setStatsMessage(null)
    setError(null)

    try {
      // Jugadores de la organización
      const playersResponse = await fetch(`${API_URL}/api/organizations/${orgId}/players`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!playersResponse.ok) {
        console.error('Failed to fetch players:', playersResponse.status)
        setError('Failed to load players')
        return
      }
      const playersRes = await playersResponse.json()

      // Stats del partido
      const statsResponse = await fetch(`${API_URL}/api/matches/${matchId}/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      let statsRes: any[] = []
      if (statsResponse.ok) {
        statsRes = await statsResponse.json()
        if (!Array.isArray(statsRes)) statsRes = []
      } else if (statsResponse.status === 404) {
        const errorData = await statsResponse.json().catch(() => ({}))
        if (errorData.error === 'match_not_found') {
          setError('Match not found.')
          return
        }
        statsRes = []
      } else if (statsResponse.status === 403) {
        console.error('Forbidden:', statsResponse.status)
        setError('You do not have permission to view stats for this match.')
        return
      } else if (statsResponse.status === 401) {
        console.error('Unauthorized:', statsResponse.status)
        setError('Please log in to view match stats.')
        return
      } else {
        console.error('Stats fetch error:', statsResponse.status)
        setError('Failed to load stats')
        return
      }

      const match = matches.find(m => m.id === matchId)
      setTeamRoundsWon(
        match && typeof match.roundsWon === 'number' ? String(match.roundsWon) : '',
      )
      setTeamRoundsLost(
        match && typeof match.roundsLost === 'number' ? String(match.roundsLost) : '',
      )

      const map: Record<string, any> = {}
      for (const p of playersRes) {
        const s = statsRes.find((st: any) => st.playerId === p.id)
        map[p.id] = {
          kills: s ? String(s.kills) : '0',
          deaths: s ? String(s.deaths) : '0',
          assists: s ? String(s.assists) : '0',
          adr: s ? String(s.adr) : '0',
          roundsPlayed: s ? String(s.roundsPlayed ?? 0) : '0',
        }
      }

      setPlayers(playersRes)
      setStatsByPlayer(map)

      if (statsRes.length === 0) {
        setStatsMessage('No stats recorded yet for this match.')
      }
    } catch (err) {
      console.error('Error loading match stats:', err)
      setError('Failed to load stats')
    }
  }

  // --- Cerrar el panel de stats ---
  const handleCloseStatsPanel = () => {
    setSelectedMatchId(null)
    setIsEditMode(false)
    setPlayers([])
    setStatsByPlayer({})
    setTeamRoundsWon('')
    setTeamRoundsLost('')
    setStatsMessage(null)
    setError(null)
  }

  // --- Guardar stats ---
  const handleSaveStats = async () => {
    if (!activeOrganization || !selectedMatchId) return
    if (!canEditStats) return

    try {
      setSavingStats(true)
      const token = getAuthToken()
      const roundsWon = Number(teamRoundsWon) || 0
      const roundsLost = Number(teamRoundsLost) || 0

      const statsPayload = Object.entries(statsByPlayer).map(([playerId, s]) => ({
        playerId,
        kills: Number(s.kills) || 0,
        deaths: Number(s.deaths) || 0,
        assists: Number(s.assists) || 0,
        adr: Number(s.adr) || 0,
        roundsPlayed: roundsWon + roundsLost,
      }))

      await fetch(`${API_URL}/api/matches/${selectedMatchId}/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stats: statsPayload,
          roundsWon,
          roundsLost,
        }),
      })

      // Recargamos la lista de partidos para que result / rondas se actualicen sin refrescar la página
      await reloadMatches()

      setStatsMessage('Stats saved successfully.')
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Failed to save stats')
    } finally {
      setSavingStats(false)
    }
  }

  // --- Resetear stats en el cliente ---
  const handleResetStats = () => {
    if (!selectedMatchId) {
      return
    }

    const confirmed = window.confirm(
      'This will reset all stats for this match to 0 (kills, deaths, assists, ADR and rounds) in the editor. The match result will only be updated after you click "Save stats". Continue?',
    )

    if (!confirmed) {
      return
    }

    // Poner a 0 las rondas de equipo
    setTeamRoundsWon('0')
    setTeamRoundsLost('0')
 
    // Poner a 0 las stats de todos los jugadores (incluyendo roundsPlayed en la UI)
    setStatsByPlayer((prev) => {
      const next: Record<
        string,
        { kills: string; deaths: string; assists: string; adr: string; roundsPlayed: string }
      > = {}

      players.forEach((player) => {
        const existing = prev[player.id]

        next[player.id] = {
          kills: '0',
          deaths: '0',
          assists: '0',
          adr: '0',
          // El backend recalcula roundsPlayed al guardar, aquí solo mantenemos la forma
          roundsPlayed: existing?.roundsPlayed ?? '0',
        }
      })

      return next
    })

    setStatsMessage(
      'Stats reset locally. Click "Save stats" to persist the changes.',
    )
    setError(null)
  }

  // --- Borrar partido completo (match + stats por cascada) ---
  const handleDeleteMatch = async (matchId: string) => {
    if (!activeOrganization) return
    if (!canDeleteMatch) {
      setError('No tienes permisos para borrar partidos.')
      return
    }

    const match = matches.find(m => m.id === matchId)
    const confirmMessage = `¿Seguro que quieres borrar el partido${
      match?.opponentName ? ` contra ${match.opponentName}` : ''
    }? Esto eliminará también sus estadísticas.`
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    try {
      setDeletingMatchId(matchId)
      setError(null)
      setStatsMessage(null)

      const token = getAuthToken()

      const res = await fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok && res.status !== 204) {
        let message = 'Failed to delete match'
        try {
          const data = await res.json()
          if (data?.error) message = data.error
        } catch {
          /* ignore */
        }
        throw new Error(message)
      }

      setMatches(prev => prev.filter(m => m.id !== matchId))

      if (selectedMatchId === matchId) {
        handleCloseStatsPanel()
      }

      setStatsMessage('Match deleted successfully.')
    } catch (err) {
      console.error('Error deleting match:', err)
      setError('Failed to delete match.')
    } finally {
      setDeletingMatchId(null)
    }
  }

  const isStatsReadOnly = !isEditMode || !canEditStats

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Matches</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading…</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9f9f9' }}>
            <th style={{ padding: '0.5rem' }}>Date</th>
            <th style={{ padding: '0.5rem' }}>Opponent</th>
            <th style={{ padding: '0.5rem' }}>Map</th>
            <th style={{ padding: '0.5rem' }}>Result</th>
            <th style={{ padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(m => (
            <tr key={m.id}>
              <td style={{ padding: '0.5rem' }}>
                {new Date(m.playedAtUtc).toLocaleDateString()}
              </td>
              <td style={{ padding: '0.5rem' }}>{m.opponentName}</td>
              <td style={{ padding: '0.5rem' }}>{m.mapName}</td>
              <td style={{ padding: '0.5rem' }}>{m.result}</td>
              <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                {canViewStats && (
                  <button
                    style={{
                      padding: '0.3rem 0.6rem',
                      marginRight: '0.4rem',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      background: 'white',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleOpenMatch(m.id, false)}
                  >
                    View
                  </button>
                )}

                {canEditStats && (
                  <button
                    style={{
                      padding: '0.3rem 0.6rem',
                      marginRight: '0.4rem',
                      border: '1px solid #1976d2',
                      borderRadius: '4px',
                      background: 'white',
                      color: '#1976d2',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleOpenMatch(m.id, true)}
                  >
                    Edit
                  </button>
                )}

                {canDeleteMatch && (
                  <button
                    style={{
                      padding: '0.3rem 0.6rem',
                      border: '1px solid #e53935',
                      borderRadius: '4px',
                      background: deletingMatchId === m.id ? '#ffcdd2' : 'white',
                      color: '#e53935',
                      cursor: deletingMatchId === m.id ? 'default' : 'pointer',
                    }}
                    disabled={deletingMatchId === m.id}
                    onClick={() => handleDeleteMatch(m.id)}
                  >
                    {deletingMatchId === m.id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {matches.length === 0 && !loading && (
            <tr>
              <td colSpan={5} style={{ padding: '0.5rem', textAlign: 'center' }}>
                No matches found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedMatchId && (
        <div
          style={{
            marginTop: '1rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem',
            background: '#fafafa',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            {isStatsReadOnly ? 'Viewing match stats' : 'Editing match stats'}
          </h2>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label>
              Rounds won:
              <input
                type="number"
                value={teamRoundsWon}
                disabled={isStatsReadOnly}
                onChange={e => setTeamRoundsWon(e.target.value)}
                style={{ width: '60px', marginLeft: '0.4rem' }}
              />
            </label>
            <label>
              Rounds lost:
              <input
                type="number"
                value={teamRoundsLost}
                disabled={isStatsReadOnly}
                onChange={e => setTeamRoundsLost(e.target.value)}
                style={{ width: '60px', marginLeft: '0.4rem' }}
              />
            </label>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '0.4rem' }}>Player</th>
                <th style={{ padding: '0.4rem' }}>Kills</th>
                <th style={{ padding: '0.4rem' }}>Deaths</th>
                <th style={{ padding: '0.4rem' }}>Assists</th>
                <th style={{ padding: '0.4rem' }}>ADR</th>
                <th style={{ padding: '0.4rem' }}>Rounds</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => {
                const s = statsByPlayer[p.id] || {}
                return (
                  <tr key={p.id}>
                    <td style={{ padding: '0.4rem' }}>{p.nickname}</td>
                    <td style={{ padding: '0.4rem' }}>
                      <input
                        type="number"
                        value={s.kills || '0'}
                        disabled={isStatsReadOnly}
                        onChange={e =>
                          setStatsByPlayer(prev => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], kills: e.target.value },
                          }))
                        }
                        style={{ width: '60px' }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input
                        type="number"
                        value={s.deaths || '0'}
                        disabled={isStatsReadOnly}
                        onChange={e =>
                          setStatsByPlayer(prev => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], deaths: e.target.value },
                          }))
                        }
                        style={{ width: '60px' }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input
                        type="number"
                        value={s.assists || '0'}
                        disabled={isStatsReadOnly}
                        onChange={e =>
                          setStatsByPlayer(prev => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], assists: e.target.value },
                          }))
                        }
                        style={{ width: '60px' }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={s.adr || '0'}
                        disabled={isStatsReadOnly}
                        onChange={e =>
                          setStatsByPlayer(prev => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], adr: e.target.value },
                          }))
                        }
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input
                        type="number"
                        readOnly
                        value={
                          Number(teamRoundsWon || '0') + Number(teamRoundsLost || '0')
                        }
                        disabled
                        style={{ width: '60px', background: '#f2f2f2' }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {statsMessage && <p style={{ color: 'green', marginTop: '0.75rem' }}>{statsMessage}</p>}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginTop: '1rem',
              gap: '0.5rem',
            }}
          >
            {canEditStats && (
              <>
                <button
                  type="button"
                  onClick={handleResetStats}
                  disabled={isStatsReadOnly}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    border: '1px solid #999',
                    background: 'white',
                    cursor: isStatsReadOnly ? 'not-allowed' : 'pointer',
                  }}
                >
                  Reset stats
                </button>

                <button
                  type="button"
                  onClick={handleSaveStats}
                  disabled={isStatsReadOnly || savingStats}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    border: '1px solid #1976d2',
                    background: savingStats ? '#e3f2fd' : '#1976d2',
                    color: 'white',
                    cursor: isStatsReadOnly || savingStats ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingStats ? 'Saving…' : 'Save stats'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleCloseStatsPanel}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
