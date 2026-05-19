"""
AI Project Kickstarter Agent — for Monterail
Claude tool-calling agent with 6 tools:
  1. analyze_requirements    — parse brief, identify features, edge cases
  2. recommend_tech_stack    — choose stack with rationale
  3. generate_project_structure — folder structure + starter files
  4. create_tech_spec        — full technical specification document
  5. estimate_timeline       — phase breakdown with hour estimates
  6. save_project            — persist to SQLite
"""

import json, re, time, sqlite3, uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import anthropic

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
CORS(app)
DB = 'projects.db'


# ── Database ───────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS projects (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        brief           TEXT,
        project_type    TEXT,
        tech_stack      TEXT,
        structure       TEXT,
        tech_spec       TEXT,
        timeline        TEXT,
        complexity      TEXT DEFAULT 'Medium',
        estimated_hours INTEGER DEFAULT 0,
        status          TEXT DEFAULT 'Kickstarted',
        created_at      TEXT,
        elapsed_ms      INTEGER DEFAULT 0
    );
    """)

    # Demo projects
    if conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0] == 0:
        now = ts()
        demos = [
            ("proj_001", "TalentMatch — AI Recruitment Platform",
             "SaaS for HR teams to match candidates with job openings using AI",
             "SaaS / AI",
             json.dumps({"frontend":"Next.js 14 + TypeScript","backend":"FastAPI","db":"Supabase (PostgreSQL)","ai":"Anthropic Claude API","hosting":"Vercel + Railway","auth":"Supabase Auth"}),
             json.dumps({"root":["src/","public/","supabase/"],"src":["app/","components/","lib/","hooks/","types/"]}),
             "Full-stack SaaS with AI-powered candidate matching, resume parsing, and automated outreach.",
             json.dumps([{"phase":"MVP","weeks":"4-6","hours":320,"features":["Auth","Job posting","CV upload","AI matching"]},{"phase":"v1","weeks":"6-8","hours":480,"features":["Dashboard analytics","Email automation","ATS integrations"]}]),
             "High", 800, "Kickstarted", now, 12400),
            ("proj_002", "ShelfAI — Retail Analytics Dashboard",
             "Computer vision dashboard for retail shelf compliance monitoring",
             "Computer Vision / Dashboard",
             json.dumps({"frontend":"React + Recharts","backend":"Python FastAPI","db":"PostgreSQL","ai":"Custom CV model","hosting":"AWS","auth":"JWT"}),
             json.dumps({"root":["frontend/","backend/","ml/","docker/"]}),
             "Real-time shelf monitoring with compliance scoring and alerting.",
             json.dumps([{"phase":"MVP","weeks":"6","hours":400,"features":["Image upload","CV inference","Basic dashboard"]},{"phase":"v1","weeks":"8","hours":560,"features":["Live camera feed","Alerts","Reports"]}]),
             "High", 960, "Kickstarted", now, 15200),
        ]
        conn.executemany(
            "INSERT OR IGNORE INTO projects VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            demos
        )
    conn.commit()
    conn.close()
    print("✅ Projects database ready")


def ts():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()

def uid():
    return str(uuid.uuid4())[:12]


# ── Tool definitions ───────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "analyze_requirements",
        "description": (
            "Parse the project brief and extract: project type, core features (must-have), "
            "nice-to-have features, target users, key technical challenges, integrations needed, "
            "and potential edge cases. Call this FIRST."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "brief": {
                    "type": "string",
                    "description": "The raw project brief from the client"
                }
            },
            "required": ["brief"]
        }
    },
    {
        "name": "recommend_tech_stack",
        "description": (
            "Based on the requirements analysis, recommend the optimal technology stack. "
            "Prefer modern stacks used at Monterail: Next.js, React, TypeScript, Supabase, "
            "Vercel, Tailwind CSS, Prisma. Include rationale for each choice. "
            "Consider: project complexity, timeline, team size, scalability needs."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "requirements": {
                    "type": "string",
                    "description": "Requirements analysis from analyze_requirements"
                },
                "constraints": {
                    "type": "string",
                    "description": "Any constraints: budget, timeline, team size (optional)"
                }
            },
            "required": ["requirements"]
        }
    },
    {
        "name": "generate_project_structure",
        "description": (
            "Generate a complete project folder structure with key files. "
            "Include: directory tree, important file contents (package.json, "
            ".env.example, README.md header, main config files). "
            "Structure should be production-ready, not just a demo."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "project_name": {
                    "type": "string",
                    "description": "The project name (slugified)"
                },
                "tech_stack": {
                    "type": "string",
                    "description": "Tech stack from recommend_tech_stack"
                },
                "project_type": {
                    "type": "string",
                    "description": "Type of project (SaaS, MVP, API, etc.)"
                }
            },
            "required": ["project_name", "tech_stack", "project_type"]
        }
    },
    {
        "name": "create_tech_spec",
        "description": (
            "Create a complete technical specification document including: "
            "architecture overview, API endpoints (method, path, description, request/response), "
            "database schema (tables, key fields, relationships), "
            "component breakdown (frontend), "
            "AI integration details (if applicable), "
            "security considerations, and acceptance criteria per feature."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "requirements": {
                    "type": "string",
                    "description": "Full requirements analysis"
                },
                "tech_stack": {
                    "type": "string",
                    "description": "Chosen tech stack"
                },
                "structure": {
                    "type": "string",
                    "description": "Project structure"
                }
            },
            "required": ["requirements", "tech_stack"]
        }
    },
    {
        "name": "estimate_timeline",
        "description": (
            "Break the project into phases (MVP, v1, v2) with: "
            "features per phase, estimated hours per feature, "
            "total hours per phase, recommended team composition, "
            "and key milestones. Be realistic — not optimistic."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "requirements": {
                    "type": "string",
                    "description": "Full requirements"
                },
                "tech_stack": {
                    "type": "string",
                    "description": "Tech stack"
                },
                "complexity": {
                    "type": "string",
                    "enum": ["Low", "Medium", "High"],
                    "description": "Overall project complexity"
                }
            },
            "required": ["requirements", "tech_stack", "complexity"]
        }
    },
    {
        "name": "save_project",
        "description": (
            "Save the completed project kickstart to the database. "
            "Call this LAST after all other tools have completed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name":            {"type": "string"},
                "brief":           {"type": "string"},
                "project_type":    {"type": "string"},
                "tech_stack":      {"type": "string", "description": "JSON string"},
                "structure":       {"type": "string", "description": "JSON string"},
                "tech_spec":       {"type": "string"},
                "timeline":        {"type": "string", "description": "JSON string"},
                "complexity":      {"type": "string", "enum": ["Low","Medium","High"]},
                "estimated_hours": {"type": "integer"}
            },
            "required": ["name", "brief", "project_type", "complexity", "estimated_hours"]
        }
    }
]


# ── Tool implementations ───────────────────────────────────────────────────

def tool_analyze_requirements(brief: str) -> dict:
    return {
        "status": "ready",
        "brief_length": len(brief),
        "instruction": (
            "Extract: project_type, core_features (list, max 8), "
            "nice_to_have (list, max 5), target_users, "
            "technical_challenges (list), integrations_needed (list), "
            "ai_components (list or empty), edge_cases (list), "
            "complexity_assessment (Low/Medium/High with rationale)."
        )
    }


def tool_recommend_tech_stack(requirements: str, constraints: str = "") -> dict:
    return {
        "status": "ready",
        "instruction": (
            "Recommend stack as JSON with keys: frontend, backend, database, "
            "auth, hosting, ai_integration (if needed), "
            "testing, ci_cd, monitoring. "
            "For each: name and 1-sentence rationale. "
            "Prefer: Next.js 14, TypeScript, Supabase, Vercel, Tailwind, "
            "Prisma, shadcn/ui, Anthropic/OpenAI API when relevant."
        )
    }


def tool_generate_project_structure(project_name: str, tech_stack: str,
                                     project_type: str) -> dict:
    return {
        "status": "ready",
        "instruction": (
            "Generate: (1) directory_tree (string with indentation), "
            "(2) key_files as object mapping filename to content — include: "
            "package.json (with correct deps), .env.example (all vars needed), "
            "README.md (title + setup instructions), "
            "src/app/layout.tsx or equivalent root file. "
            "Be specific — use actual package names and versions."
        )
    }


def tool_create_tech_spec(requirements: str, tech_stack: str,
                           structure: str = "") -> dict:
    return {
        "status": "ready",
        "instruction": (
            "Write a technical specification with sections: "
            "## Architecture Overview (diagram in text), "
            "## API Endpoints (table: method | path | description | auth required), "
            "## Database Schema (tables with fields and types), "
            "## Frontend Components (list with props), "
            "## AI Integration (prompts, tools, models — if applicable), "
            "## Security (auth, input validation, rate limiting), "
            "## Acceptance Criteria (per core feature). "
            "Write in Markdown. Be specific and actionable."
        )
    }


def tool_estimate_timeline(requirements: str, tech_stack: str,
                            complexity: str = "Medium") -> dict:
    return {
        "status": "ready",
        "complexity": complexity,
        "instruction": (
            "Return JSON array of phases. Each phase: "
            "{ phase, weeks, hours, features: [{name, hours, developer}], "
            "team: [{role, count}], milestone }. "
            "Phases: MVP (must-have only), v1 (polished + key extras), "
            "v2 (scale + advanced features). "
            "Be realistic: add 20% buffer for unknown complexity. "
            "Also return total_hours and recommended_team_size."
        )
    }


def tool_save_project(name: str, brief: str, project_type: str,
                       complexity: str, estimated_hours: int, **kwargs) -> dict:
    conn  = get_db()
    now   = ts()
    pid   = "proj_" + uid()

    conn.execute(
        "INSERT INTO projects VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (pid, name, brief[:500], project_type,
         kwargs.get('tech_stack', '{}'),
         kwargs.get('structure', '{}'),
         kwargs.get('tech_spec', ''),
         kwargs.get('timeline', '[]'),
         complexity, estimated_hours,
         'Kickstarted', now, kwargs.get('elapsed_ms', 0))
    )
    conn.commit()
    conn.close()
    return {"status": "saved", "project_id": pid, "name": name}


# ── Dispatch ───────────────────────────────────────────────────────────────

def dispatch(name: str, inputs: dict) -> str:
    handlers = {
        "analyze_requirements":      tool_analyze_requirements,
        "recommend_tech_stack":      tool_recommend_tech_stack,
        "generate_project_structure":tool_generate_project_structure,
        "create_tech_spec":          tool_create_tech_spec,
        "estimate_timeline":         tool_estimate_timeline,
        "save_project":              tool_save_project,
    }
    fn = handlers.get(name)
    if not fn:
        return json.dumps({"error": f"Unknown tool: {name}"})
    return json.dumps(fn(**inputs))


# ── Agentic loop ───────────────────────────────────────────────────────────

def run_kickstart_agent(brief: str, project_name: str, constraints: str,
                         api_key: str) -> dict:
    client = anthropic.Anthropic(api_key=api_key)

    system = """You are an expert AI Project Kickstarter Agent for Monterail — a top software house based in Wrocław, Poland.

