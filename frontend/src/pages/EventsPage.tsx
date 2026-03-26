import React from 'react'
import enTranslations from '../i18n/en.json'
import { useOrganization } from '../org/OrganizationContext'
import { createEvent, createMatch, fetchEvents, EventType } from '../api/nexusTeams'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

export function EventsPage() {
  const t = enTranslations
  const { activeOrganization, isLoading: isOrgLoading } = useOrganization()

  const userRole = activeOrganization?.role as string | undefined
  const canManageEvents =
    userRole === 'OWNER' ||
    userRole === 'MANAGER' ||
    userRole === 'COACH' ||
    userRole === 'ANALYST'
  
  const [teams, setTeams] = React.useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>("")
  const [eventTypeFilter, setEventTypeFilter] = React.useState<string>("")
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [newEventTeamId, setNewEventTeamId] = React.useState<string>("")
  const [newEventType, setNewEventType] = React.useState<string>("training")
  const [newEventTitle, setNewEventTitle] = React.useState<string>("")
  const [newEventDescription, setNewEventDescription] = React.useState<string>("")
  const [newEventLocation, setNewEventLocation] = React.useState<string>("")
  const [newEventStartLocal, setNewEventStartLocal] = React.useState<string>("")
  const [newEventEndLocal, setNewEventEndLocal] = React.useState<string>("")
  const [newMatchOpponentName, setNewMatchOpponentName] = React.useState<string>("")
  const [newMatchCompetitionName, setNewMatchCompetitionName] = React.useState<string>("")
  const [newMatchMapName, setNewMatchMapName] = React.useState<string>("")
  const [creatingEvent, setCreatingEvent] = React.useState(false)
  const [createMessage, setCreateMessage] = React.useState<string | null>(null)

  function formatDateTime(iso: string): string {
    try {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return iso
      return d.toLocaleString()
    } catch {
      return iso
    }
  }

  React.useEffect(() => {
    if (isOrgLoading) return
    
    if (!activeOrganization) {
      setTeams([])
      setEvents([])
      setSelectedTeamId("")
      setEventTypeFilter("")
      setNewEventTeamId("")
      return
    }
    
    setLoading(true)
    setSelectedTeamId("")
    setEventTypeFilter("")
    setError(null)
    
    const orgId = activeOrganization.organizationId
    
    Promise.all([
      fetch(`${API_URL}/api/organizations/${orgId}/teams`).then(r => r.json()),
      fetch(`${API_URL}/api/events?organizationId=${orgId}`).then(r => r.json())
    ])
      .then(([teamsData, eventsData]) => {
        setTeams(Array.isArray(teamsData) ? teamsData : [])
        setEvents(Array.isArray(eventsData) ? eventsData : [])
        setNewEventTeamId("")
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading data:', err)
        setError('Failed to load teams/events')
        setLoading(false)
      })
  }, [activeOrganization, isOrgLoading])

  React.useEffect(() => {
    if (!activeOrganization) return
    
    setLoading(true)
    
    const orgId = activeOrganization.organizationId
    const params = new URLSearchParams({ organizationId: orgId })
    if (selectedTeamId) params.set('teamId', selectedTeamId)
    if (eventTypeFilter) params.set('type', eventTypeFilter)
    
    fetch(`${API_URL}/api/events?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setEvents(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching events:', err)
        setError('Failed to load events')
        setLoading(false)
      })
  }, [selectedTeamId, eventTypeFilter])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeOrganization) {
      setError("No active organization selected.")
      return
    }
    if (!canManageEvents) {
      return
    }
    if (!newEventTeamId) {
      setError("Please select a team for the new event.")
      return
    }
    if (!newEventTitle.trim()) {
      setError("Please enter a title for the event.")
      return
    }
    if (!newEventStartLocal) {
      setError("Please select a start date/time.")
      return
    }
    if (newEventType === "match" && !newMatchOpponentName.trim()) {
      setError("Please enter the opponent name for the match.")
      return
    }
    
    setError(null)
    setCreateMessage(null)
    setCreatingEvent(true)
    
    const orgId = activeOrganization.organizationId
    
    try {
      const startIso = new Date(newEventStartLocal).toISOString()
      const endIso = newEventEndLocal ? new Date(newEventEndLocal).toISOString() : undefined
      
      const createdEvent = await createEvent({
        organizationId: orgId,
        teamId: newEventTeamId,
        type: newEventType as EventType,
        title: newEventTitle.trim(),
        description: newEventDescription.trim() || undefined,
        startDatetimeUtc: startIso,
        endDatetimeUtc: endIso,
        location: newEventLocation.trim() || undefined,
      })
      
      if (newEventType === "match") {
        const opponentName = newMatchOpponentName.trim()
        const competitionName = newMatchCompetitionName.trim() || undefined
        const mapName = newMatchMapName.trim() || undefined
        
        await createMatch({
          organizationId: orgId,
          teamId: newEventTeamId,
          eventId: createdEvent.id,
          opponentName,
          competitionName,
          result: "pending",
          mapName,
          playedAtUtc: createdEvent.startDatetimeUtc,
        })
      }
      
      setNewEventTitle("")
      setNewEventDescription("")
      setNewEventLocation("")
      setNewEventStartLocal("")
      setNewEventEndLocal("")
      setNewMatchOpponentName("")
      setNewMatchCompetitionName("")
      setNewMatchMapName("")
      setCreateMessage(newEventType === "match" 
        ? "Event and match created successfully!" 
        : "Event created successfully!")
      
      const eventsData = await fetchEvents({
        organizationId: orgId,
        teamId: selectedTeamId || undefined,
        type: eventTypeFilter || undefined,
      })
      setEvents(eventsData)
    } catch (err: any) {
      console.error('Error creating event:', err)
      setError(err.message || 'Failed to create event')
    } finally {
      setCreatingEvent(false)
    }
  }

  const getEventTypeStyle = (type: string) => {
    switch (type) {
      case 'training':
        return { background: '#e3f2fd', color: '#1565c0' }
      case 'scrim':
        return { background: '#fff3e0', color: '#ef6c00' }
      case 'match':
        return { background: '#e8f5e9', color: '#2e7d32' }
      case 'vod_review':
        return { background: '#f3e5f5', color: '#7b1fa2' }
      default:
        return { background: '#f5f5f5', color: '#616161' }
    }
  }

  if (isOrgLoading) return <div>{t.common.loading}</div>

  if (!activeOrganization) {
    return (
      <div>
        <h2>{t.events.title}</h2>
        <p style={{ color: '#666' }}>No active organization selected. Please select an organization from the header.</p>
      </div>
    )
  }

  return (
    <div>
      <h2>{t.events.title}</h2>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        Showing events for: <strong>{activeOrganization.organizationName}</strong>
      </p>
      
      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#ffebee', border: '1px solid #ef5350', borderRadius: '4px', color: '#c62828' }}>
          {error}
        </div>
      )}
      
      {createMessage && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '4px', color: '#2e7d32' }}>
          {createMessage}
        </div>
      )}
      
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="team-filter" style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Team:</label>
          <select
            id="team-filter"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', minWidth: '150px' }}
          >
            <option value="">-- All Teams --</option>
            {teams.map((team: any) => (
              <option key={team.id} value={team.id}>{team.name} {team.tag ? `[${team.tag}]` : ''}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="type-filter" style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Type:</label>
          <select
            id="type-filter"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', minWidth: '150px' }}
          >
            <option value="">-- All Types --</option>
            <option value="training">Training</option>
            <option value="scrim">Scrim</option>
            <option value="match">Match</option>
            <option value="vod_review">VOD Review</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div>{t.common.loading}</div>
      ) : events.length === 0 ? (
        <p>{t.events.noEvents}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Start</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>End</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Team</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Type</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Title</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event: any) => {
              const team = teams.find((t: any) => t.id === event.teamId)
              const typeStyle = getEventTypeStyle(event.type)
              return (
                <tr key={event.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{formatDateTime(event.startDatetimeUtc)}</td>
                  <td style={{ padding: '0.75rem' }}>{event.endDatetimeUtc ? formatDateTime(event.endDatetimeUtc) : '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{team ? team.name : event.team?.name || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      ...typeStyle
                    }}>
                      {event.type}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}><strong>{event.title}</strong></td>
                  <td style={{ padding: '0.75rem' }}>{event.location || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {canManageEvents && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0 }}>Create New Event</h3>
          
          <form onSubmit={handleCreateEvent}>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Team *</label>
                <select
                  value={newEventTeamId}
                  onChange={(e) => setNewEventTeamId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Team --</option>
                  {teams.map((team: any) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Type *</label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="training">Training</option>
                  <option value="scrim">Scrim</option>
                  <option value="match">Match</option>
                  <option value="vod_review">VOD Review</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Title *</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Event title"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Location</label>
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="e.g. Online, Custom server"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Start (local) *</label>
                <input
                  type="datetime-local"
                  value={newEventStartLocal}
                  onChange={(e) => setNewEventStartLocal(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>End (local, optional)</label>
                <input
                  type="datetime-local"
                  value={newEventEndLocal}
                  onChange={(e) => setNewEventEndLocal(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Description</label>
              <textarea
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            
            {newEventType === "match" && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#2e7d32' }}>Match Details</h4>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Opponent Name *</label>
                    <input
                      type="text"
                      value={newMatchOpponentName}
                      onChange={(e) => setNewMatchOpponentName(e.target.value)}
                      placeholder="Opponent team name"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Competition Name (optional)</label>
                    <input
                      type="text"
                      value={newMatchCompetitionName}
                      onChange={(e) => setNewMatchCompetitionName(e.target.value)}
                      placeholder="League / Cup / Tournament"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Map Name (optional)</label>
                    <input
                      type="text"
                      value={newMatchMapName}
                      onChange={(e) => setNewMatchMapName(e.target.value)}
                      placeholder="Factory / Ship / ..."
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '1rem' }}>
              <button
                type="submit"
                disabled={creatingEvent}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: creatingEvent ? '#ccc' : '#4caf50',
                  color: 'white',
                  cursor: creatingEvent ? 'not-allowed' : 'pointer',
                  fontSize: '1rem'
                }}
              >
                {creatingEvent ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
