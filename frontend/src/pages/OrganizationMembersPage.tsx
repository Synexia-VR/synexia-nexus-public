import { useEffect, useState } from "react";
import { useOrganization } from "../org/OrganizationContext";
import {
  fetchOrganizationMembers,
  addOrganizationMember,
  updateOrganizationMemberRoleApi,
  removeOrganizationMemberApi,
  type OrganizationMember,
  type OrganizationRole,
} from "../api/nexusTeams";

export function OrganizationMembersPage(): JSX.Element {
  const { activeOrganization } = useOrganization();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [newMemberEmail, setNewMemberEmail] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<OrganizationRole>("PLAYER");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!activeOrganization) {
        setMembers([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchOrganizationMembers(activeOrganization.organizationId);
        if (!isMounted) return;
        setMembers(data);
      } catch (err: any) {
        console.error("Failed to load organization members", err);
        if (!isMounted) return;
        const message = err?.body?.error || err?.message || "Failed to load organization members";
        setError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [activeOrganization]);

  if (!activeOrganization) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
        No active organization selected. Please select an organization from the header dropdown.
      </div>
    );
  }

  const canManageMembers =
    activeOrganization.role === "OWNER" || activeOrganization.role === "MANAGER";

  if (!canManageMembers) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '1rem' }}>Organization Members</h1>
        <p style={{ color: '#e0e0e0' }}>You do not have permission to view or manage organization members.</p>
      </div>
    );
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganization) return;
    if (!newMemberEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const member = await addOrganizationMember(
        activeOrganization.organizationId,
        newMemberEmail.trim(),
        newMemberRole
      );
      setMembers((prev) => [...prev, member]);
      setNewMemberEmail("");
      setNewMemberRole("PLAYER");
    } catch (err: any) {
      console.error("Failed to add organization member", err);
      const message =
        err?.body?.error ||
        err?.message ||
        "Failed to add organization member";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (membershipId: string, role: OrganizationRole) => {
    if (!activeOrganization) return;
    try {
      const updated = await updateOrganizationMemberRoleApi(
        activeOrganization.organizationId,
        membershipId,
        role
      );
      setMembers((prev) =>
        prev.map((m) => (m.membershipId === membershipId ? updated : m))
      );
    } catch (err: any) {
      console.error("Failed to update member role", err);
      const message =
        err?.body?.error ||
        err?.message ||
        "Failed to update member role";
      setError(message);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!activeOrganization) return;
    if (!window.confirm("Are you sure you want to remove this member from the organization?")) {
      return;
    }

    try {
      await removeOrganizationMemberApi(
        activeOrganization.organizationId,
        membershipId
      );
      setMembers((prev) => prev.filter((m) => m.membershipId !== membershipId));
    } catch (err: any) {
      console.error("Failed to remove member", err);
      const message =
        err?.body?.error ||
        err?.message ||
        "Failed to remove member";
      setError(message);
    }
  };

  const tableStyle: React.CSSProperties = {
    borderCollapse: 'collapse',
    width: '100%',
    marginBottom: '1rem',
    backgroundColor: '#1e3a5f',
    borderRadius: '8px',
    overflow: 'hidden',
  };

  const thStyle: React.CSSProperties = {
    border: '1px solid #3d5a80',
    padding: '0.75rem',
    textAlign: 'left',
    backgroundColor: '#16213e',
    color: '#fff',
    fontWeight: 600,
  };

  const tdStyle: React.CSSProperties = {
    border: '1px solid #3d5a80',
    padding: '0.75rem',
    color: '#e0e0e0',
  };

  const selectStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    borderRadius: '4px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    cursor: 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    width: '250px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#3d5afe',
    color: 'white',
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#e74c3c',
    color: 'white',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '1.5rem' }}>
        Organization Members - {activeOrganization.organizationName}
      </h1>

      {error && (
        <div style={{
          color: '#e74c3c',
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderRadius: '4px',
          border: '1px solid #e74c3c',
        }}>
          Error: {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ color: '#fff' }}>Loading members...</div>
      ) : (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Role</th>
                {canManageMembers && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.membershipId}>
                  <td style={tdStyle}>{m.email}</td>
                  <td style={tdStyle}>{m.displayName ?? "-"}</td>
                  <td style={tdStyle}>
                    {canManageMembers ? (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          handleChangeRole(m.membershipId, e.target.value as OrganizationRole)
                        }
                        style={selectStyle}
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="COACH">COACH</option>
                        <option value="ANALYST">ANALYST</option>
                        <option value="PLAYER">PLAYER</option>
                        <option value="COMMUNITY_MANAGER">COMMUNITY_MANAGER</option>
                        <option value="PARTNER_MANAGER">PARTNER_MANAGER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: '#3d5a80',
                        fontSize: '0.85rem',
                      }}>
                        {m.role}
                      </span>
                    )}
                  </td>
                  {canManageMembers && (
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleRemoveMember(m.membershipId)}
                        style={dangerButtonStyle}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={canManageMembers ? 4 : 3}
                    style={{ ...tdStyle, textAlign: 'center' }}
                  >
                    No members found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {canManageMembers ? (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              backgroundColor: '#1e3a5f',
              borderRadius: '8px',
            }}>
              <h2 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.25rem' }}>
                Add Member
              </h2>
              <form onSubmit={handleAddMember}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', color: '#a0aec0', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      required
                      style={inputStyle}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#a0aec0', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      Role
                    </label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as OrganizationRole)}
                      style={selectStyle}
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="COACH">COACH</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="PLAYER">PLAYER</option>
                      <option value="COMMUNITY_MANAGER">COMMUNITY_MANAGER</option>
                      <option value="PARTNER_MANAGER">PARTNER_MANAGER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      ...primaryButtonStyle,
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? "Adding..." : "Add Member"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <p style={{ color: '#a0aec0', fontStyle: 'italic' }}>
              You do not have permissions to manage members in this organization.
            </p>
          )}
        </>
      )}
    </div>
  );
}
