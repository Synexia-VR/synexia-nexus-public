import React from 'react'
import { useOrganization } from '../org/OrganizationContext'
import {
  fetchTeamsByOrganization,
  fetchTeamMemberships,
  createTeamMembershipApi,
  deleteTeamMembershipApi,
  TeamMemberRoleEntry,
  TeamMemberRole,
  fetchOrganizationMembers,
  OrganizationMember,
  Team,
} from '../api/nexusTeams'

export function OrgTeamMembershipsPage() {
  const { activeOrganization, isLoading: isOrgLoading } = useOrganization()
  const userRole = activeOrganization?.role as string | undefined

  const canManageTeamMemberships = userRole === 'OWNER' || userRole === 'MANAGER'

  const [memberships, setMemberships] = React.useState<TeamMemberRoleEntry[]>([])
  const [members, setMembers] = React.useState<OrganizationMember[]>([])
  const [teams, setTeams] = React.useState<Team[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [selectedUserId, setSelectedUserId] = React.useState('')
  const [selectedTeamId, setSelectedTeamId] = React.useState('')
  const [selectedTeamRole, setSelectedTeamRole] = React.useState<TeamMemberRole | ''>('')

  React.useEffect(() => {
    if (!activeOrganization?.organizationId) return
    const orgId = activeOrganization.organizationId
    setLoading(true)
    setError(null)

    Promise.all([
      fetchTeamMemberships(orgId),
      fetchOrganizationMembers(orgId),
      fetchTeamsByOrganization(orgId)
    ])
      .then(([membershipsData, membersData, teamsData]) => {
        setMemberships(membershipsData)
        setMembers(membersData)
        setTeams(teamsData)
      })
      .catch((err) => {
        console.error('Error loading team memberships data:', err)
        setError('Failed to load data')
      })
      .finally(() => setLoading(false))
  }, [activeOrganization?.organizationId])

  const handleDeleteMembership = async (membershipId: string) => {
    if (!canManageTeamMemberships || !activeOrganization) return
    try {
      await deleteTeamMembershipApi(activeOrganization.organizationId, membershipId)
      setMemberships((prev) => prev.filter((m) => m.id !== membershipId))
    } catch (err) {
      console.error('Error deleting membership:', err)
      setError('Failed to delete membership')
    }
  }

  const handleCreateMembership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManageTeamMemberships || !activeOrganization) return
    if (!selectedUserId || !selectedTeamId || !selectedTeamRole) {
      setError('Please select user, team, and role')
      return
    }
    setError(null)
    try {
      const newMembership = await createTeamMembershipApi({
        organizationId: activeOrganization.organizationId,
        teamId: selectedTeamId,
        targetUserId: selectedUserId,
        role: selectedTeamRole as TeamMemberRole
      })
      setMemberships((prev) => [...prev, newMembership])
      setSelectedUserId('')
      setSelectedTeamId('')
      setSelectedTeamRole('')
    } catch (err: any) {
      console.error('Error creating membership:', err)
      if (err.message?.includes('already_exists')) {
        setError('This user already has a membership in this team')
      } else {
        setError('Failed to create membership')
      }
    }
  }

  if (isOrgLoading) {
    return <div>Loading organization...</div>
  }

  if (!activeOrganization) {
    return (
      <div>
        <h2>Team Memberships</h2>
        <p>Please select an organization from the dropdown above.</p>
      </div>
    )
  }

  if (!canManageTeamMemberships) {
    return (
      <div>
        <h2>Team Memberships</h2>
        <p>You do not have permission to manage team memberships in this organization.</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Team Memberships</h2>
      <p>Link organization members to specific teams with a team-level role (PLAYER, COACH, ANALYST, STAFF).</p>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <form onSubmit={handleCreateMembership} style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Add New Membership</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                User:
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={{ padding: '0.5rem' }}>
                  <option value="">-- Select user --</option>
                  {members.map((member) => (
                    <option key={member.membershipId} value={member.userId}>
                      {member.displayName || member.email} ({member.role})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Team:
                <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} style={{ padding: '0.5rem' }}>
                  <option value="">-- Select team --</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Team Role:
                <select value={selectedTeamRole} onChange={(e) => setSelectedTeamRole(e.target.value as TeamMemberRole | '')} style={{ padding: '0.5rem' }}>
                  <option value="">-- Select role --</option>
                  <option value="PLAYER">PLAYER</option>
                  <option value="COACH">COACH</option>
                  <option value="ANALYST">ANALYST</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </label>

              <button type="submit" style={{ padding: '0.5rem 1rem', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Add Membership
              </button>
            </div>
          </form>

          <h3>Current Memberships</h3>
          {memberships.length === 0 ? (
            <p>No team memberships yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Team</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>User</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Role</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>{m.team?.name ?? m.teamId}</td>
                    <td style={{ padding: '0.75rem' }}>{m.user?.displayName || m.user?.email || m.userId}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        background: m.role === 'COACH' ? '#2196f3' : m.role === 'PLAYER' ? '#4caf50' : m.role === 'ANALYST' ? '#9c27b0' : '#607d8b',
                        color: 'white'
                      }}>
                        {m.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => handleDeleteMembership(m.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#e53935', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </td>
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