When given a project brief, call ALL 6 tools in this exact order:
1. analyze_requirements    → understand what needs to be built
2. recommend_tech_stack    → choose the right technologies
3. generate_project_structure → create the folder + file structure
4. create_tech_spec        → write the full technical specification
5. estimate_timeline       → break into MVP/v1/v2 with hours
6. save_project            → persist everything to the database

Monterail's preferred stack: Next.js 14, TypeScript, Supabase, Vercel, Tailwind CSS, shadcn/ui, Prisma.
For AI features: Anthropic Claude API or OpenAI API.
For automations: n8n or Make.com.

Be specific, practical, and production-focused. After all tools complete, write a crisp 2-sentence project summary."""

    messages = [{
        "role": "user",
        "content": (
            f"Project name: {project_name}\n"
            f"Brief: {brief}\n"
            f"Constraints: {constraints or 'None specified'}\n\n"
            "Run the full kickstart pipeline for this project."
        )
    }]

    steps      = []
    tool_store = {}
    t0         = time.time()
    max_iter   = 20
    iteration  = 0
    final_text = ""

    while iteration < max_iter:
        iteration += 1

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        texts = [b.text for b in response.content if b.type == "text"]
        if texts:
            final_text = "\n".join(texts).strip()

        tool_uses = [b for b in response.content if b.type == "tool_use"]

        if tool_uses:
            messages.append({"role": "assistant", "content": response.content})
            results = []
            for tu in tool_uses:
                raw    = dispatch(tu.name, tu.input)
                result = json.loads(raw)
                tool_store[tu.name] = {"input": tu.input, "output": result}
                steps.append({"tool": tu.name, "input": tu.input, "output": result})
                results.append({
                    "type":        "tool_result",
                    "tool_use_id": tu.id,
                    "content":     raw,
                })
            messages.append({"role": "user", "content": results})

        if response.stop_reason == "end_turn":
            break

    elapsed = round((time.time() - t0) * 1000)

    # Extract save_project result
    saved = tool_store.get("save_project", {}).get("output", {})

    # Parse key outputs from tool inputs
    parsed = _extract_outputs(messages, tool_store)
    parsed.update({
        "project_id":  saved.get("project_id"),
        "elapsed_ms":  elapsed,
        "iterations":  iteration,
        "steps":       steps,
        "final_text":  final_text,
        "brief":       brief,
        "project_name": project_name,
    })
    return parsed


def _extract_outputs(messages, tool_store):
    out = {
        "project_type":  "",
        "tech_stack":    {},
        "structure":     "",
        "tech_spec":     "",
        "timeline":      [],
        "complexity":    "Medium",
        "estimated_hours": 0,
    }
    save_in = tool_store.get("save_project", {}).get("input", {})
    if save_in:
        for k in out:
            if k in save_in:
                val = save_in[k]
                if k in ("tech_stack",) and isinstance(val, str):
                    try: val = json.loads(val)
                    except: pass
                if k == "timeline" and isinstance(val, str):
                    try: val = json.loads(val)
                    except: pass
                out[k] = val

    # Also try to find tech spec text from create_tech_spec tool input
    spec_in = tool_store.get("create_tech_spec", {}).get("input", {})
    if not out["tech_spec"] and spec_in:
        out["tech_spec"] = spec_in.get("requirements", "")

    # Scrape tech_spec from assistant messages
    for msg in reversed(messages):
        if msg.get("role") != "assistant": continue
        content = msg.get("content", "")
        if isinstance(content, list):
            text = " ".join(getattr(b,"text","") for b in content if hasattr(b,"text"))
        else:
            text = str(content)
        if "## Architecture" in text and not out["tech_spec"]:
            out["tech_spec"] = text[:8000]
            break

    return out


# ── Routes ─────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory('frontend/dist', 'index.html')

@app.route("/<path:path>")
def static_files(path):
    try:
        return send_from_directory('frontend/dist', path)
    except Exception:
        return send_from_directory('frontend/dist', 'index.html')


@app.route("/api/kickstart", methods=["POST"])
def kickstart():
    d = request.get_json()
    api_key      = d.get("apiKey", "").strip()
    brief        = d.get("brief", "").strip()
    project_name = d.get("projectName", "Untitled Project").strip()
    constraints  = d.get("constraints", "").strip()

    if not api_key:    return jsonify({"error": "API key required"}), 400
    if not brief:      return jsonify({"error": "Project brief required"}), 400
    if len(brief) < 30:return jsonify({"error": "Brief too short — add more detail"}), 400

    try:
        result = run_kickstart_agent(brief, project_name, constraints, api_key)
        return jsonify(result)
    except anthropic.AuthenticationError:
        return jsonify({"error": "Invalid API key"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects")
def list_projects():
    conn = get_db()
    rows = conn.execute(
        "SELECT id,name,project_type,complexity,estimated_hours,status,created_at "
        "FROM projects ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/projects/<pid>")
def get_project(pid):
    conn = get_db()
    p = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    conn.close()
    if not p: return jsonify({"error": "Not found"}), 404
    data = dict(p)
    for field in ("tech_stack", "structure", "timeline"):
        if data.get(field):
            try: data[field] = json.loads(data[field])
            except: pass
    return jsonify(data)


@app.route("/api/stats")
def stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
    types = conn.execute(
        "SELECT project_type, COUNT(*) as n FROM projects GROUP BY project_type"
    ).fetchall()
    avg_h = conn.execute(
        "SELECT ROUND(AVG(estimated_hours)) FROM projects"
    ).fetchone()[0] or 0
    conn.close()
    return jsonify({"total": total, "by_type": [dict(r) for r in types], "avg_hours": avg_h})


@app.route("/api/status")
def status():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    init_db()
    print("🚀 Project Kickstarter Agent running on http://localhost:5000")
    app.run(debug=False, port=5000)
