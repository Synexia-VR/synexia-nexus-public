import { useState, useEffect, useCallback } from "react";
import { apiRequest, setAccessToken } from "../api/client";

interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface SessionsResponse {
  sessions: Session[];
}

export function SessionsPanel(): JSX.Element {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const data = await apiRequest<SessionsResponse>("/me/sessions");
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await apiRequest(`/me/sessions/${sessionId}/revoke`, { method: "POST" });
      await fetchSessions();
    } catch (err: any) {
      setError(err.message || "Failed to revoke session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogoutAll = async () => {
    setActionLoading("logout-all");
    try {
      await apiRequest("/auth/logout-all", { method: "POST" });
      setAccessToken(null);
      window.location.href = "/login";
    } catch (err: any) {
      setError(err.message || "Failed to logout all devices");
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const truncateId = (id: string) => {
    return id.substring(0, 8) + "...";
  };

  if (loading) {
    return <div style={{ padding: "1rem" }}>Loading sessions...</div>;
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "800px" }}>
      <h2 style={{ marginBottom: "1rem" }}>Active Sessions</h2>

      {error && (
        <div
          style={{
            padding: "0.75rem",
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

      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={handleLogoutAll}
          disabled={actionLoading === "logout-all"}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "4px",
            border: "none",
            background: "#e53935",
            color: "white",
            cursor: actionLoading === "logout-all" ? "not-allowed" : "pointer",
            opacity: actionLoading === "logout-all" ? 0.6 : 1,
            fontSize: "0.9rem",
          }}
        >
          {actionLoading === "logout-all"
            ? "Logging out..."
            : "Logout all devices"}
        </button>
        <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
          This will revoke all sessions and log you out everywhere.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p style={{ color: "#666" }}>No active sessions found.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "white",
          }}
        >
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th
                style={{
                  padding: "0.75rem",
                  textAlign: "left",
                  borderBottom: "2px solid #ddd",
                }}
              >
                Session ID
              </th>
              <th
                style={{
                  padding: "0.75rem",
                  textAlign: "left",
                  borderBottom: "2px solid #ddd",
                }}
              >
                Created
              </th>
              <th
                style={{
                  padding: "0.75rem",
                  textAlign: "left",
                  borderBottom: "2px solid #ddd",
                }}
              >
                Expires
              </th>
              <th
                style={{
                  padding: "0.75rem",
                  textAlign: "center",
                  borderBottom: "2px solid #ddd",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td
                  style={{ padding: "0.75rem", borderBottom: "1px solid #eee" }}
                >
                  <code style={{ fontSize: "0.85rem" }}>
                    {truncateId(session.id)}
                  </code>
                </td>
                <td
                  style={{ padding: "0.75rem", borderBottom: "1px solid #eee" }}
                >
                  {formatDate(session.createdAt)}
                </td>
                <td
                  style={{ padding: "0.75rem", borderBottom: "1px solid #eee" }}
                >
                  {formatDate(session.expiresAt)}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #eee",
                    textAlign: "center",
                  }}
                >
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={actionLoading === session.id}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "4px",
                      border: "1px solid #e53935",
                      background: "white",
                      color: "#e53935",
                      cursor:
                        actionLoading === session.id
                          ? "not-allowed"
                          : "pointer",
                      opacity: actionLoading === session.id ? 0.6 : 1,
                      fontSize: "0.85rem",
                    }}
                  >
                    {actionLoading === session.id ? "Revoking..." : "Revoke"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p
        style={{
          marginTop: "1rem",
          fontSize: "0.85rem",
          color: "#666",
        }}
      >
        {sessions.length} active session{sessions.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
