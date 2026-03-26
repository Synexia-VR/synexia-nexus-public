import React from 'react'
import { useOrganization } from '../org/OrganizationContext'
import {
  fetchTeamsByOrganization,
  fetchPlayersByOrganization,
  createTeam,
  fetchTeamRoster,
  addPlayerToRoster,
  removePlayerFromRoster,
  fetchGames,
  type Game,
} from '../api/nexusTeams'

export function TeamsPage() {
  const { activeOrganization, isLoading: isOrgLoading } = useOrganization()

  const userRole = activeOrganization?.role as string | undefined

  const canManageTeams =
    userRole === 'OWNER' ||
    userRole === 'MANAGER'

  const canManageRoster =
    canManageTeams ||
    userRole === 'COACH' ||
    userRole === 'ANALYST'

  const [teams, setTeams] = React.useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null)
  const [players, setPlayers] = React.useState<any[]>([])
  const [roster, setRoster] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [newTeamName, setNewTeamName] = React.useState('')
  const [games, setGames] = React.useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = React.useState<string>('')
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = React.useState<string>('')

  React.useEffect(() => {
    if (isOrgLoading) return
    if (!activeOrganization) return

    const orgId = activeOrganization.organizationId

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const [teamsRes, playersRes] = await Promise.all([
          fetchTeamsByOrganization(orgId),
          fetchPlayersByOrganization(orgId),
        ])

        setTeams(Array.isArray(teamsRes) ? teamsRes : [])
        setPlayers(Array.isArray(playersRes) ? playersRes : [])

        if (!selectedTeamId && Array.isArray(teamsRes) && teamsRes.length > 0) {
          setSelectedTeamId(teamsRes[0].id)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load teams or players')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeOrganization, isOrgLoading])

  React.useEffect(() => {
    if (!selectedTeamId) {
      setRoster([])
      return
    }

    async function loadRoster() {
      try {
        setError(null)
        const rosterRes = await fetchTeamRoster(selectedTeamId!)
        setRoster(Array.isArray(rosterRes) ? rosterRes : [])
      } catch (err) {
        console.error(err)
        setError('Failed to load team roster')
      }
    }

    loadRoster()
  }, [selectedTeamId])

  React.useEffect(() => {
    let isMounted = true

    async function loadGames() {
      try {
        const loadedGames = await fetchGames()
        if (!isMounted) return
        setGames(loadedGames)
        if (loadedGames.length === 1 && !selectedGameId) {
          setSelectedGameId(loadedGames[0].id)
        }
      } catch (err) {
        console.error('Failed to load games', err)
      }
    }

    loadGames()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!activeOrganization) return
    if (!canManageTeams) return

    const orgId = activeOrganization.organizationId
    const name = newTeamName.trim()
    if (!name) {
      setError('Team name is required')
      return
    }

    if (!selectedGameId) {
      setError('Please select a game')
      return
    }

    try {
      setError(null)
      const created = await createTeam({
        organizationId: orgId,
        name,
        gameId: selectedGameId,
      })

      setTeams(prev => [...prev, created])
      setNewTeamName('')
      setSelectedGameId('')

      if (!selectedTeamId) {
        setSelectedTeamId(created.id)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to create team')
    }
  }

  const rosterPlayerIds = new Set(roster.map((r: any) => r.playerId))
  const availablePlayersToAdd = players.filter((p: any) => !rosterPlayerIds.has(p.id))

  async function handleAddPlayerToRoster(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeamId) return
    if (!canManageRoster) return
    if (!selectedPlayerToAdd) return

    try {
      setError(null)
      await addPlayerToRoster(selectedTeamId, selectedPlayerToAdd)
      const rosterRes = await fetchTeamRoster(selectedTeamId)
      setRoster(Array.isArray(rosterRes) ? rosterRes : [])
      setSelectedPlayerToAdd('')
    } catch (err) {
      console.error(err)
      setError('Failed to add player to roster')
    }
  }

  async function handleRemovePlayerFromRoster(playerId: string) {
    if (!selectedTeamId) return
    if (!canManageRoster) return

    try {
      setError(null)
      await removePlayerFromRoster(selectedTeamId, playerId)
      setRoster(prev => prev.filter((r: any) => r.playerId !== playerId))
    } catch (err) {
      console.error(err)
      setError('Failed to remove player from roster')
    }
  }

  if (isOrgLoading) return <p>Loading organization…</p>
  if (!activeOrganization) {
    return <p>No active organization selected. Please select one in the header.</p>
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Teams & Roster</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading…</p>}

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.2rem' }}>Teams</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '0.4rem' }}>Name</th>
                <th style={{ padding: '0.4rem' }}>Game</th>
                <th style={{ padding: '0.4rem' }}>Select</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id}>
                  <td style={{ padding: '0.4rem' }}>{t.name}</td>
                  <td style={{ padding: '0.4rem' }}>{t.game?.name ?? '-'}</td>
                  <td style={{ padding: '0.4rem' }}>
                    <button
                      onClick={() => setSelectedTeamId(t.id)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 4,
                        border: selectedTeamId === t.id ? '2px solid #007bff' : '1px solid #ccc',
                        background: selectedTeamId === t.id ? '#e3f2fd' : 'white',
                        cursor: 'pointer',
                      }}
                    >
                      {selectedTeamId === t.id ? 'Selected' : 'Select'}
                    </button>
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '0.4rem', textAlign: 'center' }}>
                    No teams found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManageTeams && (
          <div style={{ width: '320px' }}>
            <h2 style={{ fontSize: '1.2rem' }}>Create new team</h2>
            <form onSubmit={handleCreateTeam}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label>
                  Name:
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label>
                  Game:
                  <select
                    value={selectedGameId}
                    onChange={e => setSelectedGameId(e.target.value)}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                  >
                    <option value="">-- Select a game --</option>
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.displayName || game.name || game.code}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="submit"
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: 4,
                  border: 'none',
                  background: '#007bff',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Create team
              </button>
            </form>
          </div>
        )}
      </div>

      {selectedTeamId && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Roster</h2>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '0.4rem' }}>Player</th>
                <th style={{ padding: '0.4rem' }}>Main role</th>
                <th style={{ padding: '0.4rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r: any) => (
                <tr key={r.playerId}>
                  <td style={{ padding: '0.4rem' }}>
                    {r.player?.nickname ?? r.playerNickname ?? r.playerId}
                  </td>
                  <td style={{ padding: '0.4rem' }}>
                    {r.player?.mainRole ?? '-'}
                  </td>
                  <td style={{ padding: '0.4rem' }}>
                    {canManageRoster && (
                      <button
                        onClick={() => handleRemovePlayerFromRoster(r.playerId)}
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: 4,
                          border: '1px solid #e53935',
                          background: 'white',
                          color: '#e53935',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '0.4rem', textAlign: 'center' }}>
                    No players in this roster.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {canManageRoster && availablePlayersToAdd.length > 0 && (
            <form onSubmit={handleAddPlayerToRoster} style={{ marginTop: '1rem' }}>
              <label>
                Add player:
                <select
                  value={selectedPlayerToAdd}
                  onChange={e => setSelectedPlayerToAdd(e.target.value)}
                  style={{ marginLeft: '0.4rem', minWidth: '200px' }}
                >
                  <option value="">Select a player…</option>
                  {availablePlayersToAdd.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname ?? p.displayName ?? p.email}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.3rem 0.8rem',
                  borderRadius: 4,
                  border: 'none',
                  background: '#007bff',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Add to roster
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
