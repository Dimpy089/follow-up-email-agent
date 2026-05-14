# Finance Credit Follow-Up Email Agent

An AI-powered agent that automatically generates personalized follow-up emails for overdue invoices, escalating tone progressively based on the number of days overdue — reducing DSO while preserving client relationships.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Agent Architecture](#agent-architecture)
- [Tech Stack & Decision Log](#tech-stack--decision-log)
- [Tone Escalation Matrix](#tone-escalation-matrix)
- [Security Mitigations](#security-mitigations)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Future Improvements](#future-improvements)

---

## Project Overview

Finance teams spend significant time manually chasing overdue payments. This process is inconsistent in tone and timing, risks client relationships, and increases Days Sales Outstanding (DSO).

This agent solves that by:

- Ingesting invoice data from CSV automatically
- Classifying each overdue invoice into an escalation stage (Stage 1–4 or Legal Flag)
- Using an LLM to generate personalized, professional emails at the correct tone level
- Logging every generated email with timestamp, tone, and status for full audit coverage
- Scheduling daily automated checks via cron
- Flagging severely overdue (30+ days) accounts for manual legal review instead of continuing auto-emails
- Providing a React dashboard for finance teams to monitor queue, trigger generation, and review logs

---

## Agent Architecture

```
Frontend (React + Vite)
         │
         ▼
Backend API (Express.js)
         │
         ├── CSV Invoice Reader       →  reads invoices.csv
         │
         ├── Escalation Engine        →  maps overdue days to stage + tone
         │
         ├── AI Email Generator       →  calls OpenRouter LLM
         │
         ├── Audit Logger             →  writes to logs/emailLogs.json
         │
         ├── Scheduler (node-cron)    →  runs daily at 10:00 AM
         |
         └── Invoice Agent Pipeline   →  sequential tool execution
           │
           ├── Step 1: read_invoices
           ├── Step 2: calculate_stage
           ├── Step 3: generate_email
           └── Step 4: save_logs
```

### Invoice Agent Pipeline flow

```
Agent receives task
      │
      ▼
Step 1 — Read all invoices from CSV
      │
      ▼
Step 2 — Calculate days overdue + escalation stage for each
      │
      ▼
Step 3 — Generate personalised email (skip if not overdue or ESCALATED)
      │
      ▼
Step 4 — Save to audit log
      │
      ▼
Return summary of emails generated
```

The agent uses a **ReAct (Reason + Act)** loop — instead of hardcoded procedural steps, the LLM dynamically decides which tool to call next based on observations, making it adaptable to varying invoice states.

---

## Tech Stack & Decision Log

### LLM — GPT-4o-mini via OpenRouter

| Field    | Detail                                      |
|----------|---------------------------------------------|
| Provider | OpenRouter (`https://openrouter.ai/api/v1`) |
| Model    | `openai/gpt-4o-mini`                        |
| Endpoint | `/chat/completions`                         |
| Why this model | GPT-4o-mini offers GPT-4 class instruction following at a fraction of the cost. Strong JSON output reliability makes it ideal for structured email generation. Chosen over GPT-4o (unnecessarily expensive for this task) and Llama 3 (weaker JSON consistency in testing). |
| Why OpenRouter | Single API key provides access to multiple LLM providers — ideal for prototyping without committing to direct OpenAI billing. Easy model switching with no code changes. |

## Agent Framework & Architecture

| Field | Detail |
|---|---|
| Framework | LangChain (tool abstraction and orchestration utilities) |
| Architecture | Deterministic sequential pipeline |
| Pipeline Flow | Read invoices → Calculate escalation stage → Generate AI email → Save audit logs |
| Tool Layer | LangChain DynamicTool abstractions used for modular workflow design |
| LLM Usage | OpenRouter LLM used for personalized finance email generation |
| Why LangChain | Modular tool abstraction, clean workflow separation, reusable pipeline components, simplified LLM integration |
| Why Sequential Pipeline | Predictable execution flow, easier debugging, deterministic outputs, improved auditability, safer production behavior |
| Agentic Design Decision | Full autonomous ReAct execution was intentionally avoided in the final implementation to maintain reliability, traceability, and controlled business logic execution |

### Scheduling — node-cron

Runs the full invoice check + email generation workflow daily at **10:00 AM** automatically. No manual trigger needed in production.

### Storage

| Layer       | Technology         | Reason                                              |
|-------------|-------------------|-----------------------------------------------------|
| Invoice data | CSV (`invoices.csv`) | Lightweight, portable, no DB setup required for prototype |
| Audit logs  | JSON (`emailLogs.json`) | Human-readable, easy to query for dashboard, sufficient for prototype scale |

### Frontend — React + Vite + Recharts

Dashboard provides: invoice queue view, email generation trigger, agent trigger, audit log viewer, escalation analytics (PieChart + BarChart).

---

## Prompt Design

### System Prompt

```
You are a professional finance collections assistant.
Generate follow-up emails that match the provided tone and stage exactly.
Return ONLY valid JSON. No extra text, no markdown, no explanation.
```

### User Prompt Structure

```
Client: {clientName}
Invoice: {invoiceNumber}
Amount: {amount}
Due Date: {dueDate}
Days Overdue: {daysOverdue}
Stage: {stage}
Tone: {tone}

Return JSON: { "subject": "...", "body": "...", "tone": "...", "stage": "..." }
```

**Guardrails applied:**
- `Return ONLY valid JSON` prevents markdown fences and prose responses
- All invoice fields injected from data source — LLM cannot fabricate client details
- `JSON.parse()` validation on every response with structured fallback on failure
- System prompt enforces professional finance persona to reduce off-topic outputs

---

## Tone Escalation Matrix

| Stage      | Trigger          | Tone              | Key Message                              | CTA                        |
|------------|-----------------|-------------------|------------------------------------------|----------------------------|
| Stage 1    | 1–7 days overdue  | Warm & Friendly   | Gentle reminder, assume oversight        | Pay now link / bank details |
| Stage 2    | 8–14 days overdue | Polite but Firm   | Payment still pending; request confirmation | Confirm payment date      |
| Stage 3    | 15–21 days overdue| Formal & Serious  | Escalating concern; mention credit impact | Respond within 48 hrs     |
| Stage 4    | 22–30 days overdue| Stern & Urgent    | Final reminder before escalation         | Pay immediately or call us |
| Escalated  | 30+ days overdue  | 🚩 Legal Flag     | No auto-email — flagged for human review | Assigned to finance manager|

---

## Security Mitigations

| Risk | Mitigation Applied |
|------|--------------------|
| **API Key Exposure** | All keys stored in `.env` via `dotenv`. `.env` added to `.gitignore`. A `.env.example` with placeholder values is committed instead. Keys never hardcoded in source. |
| **Prompt Injection** | Invoice fields are injected into a structured prompt template. System prompt instructs the model to return only JSON, limiting the blast radius of any injected content in invoice fields. |
| **Hallucination Risk** | Structured JSON output enforced via system prompt. Every response is validated with `JSON.parse()`. Fallback object returned on parse failure — no partial/hallucinated data reaches logs or frontend. |
| **Unauthorised Access** | API key middleware implemented on `/agent-generate` and `/generate-email` endpoints. Requests without a valid `x-api-key` header are rejected with `401 Unauthorised`. Key stored in `.env` on both backend and frontend — never hardcoded. |
| **Rate Limiting** | `express-rate-limit` implemented on `/generate-email` and `/agent-generate` — capped at 20 requests per 15-minute window. Prevents abuse and protects OpenRouter API quota. |
| **PII in Logs** | Client names and email content are stored in `emailLogs.json`. For production: PII fields should be masked or encrypted at rest. |
| **Input Validation** | ⚠️ CSV values are currently trusted directly. Planned: schema validation on ingested rows (date formats, amount ranges, email format). |
| **Email Spoofing (Task 2)** | Currently in dry-run/mock mode — no real emails sent. For production SMTP: SPF/DKIM/DMARC records required on sender domain; verified sender address enforced by email provider. |

---

## Setup Instructions

### Prerequisites

- Node.js v18+
- npm
- OpenRouter API key ([openrouter.ai](https://openrouter.ai))

---

### Backend

```bash
cd backend
npm install
```

Create your `.env` file (see [Environment Variables](#environment-variables) below), then:

```bash
npm start
```

Backend runs at `http://localhost:3000`

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

### Invoice Data

Edit `backend/invoices.csv` to add your invoice records:

```csv
invoiceNumber,clientName,amount,dueDate,contactEmail,followUpCount
INV001,Rajesh Kumar,45000,2025-04-20,rajesh@example.com,0
INV002,Priya Sharma,28000,2025-04-10,priya@example.com,1
```

---

## Environment Variables

Create a `.env` file inside `backend/`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
INTERNAL_API_KEY=your_secret_api_key_here
PORT=3000
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_KEY=your_secret_api_key_here
```

> The `INTERNAL_API_KEY` and `VITE_API_KEY` must match — this is the shared secret used to authenticate frontend requests to protected endpoints.

A `.env.example` is included in the repo with placeholder values.

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | Health check | No |
| `GET` | `/invoices` | Returns all invoices enriched with overdue days, stage, and tone | No |
| `GET` | `/generate-email` | Generates AI emails for all overdue invoices and saves audit logs | Yes |
| `POST` | `/send-email` | Mock sends email and updates log status | No |
| `GET` | `/logs` | Returns full audit log from `emailLogs.json` | No |
| `GET` | `/agent-generate` | Triggers LangChain ReAct agent to orchestrate full workflow autonomously | Yes |

---

## Project Structure

```
Follow-up Email Agent/
│
├── backend/
│   ├── agent/
│   │   └── invoiceAgent.js        # LangChain ReAct agent with tools
│   │
│   ├── services/
│   │   ├── aiServices.js          # OpenRouter LLM integration
│   │   ├── escalationEngine.js    # Overdue days → stage + tone logic
│   │   ├── csvServices.js         # CSV reader
│   │   ├── logService.js          # Audit log writer
│   │   └── schedular.js           # node-cron daily scheduler
│   │
│   ├── logs/
│   │   └── emailLogs.json         # Audit trail
│   │
│   ├── invoices.csv               # Invoice data source
│   ├── server.js                  # Express API entry point
│   ├── .env                       # Secret keys (not committed)
│   ├── .env.example               # Placeholder env template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main dashboard
│   │   ├── LogsPage.jsx           # Audit log viewer
│   │   ├── App.css
│   │   └── main.jsx
│   │
│   ├── .env                       # Frontend env vars (not committed)
│   ├── .env.example               # Placeholder env template
│   ├── package.json
│   └── vite.config.js
│
└── package.json
```

---

## Future Improvements

- **Real email sending** — integrate SendGrid or Mailgun with verified sender domain + SPF/DKIM/DMARC
- **Database migration** — replace CSV + JSON with PostgreSQL or MongoDB for scale
- **JWT Authentication** — replace API key auth with JWT middleware and role-based access for finance managers
- **Input validation** — schema validation on CSV ingestion (date formats, amounts, emails)
- **Async queue** — BullMQ + Redis for non-blocking email generation at scale
- **PII masking** — encrypt or mask client names and email content in audit logs
- **Monitoring** — Winston structured logging + observability dashboard
- **Prompt injection hardening** — sanitize invoice field values before injecting into prompts
- **Retry logic** — exponential backoff on LLM API failures
