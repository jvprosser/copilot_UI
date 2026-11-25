### 📋 Phase 2 (Revised): Implementation Specifications for Cursor/Grok

**Context for AI Assistant:**
You are implementing Phase 2 of the Next.js diagnostic harness. Read `UI_ARCHITECTURE.md` and `src/types/api-contract.ts` before writing code.

* **No barrel files (`index.ts`).** Use explicit, direct imports.
* **Zero `any` types.** Use `unknown` or `Record<string, unknown>`.
* **Single-responsibility files.** Co-locate helper interfaces inside each file.
* **CORS Note:** Ensure the backend sets `PROCESS_AGENT_UI_ORIGIN` to the UI origin (`http://localhost:3000` during `next dev`, or the Cloudera AI UI origin when `PROCESS_AGENT_API_URL` points to a separate backend origin).

---

#### Deliverable 1: Contract & Architecture Doc Patches

1. **`src/types/api-contract.ts`**: Update `CheckStatus` to include `"skipped"`:
```typescript
export type CheckStatus = "assigned" | "did_not_apply" | "skipped";

```


2. **`UI_ARCHITECTURE.md`** (Section 2):
* Change the serialization sentence from *"A second chat or action request waits until the in-flight request finishes"* to: *"A second chat or action request is dropped while an in-flight request is active (requests are not queued)."*
* Update the inactive-lane bullet to state:
* `chat_text` is rendered in a dismissible `laneNotice` banner above the lane grid (not on the removed card).
* Replace `activeMeta`, `activeActions`, `routing_directives`, `checks`, and `routing_summary`.
* Preserve the existing `view_data`, `session_graph`, `activeContent.chat_text`, all cached transcripts, and `draftsByLane[lane]`.







---

#### Deliverable 2: Typed API Client with Runtime `/config.js` & FastAPI Error Parsing

**Location:** `src/lib/api/client.ts`

**Acceptance Criteria:**

1. **Runtime `API_BASE` Resolution (`resolveApiBase`):**
* In the browser, dynamically import `/config.js` once (`import(/* webpackIgnore: true */ "/config.js")`), read `API_BASE`, strip trailing slashes, and cache it.
* Fall back to `process.env.NEXT_PUBLIC_API_BASE_URL` (stripped) during `next dev`, then `""` (same origin).




2. **FastAPI Error Parsing (`ApiClientError`):**
* On non-2xx responses, parse the JSON body safely.
* If `body.detail` is a `string` (FastAPI 400/404), use `body.detail` as `ApiClientError.message`.
* If `body.detail` is an `Array` (FastAPI 422 validation errors), extract `.msg` fields where present and join them into a readable string.
* Otherwise, fall back to `response.statusText || "Request failed"`.


3. **`postChat(payload: ChatRequest): Promise<ChatResponse>`:** Strips `undefined`, `null`, or empty `dialect`, `entity_id`, and `lane` before posting to `${apiBase}/api/v1/chat`.
4. **`postAction(payload: ActionRequest): Promise<ActionResponse>`:** Posts `{ intent, pack_id, payload }` (no `run_id`) to `${apiBase}/api/v1/action`.



**Skeleton Code to Implement:**

