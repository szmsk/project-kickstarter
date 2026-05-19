import { useState } from 'react'
import KickstartForm from './components/KickstartForm'
import ResultPanel from './components/ResultPanel'
import ProjectHistory from './components/ProjectHistory'
import StatsPanel from './components/StatsPanel'
import './App.css'

const TABS = [
  { id: 'kickstart', label: '🚀 Kickstart' },
  { id: 'history',   label: '📋 Projects'  },
  { id: 'stats',     label: '📊 Stats'     },
]

export default function App() {
  const [tab, setTab]       = useState('kickstart')
  const [result, setResult] = useState(null)
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('apiKey') || '')

  const handleApiKey = (key) => {
    setApiKey(key)
    sessionStorage.setItem('apiKey', key)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🚀</span>
            <div>
              <div className="logo-name">Project Kickstarter Agent</div>
              <div className="logo-sub">6-tool Claude agent · Monterail stack · React + Vite</div>
            </div>
          </div>
          <div className="header-right">
            <div className="badge-row">
              <span className="badge">6 Tools</span>
              <span className="badge green">Tool Calling</span>
              <span className="badge">React</span>
            </div>
            <a href="https://github.com/szmsk/project-kickstarter" target="_blank" rel="noreferrer" className="gh-btn">GitHub ↗</a>
          </div>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="app-content">
        {tab === 'kickstart' && (
          <div className="kickstart-layout">
            <KickstartForm apiKey={apiKey} onApiKeyChange={handleApiKey} onResult={setResult} />
            {result ? <ResultPanel result={result} /> : <WelcomeState />}
          </div>
        )}
        {tab === 'history' && <ProjectHistory />}
        {tab === 'stats'   && <StatsPanel />}
      </div>

      <footer className="app-footer">
        Built by <strong>Szymon Kloskowski</strong> ·{' '}
        <a href="https://github.com/szmsk" target="_blank" rel="noreferrer">github.com/szmsk</a> ·
        Claude Tool Calling · React · Vite · Python Flask
      </footer>
    </div>
  )
}

function WelcomeState() {
  return (
    <div className="welcome-panel fade-up">
      <div className="welcome-icon">🚀</div>
      <h1>AI Project Kickstarter</h1>
      <p>Describe your project and the agent autonomously runs 6 tools — from requirements analysis to tech spec, timeline estimation and database save.</p>
      <div className="welcome-grid">
        {[
          ['🔍','analyze_requirements','Core features, edge cases, complexity'],
          ['⚙️','recommend_tech_stack','Next.js, Supabase, Vercel, TypeScript'],
          ['📁','generate_project_structure','Folder tree + package.json + .env'],
          ['📄','create_tech_spec','API endpoints, DB schema, components'],
          ['⏱','estimate_timeline','MVP / v1 / v2 phases with hour estimates'],
          ['💾','save_project','Persisted to SQLite project database'],
        ].map(([icon, name, desc]) => (
          <div key={name} className="welcome-tool">
            <span className="wt-icon">{icon}</span>
            <div><div className="wt-name">{name}</div><div className="wt-desc">{desc}</div></div>
          </div>
        ))}
      </div>
      <p className="welcome-sub">← Fill in the form and click Kickstart Project</p>
    </div>
  )
}
