import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { loginAccount, type AuthUser } from "../api/nexusTeams";
import {
  setAccessToken,
  refreshAccessToken,
  logout as apiLogout,
} from "../api/client";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function tryRefresh() {
      try {
        const result = await refreshAccessToken();
        if (mounted && result) {
          setToken(result.accessToken);
          setAccessToken(result.accessToken);
          setUser(result.user);
        }
      } catch {
        // no valid refresh token
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    tryRefresh();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginAccount({ email, password });
      setUser(res.user);
      setToken(res.accessToken);
      setAccessToken(res.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setToken(null);
    setAccessToken(null);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