```typescript
import {
  ActionRequest,
  ActionResponse,
  ChatRequest,
  ChatResponse,
} from "@/types/api-contract";

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

let cachedApiBase: string | null = null;

function normalizeBase(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim().replace(/\/+$/, "");
}

export async function resolveApiBase(): Promise<string> {
  if (cachedApiBase !== null) return cachedApiBase;

  if (typeof window !== "undefined") {
    try {
      const mod: unknown = await import(/* webpackIgnore: true */ "/config.js");
      if (typeof mod === "object" && mod !== null && "API_BASE" in mod) {
        const runtimeBase = normalizeBase(
          (mod as Record<string, unknown>).API_BASE
        );
        if (runtimeBase !== null) {
          cachedApiBase = runtimeBase;
          return cachedApiBase;
        }
      }
    } catch {
      // /config.js is not present during `next dev`; fall through to env var.
    }
  }

  const envBase = normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL);
  cachedApiBase = envBase ?? "";
  return cachedApiBase;
}

function extractErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item &&
          typeof (item as Record<string, unknown>).msg === "string"
        ) {
          return (item as Record<string, unknown>).msg as string;
        }
        return null;
      })
      .filter((msg): msg is string => msg !== null);
    if (messages.length > 0) return messages.join("; ");
  }
  return fallback;
}

function buildChatBody(payload: ChatRequest): Record<string, string> {
  const body: Record<string, string> = {
    user_text: payload.user_text,
    pack_id: payload.pack_id,
  };
  if (payload.dialect) body.dialect = payload.dialect;
  if (payload.entity_id) body.entity_id = payload.entity_id;
  if (payload.lane) body.lane = payload.lane;
  return body;
}

export async function postChat(payload: ChatRequest): Promise<ChatResponse> {
  // TODO: Resolve apiBase, POST buildChatBody(payload) to `${apiBase}/api/v1/chat`.
  // On non-2xx: safely parse JSON, extract detail (body?.detail ?? body),
  // compute message via extractErrorMessage(detail, res.statusText || "Request failed"),
  // and throw new ApiClientError(message, res.status, detail).
  throw new Error("Not implemented");
}

export async function postAction(
  payload: ActionRequest
): Promise<ActionResponse> {
  // TODO: Resolve apiBase, POST payload to `${apiBase}/api/v1/action`.
  // Same non-2xx ApiClientError handling as postChat.
  throw new Error("Not implemented");
}

```

---

#### Deliverable 3: Multi-Lane Zustand Session Store

**Location:** `src/store/sessionStore.ts`

**Acceptance Criteria:**

1. **Drop-While-In-Flight & `try / catch / finally` Lifecycle:**
* `submitIntake`, `submitLaneMessage`, and `executeToolAction` must immediately `return` if `get().isSubmitting` is `true`.
* Each must set `set({ isSubmitting: true, error: null })` before awaiting the API call, catch errors by setting `set({ error: formatError(err) })` **without** mutating the active envelope, and always release `set({ isSubmitting: false })` inside `finally`.


2. **Pack Change (`setPackId`):** Updates `packId` and clears `activeMeta`, `activeLayout`, `activeContent`, `activeActions`, `intakeSummaryText`, `intakeCot`, `transcriptsByLane`, `cotByLane`, `draftsByLane`, `laneNotice`, `error`, and `actionToast`.
3. **Intake & Context Switch (`submitIntake`) — Strict Branch Order:**
* Calls `postChat({ user_text, pack_id, dialect: dialectOverride })` (omitting `entity_id` and `lane`).
* Always updates `intakeSummaryText` (`response.content.chat_text`) and `intakeCot`.
* **Branch 1 (MUST BE FIRST) — Missing ID (`response.meta.entity_id === null`):** Return after updating `intakeSummaryText` and `intakeCot`. Do NOT clear or overwrite `activeMeta`, `activeLayout`, `activeContent`, `activeActions`, `transcriptsByLane`, `draftsByLane`, `cotByLane`, or `laneNotice`.
* **Branch 2 — New Entity (`response.meta.entity_id !== get().activeMeta?.entity_id`):** Clear `transcriptsByLane`, `draftsByLane`, `cotByLane`, and `laneNotice`. Replace `activeMeta`, `activeLayout`, `activeContent`, `activeActions`. If `response.meta.active_lane` is non-null, store `response.content.lane_messages` in `transcriptsByLane[active_lane]` and CoT in `cotByLane[active_lane]`.
* **Branch 3 — Same Entity (`response.meta.entity_id === get().activeMeta?.entity_id`):** Replace `activeMeta`, `activeLayout`, `activeContent`, `activeActions`. If `response.meta.active_lane` is non-null, replace `transcriptsByLane[active_lane]` with `response.content.lane_messages`, update `cotByLane[active_lane]`, and clear `laneNotice`. Leave all other lanes' cached transcripts untouched.


