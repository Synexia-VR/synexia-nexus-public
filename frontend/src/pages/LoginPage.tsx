import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage(): JSX.Element {
  const { login, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const state = location.state as { from?: string } | null;
      const target = state?.from || "/";
      navigate(target, { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      const state = location.state as { from?: string } | null;
      const target = state?.from || "/";
      navigate(target, { replace: true });
    } catch (err: any) {
      const message =
        err?.message === "invalid_credentials"
          ? "Invalid email or password."
          : "Failed to login. Please try again.";
      setError(message);
    }
  };

  if (user) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Redirecting...</div>;
  }

  return (
    <div style={{ maxWidth: 400, margin: "3rem auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Login</h1>
      {error && (
        <div style={{ 
          color: "#c62828", 
          marginBottom: "1rem", 
          padding: "0.75rem", 
          background: "#ffebee", 
          borderRadius: "4px",
          border: "1px solid #ef5350"
        }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ 
              width: "100%", 
              padding: "0.75rem", 
              borderRadius: "4px", 
              border: "1px solid #ccc",
              fontSize: "1rem",
              boxSizing: "border-box"
            }}
          />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ 
              width: "100%", 
              padding: "0.75rem", 
              borderRadius: "4px", 
              border: "1px solid #ccc",
              fontSize: "1rem",
              boxSizing: "border-box"
            }}
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "4px",
            border: "none",
            background: isLoading ? "#ccc" : "#1976d2",
            color: "white",
            fontSize: "1rem",
            fontWeight: "bold",
            cursor: isLoading ? "not-allowed" : "pointer"
          }}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
