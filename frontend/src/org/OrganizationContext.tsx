import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "../auth/AuthContext";
import {
  fetchMyOrganizations,
  type MyOrganizationMembership,
} from "../api/nexusTeams";

interface OrganizationContextValue {
  organizations: MyOrganizationMembership[];
  activeOrganization: MyOrganizationMembership | null;
  activeOrganizationId: string | null;
  setActiveOrganizationId: (organizationId: string | null) => void;
  isLoading: boolean;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(
  undefined
);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({
  children,
}: OrganizationProviderProps): JSX.Element {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<MyOrganizationMembership[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!user) {
        if (!isMounted) return;
        setOrganizations([]);
        setActiveOrganizationIdState(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const orgs = await fetchMyOrganizations();
        if (!isMounted) return;
        setOrganizations(orgs);

        if (orgs.length > 0) {
          const stillValid = orgs.some((o) => o.organizationId === activeOrganizationId);
          if (!stillValid) {
            setActiveOrganizationIdState(orgs[0].organizationId);
          }
        } else {
          setActiveOrganizationIdState(null);
        }
      } catch (err: any) {
        console.error("Failed to load organizations for user", err);
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
  }, [user]);

  const setActiveOrganizationId = useCallback((organizationId: string | null) => {
    setActiveOrganizationIdState(organizationId);
  }, []);

  const activeOrganization =
    organizations.find((o) => o.organizationId === activeOrganizationId) ?? null;

  const value: OrganizationContextValue = {
    organizations,
    activeOrganization,
    activeOrganizationId,
    setActiveOrganizationId,
    isLoading,
    error,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return ctx;
}
