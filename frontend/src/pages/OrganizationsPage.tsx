import React from 'react'
import enTranslations from '../i18n/en.json'

const API_URL = (import.meta as any).env?.VITE_API_URL || ''

export function OrganizationsPage() {
  const [organizations, setOrganizations] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const t = enTranslations

  React.useEffect(() => {
    fetch(`${API_URL}/api/organizations`)
      .then(res => res.json())
      .then(data => {
        setOrganizations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching organizations:', err)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>{t.common.loading}</div>

  return (
    <div>
      <h2>{t.organizations.title}</h2>
      {organizations.length === 0 ? (
        <p>{t.organizations.noOrganizations}</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {organizations.map((org: any) => (
            <div key={org.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
              <h3>{org.name}</h3>
              <p>Slug: {org.slug}</p>
              <p>Plan: {org.planTier}</p>
              <p>Timezone: {org.timezone}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
