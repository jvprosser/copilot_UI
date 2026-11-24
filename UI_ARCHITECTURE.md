# UI_ARCHITECTURE.md & Rules of Engagement

## 1. Core Component Philosophy
- **Data-Driven Rendering:** The UI contains **zero** domain-specific logic. It does not know what "Claims", "Underwriting", or "Retirement" are. It renders strictly from the `layout`, `routing_directives`, `lane_messages`, `checks`, `session_graph`, `view_data`, and `actions` returned by the backend.
- **Fixed Split-Pane Workspace:** The backend emits a fixed `split_pane` layout (`widgets: ["chat_feed", "routing_summary_panel"]`, `focus: "chat_feed"`).
  - **Left Pane (`chat_feed`):**
    - **Top-Left Intake & Context Switcher Panel:** Compact command bar with `pack_id` selector (`claims`, `underwriting`, `retirement_distributions`, `retirement_rollovers`), optional `dialect` override (`impala` | `trino`), entity discovery input, a 2-line clamped response strip, and a **CoT** dialog trigger button. Submitting here intentionally omits `entity_id` and `lane` to force `run_orchestrator` entity discovery and context switching at any time.
    - **Parallel `LanePanel` Grid:** Renders one self-contained `LanePanel` card per active directive in `content.routing_directives` (single full-width panel for a `blocking: true` gate; responsive grid for concurrent `blocking: false` lanes). Each card has its own directive header (active probe + `next_step`), scrollable isolated lane transcript, conditional action bar, and independent text input.
  - **Right Pane (`routing_summary_panel`):** Domain-agnostic inspector for active `routing_directives`, playbook `checks` (including `skipped_reason`), pre-fetched `view_data`, and `session_graph`.
  - **Global CoT Dialog:** Clicking any **CoT** button opens a modal displaying `meta.debug_cot`, `meta.run_id`, `meta.dialect`, and `meta.active_lane`.
- **Multi-Lane Turn Lifecycle:**
  - **Turn 1 / Context Switch (Entity Discovery):** Posts `{ user_text, pack_id }` (omitting `dialect` unless overridden so the backend uses the pack manifest default, and omitting `entity_id` and `lane`).
  - **Turn 2+ (Lane-Targeted Conversation):** Posts `{ user_text, pack_id, entity_id, lane }`.
  - **Blocking Gates vs. Parallel Lanes:** A `blocking: true` directive preempts all other lanes. When `blocking: false`, multiple lane panels can be worked concurrently; HTTP requests are serialized via `isSubmitting` to avoid race conditions during post-turn `patch_session_field` playbook re-evaluations.
- **State Synchronization:** The Zustand store caches per-lane transcripts (`transcriptsByLane[lane]`) and drafts (`draftsByLane[lane]`), atomically resets them when `meta.entity_id` or `pack_id` changes, and preserves existing lane cards if an intake query returns a missing-id envelope (`entity_id: null`).

## 2. Cloudera AI Application Deployment (`serve.py`)
- **Static Export Build:** Because the production app is hosted as a Cloudera AI Application served by Python's `SimpleHTTPRequestHandler` (`serve.py`), Next.js must use `output: "export"` in `next.config.ts` (no Node.js runtime or Next.js API routes in production).
- **Entrypoint & Port Binding:** Configure the Cloudera AI Application **Script** field to `serve.py`. It binds `ThreadingHTTPServer` to `127.0.0.1` on `CDSW_APP_PORT` (default `8080`) and serves the static build directory.
- **Runtime API Base Resolution (`/config.js`):**
  - Set `PROCESS_AGENT_API_URL` in the Cloudera AI Application environment to the backend origin with no trailing slash (e.g., `https://process-agent.<workspace-domain>`). Leave it empty to keep requests on the same origin.
  - `serve.py` intercepts `GET /config.js` (`Cache-Control: no-store`) and dynamically returns `export const API_BASE = "<PROCESS_AGENT_API_URL>";`.
  - `src/lib/api/client.ts` resolves the API base URL at runtime from `/config.js` first, falling back to `process.env.NEXT_PUBLIC_API_BASE_URL` for local `next dev` workflows, and finally `""` (same origin).

## 3. AI-Optimized Codebase Rules
- **No Barrel Files:** Never create `index.ts` re-export files. Always use explicit, direct file imports (e.g., `import { ChatResponse } from "@/types/api-contract"`).
- **Strict Typing over Inference:** Export explicit TypeScript `interface` definitions for every API payload, component prop, and state object. Never use `any` (use `unknown` or `Record<string, unknown>` for dynamic graph nodes).
- **Single-Responsibility Files:** Keep components small and focused. Co-locate component-specific prop interfaces and Tailwind styling inside the component file.
- **Root Anchor Documentation:** Keep this file updated at the repository root so contributors and AI assistants can attach it as context.

## 4. Directory Map
- `serve.py` — Cloudera AI Application static file server and runtime `/config.js` endpoint.
- `src/types/api-contract.ts` — Phase 25.2 strict TypeScript interfaces for `/api/v1/chat` and `/api/v1/action`.
- `src/lib/api/client.ts` — Typed fetch client resolving `API_BASE` from `/config.js` (runtime) with `NEXT_PUBLIC_API_BASE_URL` fallback (local dev).
- `src/store/sessionStore.ts` — Zustand session store managing pack/dialect config, context switching, per-lane transcripts/drafts, CoT modal state, and action toasts.
- `src/components/layout/` — `SplitPane` layout wrapper and `CotDialog` modal.
- `src/components/widgets/` — `IntakePanel`, `LanePanel`, `ChatFeed`, `RoutingSummaryPanel`, and `WidgetRegistry`.

## 5. API Endpoints
- `POST ${API_BASE}/api/v1/chat` — Evaluates playbooks and returns `ChatResponse`.
- `POST ${API_BASE}/api/v1/action` — Executes explicit `tool_invocations` (e.g., `save_entry_artifact`) without re-evaluating the playbook.
