# 🚀 AI Project Kickstarter Agent

An autonomous AI agent that takes a project brief and produces everything a software team needs to start building — tech stack, project structure, tech spec, and timeline estimate — in under 2 minutes.


## What It Does

```
Input: "SaaS for HR teams to match candidates using AI.
        Features: job posting, CV upload, AI scoring, dashboard."
              ↓
Tool 1: analyze_requirements
    → project type · core features · edge cases · complexity

Tool 2: recommend_tech_stack
    → Next.js 14 · TypeScript · Supabase · Vercel · Tailwind · Claude API

Tool 3: generate_project_structure
    → folder tree · package.json · .env.example · README

Tool 4: create_tech_spec
    → architecture · API endpoints · DB schema · components · acceptance criteria

Tool 5: estimate_timeline
    → MVP (4-6w) · v1 (6-8w) · v2 with hour estimates per feature

Tool 6: save_project
    → persisted to SQLite with full analysis
              ↓
React dashboard: Stack · Spec · Structure · Timeline · Tool Trace
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | **React** + Vite + CSS variables |
| Backend | Python · Flask |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) — tool calling |
| Database | SQLite |
| Build | Vite (served by Flask in production) |

## Quick Start

```bash
git clone https://github.com/szmsk/project-kickstarter.git
cd project-kickstarter

# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Run
python server.py
# → http://localhost:5000
```

**Dev mode** (hot reload frontend):
```bash
# Terminal 1
python server.py

# Terminal 2
cd frontend && npm run dev
# → http://localhost:5173 (proxied to Flask)
```

## Why React (not Vanilla JS)

All other projects in this portfolio use Vanilla JS. This one uses React. The component structure demonstrates:
- `useState` / `useEffect` hooks
- Component composition (Form → Results → History → Stats)
- Conditional rendering and loading states
- Axios for API calls
- Vite build tooling

## The 6 Tools

| Tool | Input | Output |
|---|---|---|
| `analyze_requirements` | Project brief | Features, complexity, challenges |
| `recommend_tech_stack` | Requirements | Stack with rationale per layer |
| `generate_project_structure` | Name + stack | Folder tree + key files |
| `create_tech_spec` | Requirements + stack | Full Markdown spec document |
| `estimate_timeline` | Requirements + complexity | Phases with hour breakdown |
| `save_project` | All outputs | Saved to SQLite, returns ID |

## Project Structure

```
project-kickstarter/
├── server.py                   # Flask + Claude tool calling + SQLite
├── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app, tab routing
│   │   ├── App.css             # All styles
│   │   ├── components/
│   │   │   ├── KickstartForm.jsx   # Input form + pipeline indicator
│   │   │   ├── ResultPanel.jsx     # Tabbed result display
│   │   │   ├── ProjectHistory.jsx  # Project list
│   │   │   └── StatsPanel.jsx      # Stats + bar charts
│   │   └── index.css           # Global CSS variables
│   ├── vite.config.js          # Proxy /api → Flask
│   └── package.json
└── README.md
```

## Author

**Szymon Kloskowski** — kloskowskiszymon@wp.pl
[github.com/szmsk](https://github.com/szmsk) · [linkedin.com/in/szymon-kloskowski](https://linkedin.com/in/szymon-kloskowski)

MIT License
