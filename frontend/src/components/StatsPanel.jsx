import { useState, useEffect } from 'react'
import axios from 'axios'

export default function StatsPanel() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/stats')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="stats-panel">
        <div className="thinking">
          <span className="tdot" /><span className="tdot" /><span className="tdot" />
          Loading stats…
        </div>
      </div>
    )
  }

  if (!stats) return null

  const maxType = Math.max(...(stats.by_type || []).map(t => t.n), 1)

  return (
    <div className="stats-panel">

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-lbl">Projects Kickstarted</div>
        </div>
        <div className="stat-box">
          <div className="stat-num" style={{ color: 'var(--amber)' }}>{stats.avg_hours}</div>
          <div className="stat-lbl">Avg Hours Estimated</div>
        </div>
        <div className="stat-box">
          <div className="stat-num" style={{ color: 'var(--blue)' }}>{(stats.by_type || []).length}</div>
          <div className="stat-lbl">Project Types</div>
        </div>
      </div>

      {(stats.by_type || []).length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 12 }}>
            BY PROJECT TYPE
          </div>
          <div className="bar-chart">
            {stats.by_type.map(t => (
              <div key={t.project_type} className="bar-row">
                <span className="bar-label">{t.project_type || 'Unknown'}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(t.n / maxType) * 100}%`, background: 'var(--green)' }} />
                  <span className="bar-val">{t.n}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 10 }}>
          ABOUT THIS TOOL
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.75 }}>
          The Project Kickstarter Agent uses Claude tool calling to autonomously run 6 specialised tools —
          from parsing requirements to generating a full tech spec and timeline estimate.
          Built for Monterail's stack: <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>Next.js · TypeScript · Supabase · Vercel</span>.
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {['React', 'Vite', 'Python', 'Flask', 'Claude API', 'Tool Calling', 'SQLite'].map(t => (
            <span key={t} style={{ fontSize: 10, fontFamily: 'var(--mono)', background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '2px 9px', borderRadius: 20 }}>
              {t}
            </span>
          ))}
        </div>
      </div>

    </div>
  )
}
