import { useEffect, useState } from "react";
import { fetchMyOrganizations, type MyOrganizationMembership } from "../api/nexusTeams";

export function MyOrganizationsPage(): JSX.Element {
  const [orgs, setOrgs] = useState<MyOrganizationMembership[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchMyOrganizations();
        if (!isMounted) return;
        setOrgs(data);
      } catch (err: any) {
        console.error("Failed to load my organizations", err);
        if (!isMounted) return;
        const message = err?.body?.error || err?.message || "Failed to load organizations";
        setError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Loading your organizations...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: "1rem", 
        color: "#c62828", 
        background: "#ffebee", 
        border: "1px solid #ef5350",
        borderRadius: "4px" 
      }}>
        Error: {error}
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Organizations</h2>
        <p style={{ color: "#666" }}>
          You are not a member of any organization yet.
        </p>
      </div>
    );
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "OWNER":
        return { background: "#e8f5e9", color: "#2e7d32" };
      case "MANAGER":
        return { background: "#e3f2fd", color: "#1565c0" };
      case "COACH":
        return { background: "#fff3e0", color: "#ef6c00" };
      case "ANALYST":
        return { background: "#f3e5f5", color: "#7b1fa2" };
      case "PLAYER":
        return { background: "#e0f7fa", color: "#00838f" };
      default:
        return { background: "#f5f5f5", color: "#616161" };
    }
  };

  return (
    <div>
      <h2>My Organizations</h2>
      <div style={{ 
        display: "grid", 
        gap: "1rem", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        marginTop: "1rem"
      }}>
        {orgs.map((m) => (
          <div 
            key={m.membershipId} 
            style={{ 
              border: "1px solid #ddd", 
              padding: "1.25rem", 
              borderRadius: "8px",
              background: "white"
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0" }}>{m.organizationName}</h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span 
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  ...getRoleBadgeStyle(m.role)
                }}
              >
                {m.role.replace("_", " ")}
              </span>
              {m.organizationSlug && (
                <span style={{ color: "#666", fontSize: "0.85rem" }}>
                  /{m.organizationSlug}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