4. **Lane Follow-Up (`submitLaneMessage`):**
* Requires `activeMeta?.entity_id`. Calls `postChat({ user_text, pack_id, dialect: dialectOverride, entity_id, lane })`.
* **Active Specialist or Blocking Gate (`response.meta.active_lane !== null`):**
* Replace `activeMeta`, `activeLayout`, `activeContent`, and `activeActions`.
* Store `response.content.lane_messages` under `transcriptsByLane[response.meta.active_lane]` and CoT under `cotByLane[response.meta.active_lane]`.
* Clear `draftsByLane[lane]` (the lane the user submitted from, even when preempted by a blocking gate).
* Clear `laneNotice`.


* **Inactive Lane (`response.meta.active_lane === null`):**
* Replace `activeMeta` and `activeActions` from `response` (so stale letter buttons clear and `active_lane` is `null`).
* Patch `activeContent` by replacing **only** `routing_directives`, `checks`, and `routing_summary` from `response.content` — preserving the existing `view_data`, `session_graph`, and `chat_text` on screen.
* Do **NOT** overwrite any lane transcript with the empty `lane_messages`.
* Preserve `draftsByLane[lane]`.
* Set `laneNotice: { lane, text: response.content.chat_text }`.




5. **Tool Action (`executeToolAction`):**
* Calls `postAction({ intent: invocation.intent, pack_id: get().packId, payload: invocation.payload })`.
* Does NOT modify `activeMeta`, `activeLayout`, `activeContent`, or `activeActions`.
* On success, sets `actionToast` with `status: "success"`, `message`, and `artifact: response.artifact`. On error, sets `error` and `actionToast` with `status: "error"`.





**Skeleton Code to Implement:**

