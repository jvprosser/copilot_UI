### 📋 Phase 4: Implementation Specifications for Cursor/Grok

**Context for AI Assistant:**
You are implementing Phase 4 on top of our existing Next.js / TypeScript / Tailwind workspace.

* **Zero domain logic:** Render strictly from `layout`, `content`, and `actions`.
* **No barrel files (`index.ts`).** Use explicit, direct imports.
* **Zero `any` types.** Use `unknown` or `Record<string, unknown>`.
* **One component per file.** Co-locate prop interfaces and Tailwind classes inside each component.

Paste this short **Phase 4 Final Patch** into Cursor right below the Phase 4 brief so Grok handles all three constraints cleanly:

---

### 📋 Phase 4 Final Clarifications (Apply Before Implementing)

1. **Directives and checks live on the lane card, not the right pane.**
* `CheckItem` may include `lane?: string | null`. The backend does not send `lane` yet. Do not infer a lane by parsing `probe_id`.
* Each `LanePanel` shows that directive's fields and the checks for `directive.lane`.
* `SplitPane` and `TileGrid` drop `"active_directives"` and `"rule_probes"` before rendering. Do not mount `ActiveDirectivesPanel` or `RuleProbesPanel`.
* `RoutingSummaryPanel` keeps `routing_summary`, `view_data`, and the empty state when `activeContent === null`. It does not render directives or playbook checks.
* Read `const widgets = useSessionStore((s) => s.activeLayout?.widgets ?? EMPTY_WIDGETS);` with a module-level `const EMPTY_WIDGETS: string[] = [];`. When `!widgets.includes("graph_explorer")`, render `<GraphExplorerPanel/>` inside `RoutingSummaryPanel` so a single-lane `split_pane` still shows the session graph.


2. **`DataEntryPanel.tsx` — Stable Empty Array in Zustand Selector:**
* Declare `const EMPTY_PENDING_FORMS: PendingForm[] = [];` at module scope.
* Select `const pendingForms = useSessionStore((s) => s.activeActions?.pending_forms ?? EMPTY_PENDING_FORMS);` so Zustand never returns a new `[]` reference and triggers an infinite render loop.


3. **`TileGrid.tsx` — Scroll on `focus` Change Only:**
* Track the tile element with a `ref` and call `ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })` inside a `useEffect` whose dependency array is `[focus]` (guarding with `if (focus === widgetKey)`). Do **not** run `scrollIntoView` on every render.



---

With those three constraints in place, Phase 4 is ready for Cursor/Grok to implement.

---

#### Deliverable 1: Reconciled API Contract (`src/types/api-contract.ts`)

Replace `src/types/api-contract.ts` with this exact file (preserving `Chat*` names, `ToolInvocation[]`, `debug_cot: string[]`, and `view_data: Record<string, unknown>`, while adding Phase 4 form and layout types; no `content.artifact`):

```typescript
/**
 * src/types/api-contract.ts
 * Strict TypeScript definitions aligned with the Python/Iceberg Rules Engine API Contract.
 * Zero `any` types permitted.
 */

export type SqlDialect = "impala" | "trino";
export type LayoutTemplate = "split_pane" | "tile_grid";
export type FormFieldType = "text" | "number" | "boolean" | "date" | "select";

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
  template: LayoutTemplate;
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
  form: string | null;
}

export interface LaneMessage {
  role: "user" | "assistant";
  agent_role: string | null;
  lane: string;
  text: string;
  timestamp: string;
}

export type CheckStatus = "assigned" | "did_not_apply" | "skipped";

export interface CheckItem {
  probe_id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  skipped_reason?: string | null;
  lane?: string | null;
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

export interface FormFieldSchema {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[] | null;
}

export interface PendingForm {
  form_id: string;
  lane: string;
  title: string;
  submit_intent: string;
  fields: FormFieldSchema[];
}

export interface ChatActions {
  quick_replies: string[];
  tool_invocations: ToolInvocation[];
  pending_forms: PendingForm[];
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
  run_id?: string | null;
  entity_id?: string | null;
  lane?: string | null;
  dialect?: SqlDialect | null;
  payload: Record<string, unknown>;
}

export interface ActionResponse {
  status: string;
  artifact: string;
  chat_response?: ChatResponse | null;
}

```

