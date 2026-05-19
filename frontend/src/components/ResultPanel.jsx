import { useState } from 'react'

const RESULT_TABS = [
  { id: 'stack',     label: '⚙️ Tech Stack' },
  { id: 'spec',      label: '📄 Tech Spec' },
  { id: 'structure', label: '📁 Structure' },
  { id: 'timeline',  label: '⏱ Timeline' },
  { id: 'trace',     label: '🔍 Tool Trace' },
]

export default function ResultPanel({ result }) {
  const [activeTab, setActiveTab] = useState('stack')
  const [openSteps, setOpenSteps] = useState({})

  if (!result) return null

  const toggleStep = (i) =>
    setOpenSteps(prev => ({ ...prev, [i]: !prev[i] }))

  const complexity = result.complexity || 'Medium'
  const hours      = result.estimated_hours || 0

  return (
    <div className="result-panel fade-up">

      {/* Banner */}
      <div className="result-banner">
        <div>
          <div className="result-title">{result.project_name || 'Project'}</div>
          <div className="result-meta">
            {result.project_type || 'Project'} ·{' '}
            {result.iterations || 0} iterations ·{' '}
            {result.elapsed_ms}ms ·{' '}
            {result.steps?.length || 0} tools called
          </div>
        </div>
        <span className={`complexity-badge complexity-${complexity}`}>{complexity}</span>
        {hours > 0 && (
          <div>
            <div className="hours-badge">{hours}h</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
              estimated
            </div>
          </div>
        )}
      </div>

      {/* Final text */}
      {result.final_text && (
        <div className="result-content" style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.75 }}>
          {result.final_text}
        </div>
      )}

      {/* Result tabs */}
      <div className="result-tabs">
        {RESULT_TABS.map(t => (
          <button
            key={t.id}
            className={`result-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="result-content">

        {/* Tech Stack */}
        {activeTab === 'stack' && (
          <TechStack stack={result.tech_stack} />
        )}

        {/* Tech Spec */}
        {activeTab === 'spec' && (
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {result.tech_spec
              ? <MarkdownLite text={result.tech_spec} />
              : <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Tech spec not generated — run the agent again.</span>
            }
          </div>
        )}

        {/* Structure */}
        {activeTab === 'structure' && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: '#c8c0a4', whiteSpace: 'pre', lineHeight: 1.7 }}>
            {result.structure
              ? (typeof result.structure === 'string' ? result.structure : JSON.stringify(result.structure, null, 2))
              : <span style={{ color: 'var(--text3)' }}>Structure not generated.</span>
            }
          </div>
        )}

        {/* Timeline */}
        {activeTab === 'timeline' && (
          <TimelineView timeline={result.timeline} />
        )}

        {/* Trace */}
        {activeTab === 'trace' && (
          <div className="step-trace">
            {(result.steps || []).map((step, i) => {
              const icons = {
                analyze_requirements: '🔍',
                recommend_tech_stack: '⚙️',
                generate_project_structure: '📁',
                create_tech_spec: '📄',
                estimate_timeline: '⏱',
                save_project: '💾',
              }
              return (
                <div key={i} className="step-card">
                  <div className="step-hdr" onClick={() => toggleStep(i)}>
                    <span style={{ color: 'var(--green)' }}>✓</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                      {icons[step.tool] || '⚙️'} {step.tool}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>
                      {openSteps[i] ? '▲' : '▼'}
                    </span>
                  </div>
                  <div className={`step-body ${openSteps[i] ? 'open' : ''}`}>
                    <div className="step-code">
                      {JSON.stringify(step.input, null, 2)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

function TechStack({ stack }) {
  if (!stack) return <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Stack not generated.</span>

  const entries = typeof stack === 'object' && !Array.isArray(stack)
    ? Object.entries(stack)
    : []

  if (!entries.length) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
        {typeof stack === 'string' ? stack : JSON.stringify(stack, null, 2)}
      </div>
    )
  }

  return (
    <div className="stack-grid">
      {entries.map(([key, val]) => (
        <div key={key} className="stack-item">
          <div className="stack-key">{key}</div>
          <div className="stack-val">
            {typeof val === 'object' ? val.name || JSON.stringify(val) : String(val)}
          </div>
          {typeof val === 'object' && val.reason && (
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{val.reason}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function TimelineView({ timeline }) {
  if (!timeline) return <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Timeline not generated.</span>

  // Timeline can be array of phases or a string
  if (typeof timeline === 'string') {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
        {timeline}
      </div>
    )
  }

  const phases = Array.isArray(timeline) ? timeline : []
  if (!phases.length) {
    return <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>No phases found.</span>
  }

  return (
    <div className="timeline-phases">
      {phases.map((phase, i) => {
        const features = phase.features || []
        const totalH   = phase.hours || phase.total_hours || 0
        return (
          <div key={i} className="phase-card">
            <div className="phase-hdr">
              <span className="phase-name">{phase.phase || `Phase ${i+1}`}</span>
              <span className="phase-meta">
                {phase.weeks ? `${phase.weeks} weeks` : ''}{totalH ? ` · ${totalH}h` : ''}
              </span>
            </div>
            <div className="phase-features">
              {features.map((feat, j) => {
                const name  = typeof feat === 'string' ? feat : (feat.name || feat.feature || JSON.stringify(feat))
                const hours = typeof feat === 'object' ? (feat.hours || feat.h || '') : ''
                return (
                  <div key={j} className="phase-feat">
                    <span className="feat-name">{name}</span>
                    {hours && <span className="feat-hours">{hours}h</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Simple markdown renderer (no external dep)
function MarkdownLite({ text }) {
  const lines = text.split('\n')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 12, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginTop: 8 }}>{line.slice(4)}</h3>
        if (line.startsWith('# '))  return <h1 key={i} style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 12 }}>{line.slice(2)}</h1>
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ fontSize: 12.5, color: 'var(--text2)', paddingLeft: 12 }}>• {line.slice(2)}</div>
        if (/^\d+\. /.test(line)) return <div key={i} style={{ fontSize: 12.5, color: 'var(--text2)', paddingLeft: 12 }}>{line}</div>
        if (line.startsWith('```')) return <div key={i} />
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        return <div key={i} style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.7 }}>{line}</div>
      })}
    </div>
  )
}