```typescript
import { create } from "zustand";
import {
  ChatActions,
  ChatContent,
  ChatLayout,
  ChatMeta,
  ChatResponse,
  LaneMessage,
  SqlDialect,
  ToolInvocation,
} from "@/types/api-contract";
import { ApiClientError, postAction, postChat } from "@/lib/api/client";

export const AVAILABLE_PACKS = [
  "claims",
  "underwriting",
  "retirement_distributions",
  "retirement_rollovers",
] as const;

export type PackId = (typeof AVAILABLE_PACKS)[number];

export interface CotModalData {
  run_id: string;
  dialect: SqlDialect;
  active_lane: string | null;
  debug_cot: string[];
}

export interface LaneNotice {
  lane: string;
  text: string;
}

export interface ActionToast {
  id: string;
  intent: string;
  status: "success" | "error";
  message: string;
  artifact?: string;
}

export interface SessionState {
  packId: PackId;
  dialectOverride: SqlDialect | null;

  activeMeta: ChatMeta | null;
  activeLayout: ChatLayout | null;
  activeContent: ChatContent | null;
  activeActions: ChatActions | null;

  intakeSummaryText: string | null;
  intakeCot: CotModalData | null;

  transcriptsByLane: Record<string, LaneMessage[]>;
  cotByLane: Record<string, CotModalData>;
  draftsByLane: Record<string, string>;
  laneNotice: LaneNotice | null;

  activeCotModalData: CotModalData | null;
  isSubmitting: boolean;
  error: string | null;
  actionToast: ActionToast | null;

  setPackId: (packId: PackId) => void;
  setDialectOverride: (dialect: SqlDialect | null) => void;
  setLaneDraft: (lane: string, text: string) => void;
  submitIntake: (userText: string) => Promise<void>;
  submitLaneMessage: (lane: string, userText: string) => Promise<void>;
  executeToolAction: (invocation: ToolInvocation) => Promise<void>;
  openCotModal: (data: CotModalData) => void;
  closeCotModal: () => void;
  clearLaneNotice: () => void;
  clearActionToast: () => void;
  resetSession: () => void;
}

function buildCotData(response: ChatResponse): CotModalData {
  return {
    run_id: response.meta.run_id,
    dialect: response.meta.dialect,
    active_lane: response.meta.active_lane,
    debug_cot: response.meta.debug_cot,
  };
}

function formatError(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred.";
}

export const useSessionStore = create<SessionState>((set, get) => ({
  packId: "claims",
  dialectOverride: null,
  activeMeta: null,
  activeLayout: null,
  activeContent: null,
  activeActions: null,
  intakeSummaryText: null,
  intakeCot: null,
  transcriptsByLane: {},
  cotByLane: {},
  draftsByLane: {},
  laneNotice: null,
  activeCotModalData: null,
  isSubmitting: false,
  error: null,
  actionToast: null,

  setPackId: (packId) => {
    set({
      packId,
      activeMeta: null,
      activeLayout: null,
      activeContent: null,
      activeActions: null,
      intakeSummaryText: null,
      intakeCot: null,
      transcriptsByLane: {},
      cotByLane: {},
      draftsByLane: {},
      laneNotice: null,
      error: null,
      actionToast: null,
    });
  },

  setDialectOverride: (dialect) => set({ dialectOverride: dialect }),

  setLaneDraft: (lane, text) =>
    set((state) => ({
      draftsByLane: { ...state.draftsByLane, [lane]: text },
    })),

  submitIntake: async (userText) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      // TODO: Implement per Acceptance Criteria 3 (check entity_id === null FIRST)
      throw new Error("Not implemented");
    } catch (err: unknown) {
      set({ error: formatError(err) });
    } finally {
      set({ isSubmitting: false });
    }
  },

  submitLaneMessage: async (lane, userText) => {
    const entityId = get().activeMeta?.entity_id;
    if (get().isSubmitting || !entityId) return;
    set({ isSubmitting: true, error: null });
    try {
      // TODO: Implement per Acceptance Criteria 4
      // Active lane: replace full envelope, update transcriptsByLane[active_lane], clear draftsByLane[lane], clear laneNotice.
      // Inactive lane (active_lane === null): replace activeMeta & activeActions, patch only routing_directives/checks/routing_summary on activeContent, set laneNotice, keep draftsByLane[lane].
      throw new Error("Not implemented");
    } catch (err: unknown) {
      set({ error: formatError(err) });
    } finally {
      set({ isSubmitting: false });
    }
  },

  executeToolAction: async (invocation) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      // TODO: Implement per Acceptance Criteria 5
      throw new Error("Not implemented");
    } catch (err: unknown) {
      const message = formatError(err);
      set({
        error: message,
        actionToast: {
          id: `${Date.now()}`,
          intent: invocation.intent,
          status: "error",
          message,
        },
      });
    } finally {
      set({ isSubmitting: false });
    }
  },

  openCotModal: (data) => set({ activeCotModalData: data }),
  closeCotModal: () => set({ activeCotModalData: null }),
  clearLaneNotice: () => set({ laneNotice: null }),
  clearActionToast: () => set({ actionToast: null }),

  resetSession: () => {
    set({
      activeMeta: null,
      activeLayout: null,
      activeContent: null,
      activeActions: null,
      intakeSummaryText: null,
      intakeCot: null,
      transcriptsByLane: {},
      cotByLane: {},
      draftsByLane: {},
      laneNotice: null,
      activeCotModalData: null,
      error: null,
      actionToast: null,
    });
  },
}));

```

---

#### Phase 2 Verification Checklist

* [ ] `npx tsc --noEmit` passes with zero errors and zero `any` usage.
* [ ] `npm run build` succeeds (confirming `webpackIgnore: true` on `/config.js` works with `output: "export"`).
* [ ] No `index.ts` barrel files exist under `src/`.

