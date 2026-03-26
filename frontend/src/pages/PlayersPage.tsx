import React from 'react'
import enTranslations from '../i18n/en.json'
import { useOrganization } from '../org/OrganizationContext'
import { getAuthToken } from '../api/client'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

export function PlayersPage() {
  const t = enTranslations
  const { activeOrganization, isLoading: isOrgLoading } = useOrganization()

  const STAFF_ROLES = ['OWNER', 'MANAGER', 'COACH', 'ANALYST'] as const
  const isStaffForOrg =
    !!activeOrganization &&
    STAFF_ROLES.includes((activeOrganization as any).role)
  
  const [players, setPlayers] = React.useState<any[]>([])
  const [mmrMap, setMmrMap] = React.useState<Record<string, any | null>>({})
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [recalculating, setRecalculating] = React.useState(false)

  const fetchPlayersAndMmr = React.useCallback(async (orgId: string) => {
    if (!orgId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const playersRes = await fetch(`${API_URL}/api/organizations/${orgId}/players`)
      const playersData = await playersRes.json()
      setPlayers(Array.isArray(playersData) ? playersData : [])
      
      const mmrResults: Record<string, any | null> = {}
      for (const player of (Array.isArray(playersData) ? playersData : [])) {
        try {
          const mmrRes = await fetch(`${API_URL}/api/players/${player.id}/mmr`)
          if (mmrRes.ok) {
            mmrResults[player.id] = await mmrRes.json()
          } else if (mmrRes.status === 404) {
            mmrResults[player.id] = null
          } else {
            const errorData = await mmrRes.json()
            if (errorData.error === 'mmr_not_found') {
              mmrResults[player.id] = null
            }
          }
        } catch {
          mmrResults[player.id] = null
        }
      }
      setMmrMap(mmrResults)
    } catch (err) {
      console.error('Error fetching players:', err)
      setError('Failed to load players')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (isOrgLoading) return
    
    if (activeOrganization) {
      fetchPlayersAndMmr(activeOrganization.organizationId)
    } else {
      setPlayers([])
      setMmrMap({})
    }
  }, [activeOrganization, isOrgLoading, fetchPlayersAndMmr])

  const handleRecalculateMmr = async () => {
  if (!activeOrganization) return

  setRecalculating(true)
  setError(null)

  try {
    const token = getAuthToken()

    const res = await fetch(`${API_URL}/api/mmr/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ organizationId: activeOrganization.organizationId })
    })

    if (!res.ok) {
      // Intentamos leer error del backend si lo envía
      const data = await res.json().catch(() => ({} as any))

      if (res.status === 401) {
        setError('You must be logged in to recalculate MMR')
      } else if (res.status === 403) {
        setError('You do not have permission to recalculate MMR for this organization')
      } else {
        setError((data as any).error || 'Failed to recalculate MMR')
      }

      return
    }

    // Si todo va bien, refrescamos los MMR
    await fetchPlayersAndMmr(activeOrganization.organizationId)
  } catch (err) {
    console.error('Error recalculating MMR:', err)
    setError('Failed to recalculate MMR')
  } finally {
    setRecalculating(false)
  }
}

  if (isOrgLoading) return <div>{t.common.loading}</div>

  if (!activeOrganization) {
    return (
      <div>
        <h2>{t.players.title}</h2>
        <p style={{ color: '#666' }}>No active organization selected. Please select an organization from the header.</p>
      </div>
    )
  }

  return (
    <div>
      <h2>{t.players.title}</h2>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        Showing players for: <strong>{activeOrganization.organizationName}</strong>
      </p>
      
      {error && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1rem', 
          background: '#ffebee', 
          border: '1px solid #ef5350',
          borderRadius: '4px',
          color: '#c62828'
        }}>
          {error}
        </div>
      )}
      
      {isStaffForOrg && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleRecalculateMmr}
            disabled={recalculating}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              background: recalculating ? '#ccc' : '#1976d2',
              color: 'white',
              cursor: recalculating ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {recalculating ? 'Recalculating...' : 'Recalculate MMR'}
          </button>
        </div>
      )}

      {loading ? (
        <div>{t.common.loading}</div>
      ) : players.length === 0 ? (
        <p>{t.players.noPlayers}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Player</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Role</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Status</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>MMR</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player: any) => {
              const mmr = mmrMap[player.id]
              return (
                <tr key={player.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <strong>{player.nickname}</strong>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{player.mainRole ?? '-'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      background: player.status === 'active' ? '#e8f5e9' : '#fff3e0',
                      color: player.status === 'active' ? '#2e7d32' : '#ef6c00'
                    }}>
                      {player.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {mmr ? (
                      <div>
                        <strong style={{ fontSize: '1.25rem', color: '#1976d2' }}>{mmr.mmrValue}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                          P: {Math.round(mmr.performanceScore)} / C: {Math.round(mmr.commitmentScore)} / B: {Math.round(mmr.behaviorScore)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>Not calculated</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
