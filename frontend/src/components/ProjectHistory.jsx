import { useState, useEffect } from 'react'
import axios from 'axios'

export default function ProjectHistory() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    axios.get('/api/projects')
      .then(r => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="history-panel">
        <div className="thinking">
          <span className="tdot" /><span className="tdot" /><span className="tdot" />
          Loading projects…
        </div>
      </div>
    )
  }

  if (!projects.length) {
    return (
      <div className="history-panel">
        <div className="empty-state">No projects yet. Run the agent to kickstart your first project.</div>
      </div>
    )
  }

  const complexColors = {
    High:   { bg: 'var(--red-bg)',   color: 'var(--red)',   border: 'var(--red-bd)' },
    Medium: { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber-bd)' },
    Low:    { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-bd)' },
  }

  return (
    <div className="history-panel">
      {projects.map(p => {
        const cc = complexColors[p.complexity] || complexColors.Medium
        return (
          <div key={p.id} className="project-row">
            <span className="proj-icon">🚀</span>
            <div className="proj-info">
              <div className="proj-name">{p.name}</div>
              <div className="proj-meta">
                {p.project_type} · {p.estimated_hours}h ·{' '}
                {new Date(p.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="proj-badges">
              <span style={{
                fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase',
                background: cc.bg, color: cc.color, border: `1px solid ${cc.border}`
              }}>
                {p.complexity}
              </span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700,
                color: 'var(--green)'
              }}>
                {p.estimated_hours}h
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
