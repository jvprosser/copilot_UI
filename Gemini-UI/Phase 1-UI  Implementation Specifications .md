### 📋 Phase 1 (Revised): Implementation Specifications for Cursor/Grok

**Context for AI Assistant:**
You are setting up Phase 1 inside an **existing, non-empty repository** that already contains `serve.py`, `index.html`, `src/types/api-contract.ts`, and `Gemini-UI/UI_ARCHITECTURE.md`.

* **Do NOT run `create-next-app` in-place** (it will fail or overwrite existing files). Initialize Next.js non-destructively.
* **No barrel files (`index.ts`).** Use explicit, direct imports.
* **Zero `any` types.** Use `unknown` or `Record<string, unknown>`.
* **Static Export Only:** Production is served by `serve.py` (`SimpleHTTPRequestHandler`), not a Node.js server. Do not add Next.js API routes.



---

#### Deliverable 1: Non-Destructive Next.js Setup, `.gitignore`, & `.env.example`

1. **Initialize Next.js in-place** (without touching `serve.py` or `src/types/api-contract.ts`):
* Create/update `package.json` with `next`, `react`, `react-dom`, `zustand` and devDependencies (`typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`).
* Include the standard Next.js scripts so `npm run build` and `npm run lint` work out of the box:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint"
  }
}
```
* Add standard `tsconfig.json` with `@/*` mapped to `./src/*`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, and a minimal placeholder `src/app/page.tsx`.
* Do not create empty `src/lib/api/`, `src/store/`, or `src/components/` directories in Phase 1. Those directories are created when their files are added in Phases 2 and 3.


2. **Update `.gitignore**` to ensure all build artifacts and local env files are ignored:
```gitignore
.env
.env.local
node_modules/
.next/
out/

```


3. **Create `.env.example**` (committed) pointing to the backend's default port `8080`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

```


*(Note: `next dev` runs on port `3000` and talks to the backend on `8080`. When testing `serve.py` locally alongside the backend, run `CDSW_APP_PORT=8081 python3 serve.py` to avoid a port `8080` collision.)*

---

#### Deliverable 2: Static Export Config (`next.config.ts`) & `serve.py` Alignment

1. **Create `next.config.ts`:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

```


2. **Update `serve.py`:**
* Keep `127.0.0.1` binding on `CDSW_APP_PORT` (default `8080`) and the `GET /config.js` handler (`Cache-Control: no-store`) exporting `API_BASE` from `PROCESS_AGENT_API_URL`.
* Point `SimpleHTTPRequestHandler` at `STATIC_DIR = ROOT / "out"` instead of `ROOT` so only the static export is served.





---

#### Deliverable 3: Root `UI_ARCHITECTURE.md`

* Extract **only the inner markdown document** from `Gemini-UI/UI_ARCHITECTURE.md` (stripping the outer review text and outer markdown code fence) and write it to `UI_ARCHITECTURE.md` at the repository root.

---

#### Deliverable 4: Final Strict API Contract (`src/types/api-contract.ts`)

Replace `src/types/api-contract.ts` with the interfaces below. Use the backend shapes exactly: `debug_cot: string[]`, `view_data: Record<string, unknown>`, `artifact: string`, and a non-null `routing_summary: RoutingSummary`. Do not widen unions with `| string` or replace those fields with `unknown`.

```typescript
/**
 * src/types/api-contract.ts
 * Strict TypeScript definitions aligned with the Python/Iceberg Rules Engine API Contract.
 * Zero `any` types permitted.
 */

export type SqlDialect = "impala" | "trino";

export interface ChatRequest {
  user_text: string;
  pack_id: string;
  dialect?: SqlDialect | null;
  entity_id?: string | null;
  lane?: string | null;
}

export interface ChatMeta {
  pack_id: string;
  run_id: string;
  entity_id: string | null;
  active_lane: string | null;
  terminal: boolean;
  dialect: SqlDialect;
  debug_cot: string[];
}

export interface ChatLayout {
  template: "split_pane";
  widgets: string[];
  focus: string;
}

export interface RoutingSummary {
  next_step: string | null;
  agent_role: string | null;
  lane: string | null;
  routing_reason: string | null;
}

export interface RoutingDirective {
  directive_id: string;
  lane: string;
  agent_role: string;
  next_step: string;
  routing_reason: string;
  blocking: boolean;
  terminal: boolean;
  write: string | null;
  allowed_tools: string[];
  letter_on_request: boolean;
}

export interface LaneMessage {
  role: "user" | "assistant";
  agent_role: string | null;
  lane: string;
  text: string;
  timestamp: string;
}

export type CheckStatus = "assigned" | "did_not_apply";

export interface CheckItem {
  probe_id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  skipped_reason?: string | null;
}

export interface ChatContent {
  chat_text: string;
  lane_messages: LaneMessage[];
  routing_summary: RoutingSummary;
  routing_directives: RoutingDirective[];
  checks: CheckItem[];
  view_data: Record<string, unknown>;
  session_graph: Record<string, unknown>;
}

export interface ToolInvocation {
  intent: string;
  label?: string;
  payload: Record<string, unknown>;
}

export interface ChatActions {
  quick_replies: string[];
  tool_invocations: ToolInvocation[];
}

export interface ChatResponse {
  meta: ChatMeta;
  layout: ChatLayout;
  content: ChatContent;
  actions: ChatActions;
}

export interface ActionRequest {
  intent: string;
  pack_id: string;
  payload: Record<string, unknown>;
}

export interface ActionResponse {
  status: string;
  artifact: string;
}

```

---

#### Phase 1 Verification Checklist

* [ ] `npx tsc --noEmit` passes with zero errors.
* [ ] `npm run build` generates `out/index.html`.
* [ ] `python3 serve.py` serves `out/index.html` on `[http://127.0.0.1:8080](http://127.0.0.1:8080)` and `GET /config.js` returns `export const API_BASE = "";` (or `PROCESS_AGENT_API_URL`).


* [ ] `git status` confirms `node_modules/`, `.next/`, `out/`, and `.env.local` are ignored.

---

Once Cursor/Grok commits Phase 1 and the build/serve checks pass, let me know and I will generate the **Phase 2 Implementation Specifications**.