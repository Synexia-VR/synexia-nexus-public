import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import enTranslations from './i18n/en.json'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { OrganizationProvider, useOrganization } from './org/OrganizationContext'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { MyOrganizationsPage } from './pages/MyOrganizationsPage'
import { OrganizationMembersPage } from './pages/OrganizationMembersPage'
import { TeamsPage } from './pages/TeamsPage'
import { PlayersPage } from './pages/PlayersPage'
import { EventsPage } from './pages/EventsPage'
import { MatchesPage } from './pages/MatchesPage'
import { OrgTeamMembershipsPage } from './pages/OrgTeamMembershipsPage'
import { StatsPage } from './pages/StatsPage'
import { OrganizationsPage } from './pages/OrganizationsPage'
import { SessionsPanel } from './components/SessionsPanel'

const queryClient = new QueryClient()

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

function NavBar() {
  const { user, logout } = useAuth()
  const { organizations, activeOrganizationId, setActiveOrganizationId, isLoading: isOrgLoading } = useOrganization()
  const t = enTranslations
  
  return (
    <nav style={{ 
      background: '#16213e', 
      padding: '1rem 2rem', 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>{t.navigation.home}</Link>
        <Link to="/organizations" style={{ color: 'white', textDecoration: 'none' }}>{t.navigation.organizations}</Link>
        <Link to="/teams" style={{ color: 'white', textDecoration: 'none' }}>{t.navigation.teams}</Link>
        <Link to="/players" style={{ color: 'white', textDecoration: 'none' }}>{t.navigation.players}</Link>
        <Link to="/events" style={{ color: 'white', textDecoration: 'none' }}>{t.navigation.events}</Link>
        <Link to="/matches" style={{ color: 'white', textDecoration: 'none' }}>{t.navigation.matches}</Link>
        <Link to="/stats" style={{ color: 'white', textDecoration: 'none' }}>{t.navigation.stats}</Link>
        <Link to="/me/organizations" style={{ color: 'white', textDecoration: 'none' }}>My Orgs</Link>
        <Link to="/me/sessions" style={{ color: 'white', textDecoration: 'none' }}>Sessions</Link>
        {organizations.find(o => o.organizationId === activeOrganizationId && (o.role === 'OWNER' || o.role === 'MANAGER')) && (
          <>
            <Link to="/org/members" style={{ color: 'white', textDecoration: 'none' }}>Org Members</Link>
            <Link to="/org/team-memberships" style={{ color: 'white', textDecoration: 'none' }}>Team Memberships</Link>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isOrgLoading ? (
              <span style={{ color: 'white', opacity: 0.7, fontSize: '0.85rem' }}>Loading orgs...</span>
            ) : organizations.length === 0 ? (
              <span style={{ color: 'white', opacity: 0.7, fontSize: '0.85rem' }}>No orgs</span>
            ) : (
              <select
                value={activeOrganizationId ?? ""}
                onChange={(e) => setActiveOrganizationId(e.target.value || null)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  background: '#2d3748',
                  color: 'white',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                {organizations.map((m) => (
                  <option key={m.membershipId} value={m.organizationId}>
                    {m.organizationName} ({m.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {user ? (
          <>
            <span style={{ color: 'white', opacity: 0.9 }}>
              {user.displayName || user.email}
            </span>
            <button
              onClick={logout}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                background: '#e53935',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link 
            to="/login" 
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              background: '#1976d2',
              borderRadius: '4px'
            }}
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}

function App() {
  const t = enTranslations

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
      <header style={{ background: '#1a1a2e', color: 'white', padding: '1rem 2rem' }}>
        <h1 style={{ margin: 0 }}>{t.app.title}</h1>
        <p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>{t.app.subtitle}</p>
      </header>
      
      <NavBar />

      <main style={{ padding: '2rem' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/organizations" element={<RequireAuth><OrganizationsPage /></RequireAuth>} />
          <Route path="/teams" element={<RequireAuth><TeamsPage /></RequireAuth>} />
          <Route path="/players" element={<RequireAuth><PlayersPage /></RequireAuth>} />
          <Route path="/events" element={<RequireAuth><EventsPage /></RequireAuth>} />
          <Route path="/matches" element={<RequireAuth><MatchesPage /></RequireAuth>} />
          <Route path="/stats" element={<RequireAuth><StatsPage /></RequireAuth>} />
          <Route path="/me/organizations" element={<RequireAuth><MyOrganizationsPage /></RequireAuth>} />
          <Route path="/me/sessions" element={<RequireAuth><SessionsPanel /></RequireAuth>} />
          <Route path="/org/members" element={<RequireAuth><OrganizationMembersPage /></RequireAuth>} />
          <Route path="/org/team-memberships" element={<RequireAuth><OrgTeamMembershipsPage /></RequireAuth>} />
        </Routes>
      </main>

      <footer style={{ background: '#1a1a2e', color: 'white', padding: '1rem 2rem', marginTop: '2rem', textAlign: 'center' }}>
        <p style={{ margin: 0, opacity: 0.7 }}>© 2025 Synexia Nexus - Modular Esports Management Platform</p>
      </footer>
    </div>
  )
}

function HomePage() {
  const t = enTranslations
  return (
    <div>
      <h2>{t.home.welcome}</h2>
      <p>{t.home.description}</p>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>System Status</h3>
        <p>Backend API: {API_URL}</p>
        <p>Database: PostgreSQL (Connected)</p>
        <p>Active Modules: Core, Nexus Teams</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <App />
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
