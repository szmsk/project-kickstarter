import { useState } from 'react'
import axios from 'axios'

const TOOLS = [
  { icon: '🔍', name: 'analyze_requirements' },
  { icon: '⚙️', name: 'recommend_tech_stack' },
  { icon: '📁', name: 'generate_project_structure' },
  { icon: '📄', name: 'create_tech_spec' },
  { icon: '⏱', name: 'estimate_timeline' },
  { icon: '💾', name: 'save_project' },
]

export default function KickstartForm({ apiKey, onApiKeyChange, onResult }) {
  const [showKey, setShowKey]       = useState(false)
  const [brief, setBrief]           = useState('')
  const [projectName, setProjectName] = useState('')
  const [constraints, setConstraints] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [activeTool, setActiveTool] = useState(-1)
  const [doneTool, setDoneTool]     = useState(-1)

  const run = async () => {
    if (!apiKey) return setError('Please enter your Anthropic API key.')
    if (!brief.trim()) return setError('Please describe your project.')
    if (brief.length < 30) return setError('Brief too short — add more detail.')

    setLoading(true)
    setError('')
    setActiveTool(0)
    setDoneTool(-1)
    onResult(null)

    // Animate pipeline steps while waiting
    let step = 0
    const interval = setInterval(() => {
      step = Math.min(step + 1, TOOLS.length - 1)
      setActiveTool(step)
      setDoneTool(step - 1)
    }, 8000)

    try {
      const { data } = await axios.post('/api/kickstart', {
        apiKey,
        brief,
        projectName: projectName || 'My Project',
        constraints,
      })
      clearInterval(interval)
      setActiveTool(-1)
      setDoneTool(TOOLS.length - 1)
      onResult(data)
    } catch (err) {
      clearInterval(interval)
      setActiveTool(-1)
      setDoneTool(-1)
      const msg = err.response?.data?.error || err.message || 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-panel">

      {/* API Key */}
      <div className="card">
        <div className="card-label">API KEY</div>
        <div className="key-row">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => onApiKeyChange(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
          />
          <button className="eye-btn" onClick={() => setShowKey(!showKey)}>👁</button>
        </div>
        <div className="key-hint">
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>{' '}· first $5 free
        </div>
      </div>

      {/* Project input */}
      <div className="card">
        <div className="card-label">PROJECT</div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="e.g. TalentMatch — AI Recruitment SaaS"
          />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Project Brief *</label>
          <textarea
            rows={6}
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder={`Describe what you want to build. Include:\n• Core features\n• Target users\n• Key integrations\n• Any AI/ML components\n\ne.g. "SaaS platform for HR teams to match job candidates using AI. Features: job posting, CV upload, AI scoring, dashboard analytics. Integrate with LinkedIn. ~50 companies, 200 users."`}
          />
        </div>
        <div className="field">
          <label>Constraints (optional)</label>
          <input
            type="text"
            value={constraints}
            onChange={e => setConstraints(e.target.value)}
            placeholder="e.g. 3-month timeline, 2 devs, MVP first"
          />
        </div>
      </div>

      {/* Pipeline indicator */}
      <div className="card">
        <div className="card-label">AGENT PIPELINE</div>
        <div className="pipe-steps">
          {TOOLS.map((tool, i) => (
            <div key={tool.name}>
              <div className={`pipe-step ${activeTool === i ? 'active' : ''} ${doneTool >= i ? 'done' : ''}`}>
                <span className="pipe-icon">{tool.icon}</span>
                <span className="pipe-name">{tool.name}</span>
                {doneTool >= i && <span className="pipe-check">✓</span>}
                {activeTool === i && <span className="pipe-check">⟳</span>}
              </div>
              {i < TOOLS.length - 1 && <div className="pipe-arrow">↓</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <div className="err-box">⚠ {error}</div>}

      {/* Run button */}
      <button className="run-btn" onClick={run} disabled={loading}>
        {loading ? (
          <><span className="spinner" /> Running agent…</>
        ) : (
          <><span>🚀</span> Kickstart Project</>
        )}
      </button>

      {loading && (
        <div className="thinking">
          <span className="tdot" /><span className="tdot" /><span className="tdot" />
          Agent running 6 tools in sequence…
        </div>
      )}

    </div>
  )
}