---

#### Deliverable 2: API Client (`src/lib/api/client.ts`)

* Update `postAction(payload: ActionRequest): Promise<ActionResponse>` to strip `undefined` and `null` optional fields (`run_id`, `entity_id`, `lane`, `dialect`) before serializing, matching `buildChatBody`.

---

#### Deliverable 3: Session Store (`src/store/sessionStore.ts`)

* Add `submitFormAction(form: PendingForm, values: Record<string, unknown>): Promise<void>`:
1. Respects the `isSubmitting` drop-if-in-flight guard and `try / catch / finally` lifecycle.
2. Always includes `form_id: form.form_id` inside `payload`:
```typescript
payload: { ...values, form_id: form.form_id }

```


3. Calls `postAction` with `{ intent: form.submit_intent, pack_id: get().packId, run_id: activeMeta?.run_id, entity_id: activeMeta?.entity_id, lane: form.lane, dialect: dialectOverride, payload }`.
4. **Hydrate `response.chat_response`:** If `response.chat_response` is non-null, apply it using the exact same active/inactive-lane hydration helper as `submitLaneMessage` (updating `activeMeta`, `activeLayout`, `activeContent`, `activeActions`, `transcriptsByLane`, `cotByLane`, and clearing `laneNotice`).
5. **Toast:** Set `actionToast` to `status: "success"` with message `response.artifact ? \`Saved ${response.artifact}` : `Submitted ${form.title}``(so an empty`artifact: ""`does not display`"Saved "`).



---

#### Deliverable 4: Decomposed Inspector Widgets & Single Form Surface

The backend may still emit `active_directives` and `rule_probes`. Drop both keys before rendering. Their content belongs on each `LanePanel`. The widgets that mount are `chat_feed`, `routing_summary_panel`, `data_entry_panel`, and `graph_explorer`.

1. **`src/components/widgets/DynamicFormCard.tsx`**
* Props: `{ form: PendingForm; disabled: boolean; onSubmit: (values: Record<string, unknown>) => Promise<void> }`.
* **Strict Field Initialization & Validation (do NOT use `if (!value)`):**
* `boolean` (`<input type="checkbox">`): Initialize to `false`. Always submit `true` or `false`. Never fail a `required` check on `false`.
* `number` (`<input type="number">`): Keep raw string in local state while typing; on submit, validate that a `required` field is non-empty and `!Number.isNaN(Number(raw))`, and submit the parsed `Number` (so `0` is valid and submitted as `0`).
* `text` / `date` / `select`: Validate `raw.trim().length > 0` when `required` is `true`.


* Disable all inputs and the submit button while `disabled` (`isSubmitting`) is `true`.


2. **`src/components/widgets/DataEntryPanel.tsx`** (Single form surface — do **not** also render forms inside `LanePanel`)
* Reads `activeActions?.pending_forms ?? []`, `isSubmitting`, and `submitFormAction` from `useSessionStore`.
* Renders one `DynamicFormCard` per item in `pending_forms` (showing `form.lane` badge and `form.title`).
* Renders a lightweight empty state if `pending_forms` is empty.


3. **`src/components/widgets/LanePanel.tsx`**
* Declare `const EMPTY_CHECKS: CheckItem[] = [];` at module scope and select `const allChecks = useSessionStore((s) => s.activeContent?.checks ?? EMPTY_CHECKS);`.
* **Active directive** (card header or a collapsible drawer): show this card's `directive` fields: `lane`, `agent_role`, `next_step`, `routing_reason`, `blocking`, `terminal`, `write`, and `form` when it is non-null.
* **Playbook checks** (collapsible drawer above the transcript):
* If any check in `allChecks` has a non-null `lane`, render `allChecks.filter((c) => c.lane === directive.lane)`.
* If no check carries `lane` yet, render `allChecks` so the checks stay visible until the backend sends `lane`.
* Render `status === "assigned"` checks first and highlighted. Collapse `did_not_apply` and `skipped` checks into a toggleable sub-list.
* Each check displays `probe_id`, `title`, `detail`, `status`, and `skipped_reason` when present.


4. **`src/components/widgets/GraphExplorerPanel.tsx`**
* Iterates `Object.entries(activeContent.session_graph)` generically; formats objects/arrays with `JSON.stringify(val, null, 2)` in `<pre>` blocks and primitives inline.


5. **`src/components/widgets/RoutingSummaryPanel.tsx`**
* Render `activeContent.routing_summary` and `activeContent.view_data` (formatted JSON `<pre>`), plus the empty state when `activeContent === null`.
* Do not render `<ActiveDirectivesPanel/>` or playbook checks.
* When `!widgets.includes("graph_explorer")`, render `<GraphExplorerPanel/>` here.


6. **`src/components/widgets/WidgetRegistry.tsx`**
* Maps the keys that still render:
* `"chat_feed"` → `ChatFeed`
* `"routing_summary_panel"` → `RoutingSummaryPanel`
* `"data_entry_panel"` → `DataEntryPanel`
* `"graph_explorer"` → `GraphExplorerPanel`
* Do not mount `ActiveDirectivesPanel` or `RuleProbesPanel`. `SplitPane` and `TileGrid` drop `"active_directives"` and `"rule_probes"` before calling `WidgetRenderer`.





---

#### Deliverable 5: Layouts (`SplitPane`, `TileGrid`, & `page.tsx`)

1. **`src/components/layout/SplitPane.tsx`**
* Reads `widgets = activeLayout?.widgets ?? ["chat_feed", "routing_summary_panel"]`.
* Left pane (`w-3/5 h-full overflow-hidden flex flex-col`): Renders `widgets[0]`.
* Right pane (`w-2/5 h-full overflow-y-auto border-l p-4 space-y-4`): Renders `widgets.slice(1)` after removing `"active_directives"` and `"rule_probes"`. A single-lane list of `["chat_feed", "routing_summary_panel", "rule_probes"]` therefore shows only `routing_summary_panel` on the right. Directives and checks are on the lane card. The session graph still appears through the `RoutingSummaryPanel` fallback.


2. **`src/components/layout/TileGrid.tsx`**
* Render `activeLayout.widgets` after removing `"active_directives"` and `"rule_probes"`, in a responsive 2-column grid (`grid-cols-1 lg:grid-cols-2 gap-4 min-h-screen p-4`).
* **Bounded Tile Height:** Every tile wrapper has a fixed bounded height (`h-[38rem] flex flex-col overflow-hidden rounded-lg border bg-white`) so `ChatFeed` keeps its pinned `IntakePanel` and scrollable lane transcripts without collapsing.
* **Focus Handling:** When `widgetKey === activeLayout?.focus`, apply a focus ring (`ring-2 ring-blue-500`) and call `ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })` when `activeLayout.focus` changes (e.g., scrolling `data_entry_panel` into view when a form appears).


3. **`src/app/page.tsx`**
* Switches on `activeLayout?.template`: renders `<TileGrid/>` when `"tile_grid"`, otherwise `<SplitPane/>`.
* Keeps `CotDialog` and the dismissible `actionToast` (`clearActionToast`).



---

#### Phase 4 Verification Checklist

* [ ] `npx tsc --noEmit` and `npm run build` pass with zero errors and zero `any` types.
* [ ] Each `LanePanel` shows its directive fields (`lane`, `agent_role`, `next_step`, `routing_reason`, `blocking`, `terminal`, `write`, and `form` when set) and its collapsible playbook checks. Assigned checks are highlighted. Did-not-apply and skipped checks are behind a toggle.
* [ ] `SplitPane` and `TileGrid` never render `ActiveDirectivesPanel` or `RuleProbesPanel`.
* [ ] A single-lane `split_pane` still shows the session graph on the right, because `graph_explorer` is absent from that widget list and `RoutingSummaryPanel` renders `GraphExplorerPanel`.
* [ ] A `tile_grid` turn renders the remaining widgets (`chat_feed`, `routing_summary_panel`, `data_entry_panel` when a form exists, `graph_explorer`) with bounded tile heights, and scrolls `data_entry_panel` into view when `layout.focus === "data_entry_panel"`.
* [ ] Submitting a form with `false` (boolean) and `0` (number) succeeds, sends `form_id` in `payload`, hydrates `chat_response`, and shows a clean toast.