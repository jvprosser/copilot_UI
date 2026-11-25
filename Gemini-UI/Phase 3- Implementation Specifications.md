
### 📋 Phase 3 (Revised): Implementation Specifications for Cursor/Grok

**Context for AI Assistant:**
You are implementing Phase 3 (Workspace UI & Widgets) of the Next.js diagnostic harness. Read `UI_ARCHITECTURE.md`, `src/types/api-contract.ts`, and `src/store/sessionStore.ts` before writing code.

* **No barrel files (`index.ts`).** Use explicit, direct imports.
* **Zero `any` types.** Use `unknown` or `Record<string, unknown>`.
* **One component per file.** Co-locate each component's props interface and Tailwind styling in the same file.
* **Client Components:** Add `"use client";` at the top of interactive components that read `useSessionStore` or manage local UI state.

Every one of those catches is spot-on. They are the exact kind of implicit details that cause an AI coder to render `[object Object]`, drop a second widget in the wrong flex column, or leave a button unwired.

You don't need to rewrite the whole Phase 3 spec—paste this short **Phase 3 Patch** into Cursor right below the revised spec so Grok implements them cleanly on the first pass:

---

### 📋 Phase 3 Final Clarifications (Apply Before Implementing)

1. **`SplitPane.tsx` Widget Placement:**
* Read `const widgets = activeLayout?.widgets ?? ["chat_feed", "routing_summary_panel"];`.
* Render `<WidgetRenderer widgetKey="{widgets[0]}"/>` inside the left pane (`w-3/5`) and `<WidgetRenderer widgetKey="{widgets[1]}"/>` inside the right pane (`w-2/5`) when present.


2. **`RoutingSummaryPanel.tsx` Session Graph Values:**
* When iterating `Object.entries(session_graph)`, format any `object` or `array` value with `JSON.stringify(value, null, 2)` inside a scrollable `<pre>` block (or a small recursive renderer) so nested objects never render as `[object Object]`. Render primitives (`string`, `number`, `boolean`, `null`) cleanly inline.


3. **`IntakePanel.tsx` Pack Options:**
* Render `<option>` elements directly from `AVAILABLE_PACKS` (`import { AVAILABLE_PACKS, PackId } from "@/store/sessionStore"`) so the `PackId` cast on `setPackId` is always valid.


4. **`src/app/page.tsx` Action Toast:**
* Wire the toast's dismiss button to `clearActionToast` from `useSessionStore`.
* Display `actionToast.status` and `actionToast.message` only (do **not** render `actionToast.artifact` separately, as `message` already includes the saved filename).


5. **Additional Verification Check:**
* [ ] A successful intake materializes the `LanePanel` card(s), renders the returned transcript inside the lane card, and opens `CotDialog` with `debug_cot` when clicking **CoT**.



---

With those five points added, Phase 3 is tight and ready for Cursor/Grok to build.
---

#### Deliverable 1: Global CoT Modal

**Location:** `src/components/layout/CotDialog.tsx`

**Acceptance Criteria:**

1. Reads `activeCotModalData` and `closeCotModal` from `useSessionStore`. Returns `null` when `activeCotModalData` is `null`.
2. Displays `run_id`, `dialect`, `active_lane` (or `"none"`), and each string in `debug_cot` inside a scrollable, monospaced `<pre>` list.
3. Includes a **Copy** button (`navigator.clipboard.writeText(debug_cot.join("\n\n"))`) and a **Close** button (plus backdrop click and `Escape` key to close).



---

#### Deliverable 2: Top-Left Intake & Context Switcher Panel

**Location:** `src/components/widgets/IntakePanel.tsx`

**Acceptance Criteria:**

1. **Store-Bound Controls:**
* `pack_id` `<select>` is controlled by `packId` from `useSessionStore` and calls `setPackId(e.target.value as PackId)` on change (which resets the envelope, transcripts, and drafts). Disabled while `isSubmitting` is `true`.
* `dialect` `<select>` is controlled by `dialectOverride ?? ""` and calls `setDialectOverride(value === "" ? null : (value as SqlDialect))` on change, with options `""` (`"Default (manifest)"`), `"impala"`, and `"trino"`. Disabled while `isSubmitting` is `true`.
* Displays `activeMeta?.entity_id` as a compact badge when present, plus a **Reset** button calling `resetSession` (disabled while `isSubmitting` is `true`).


2. **Input & Error-Safe Clearing:**
* Single-line text input + **Send** button (both disabled while `isSubmitting` is `true`).
* On submit, `await submitIntake(trimmedText)`. Only clear the local input string **after** the promise resolves **and** `useSessionStore.getState().error === null`, so a failed request preserves the user's text alongside the error alert.


3. **2-Line Response Strip:** When `intakeSummaryText` is non-null, renders it clamped to 2 lines (`line-clamp-2`) alongside a **CoT** button calling `openCotModal(intakeCot)` when `intakeCot` is present.



---

#### Deliverable 3: Per-Lane Specialist Card

**Location:** `src/components/widgets/LanePanel.tsx`

**Props Interface:**

```typescript
export interface LanePanelProps {
  directive: RoutingDirective;
  fullHeight?: boolean;
}

```

**Acceptance Criteria:**

1. **Bounded Card & Scrollable Transcript:**
* Outer card uses `flex flex-col overflow-hidden` with a bounded height: `h-full min-h-[24rem]` when `fullHeight` is `true` (single card or `blocking: true` gate), or `h-[28rem]` when rendered in a multi-lane grid.
* Transcript container uses `flex-1 min-h-0 overflow-y-auto` so messages scroll inside the card and auto-scroll (`scrollIntoView` / `scrollTop = scrollHeight`) works reliably when `transcript.length` changes.


2. **Header (`shrink-0`):** Displays `directive.lane` badge, `directive.agent_role`, `directive.next_step`, `directive.routing_reason`, and status badges for `directive.blocking` (amber/red emphasis) and `directive.terminal`. Includes a **CoT** button enabled when `cotByLane[directive.lane]` exists, calling `openCotModal(cotByLane[directive.lane])`.
3. **Scoped Action Bar (`shrink-0`):** Render `activeActions.quick_replies` and `activeActions.tool_invocations` **only** when `directive.lane === activeContent?.routing_summary.lane`.
* Clicking a quick reply calls `submitLaneMessage(directive.lane, replyText)`.
* Clicking a tool invocation button (labeled with `invocation.label ?? invocation.intent`) calls `executeToolAction(invocation)`.
* **All quick-reply buttons and tool-invocation buttons must be disabled while `isSubmitting` is `true`.**


4. **Independent Input (`shrink-0`):** Controlled by `draftsByLane[directive.lane] ?? ""` via `setLaneDraft`. Submitting calls `submitLaneMessage(directive.lane, draft)`. Input and submit button are disabled while `isSubmitting` is `true`.



---

#### Deliverable 4: Left Pane (`ChatFeed`)

**Location:** `src/components/widgets/ChatFeed.tsx`

**Acceptance Criteria:**

1. **Pinned Header Layout:** Outer container is `flex flex-col h-full overflow-hidden`.
* `IntakePanel` sits at the top as `shrink-0` (stays pinned; never scrolls out of view).
* Error alert bar (`error !== null`) and dismissible inactive-lane notice banner (`laneNotice !== null`, with `clearLaneNotice` button) sit directly below `IntakePanel` as `shrink-0`. Read the inactive-lane notice strictly from `laneNotice.text`, never from `activeContent.chat_text`.
* The lane grid container below is `flex-1 min-h-0 overflow-y-auto p-4`.


2. **Dynamic `LanePanel` Grid:**
* Reads `directives = activeContent?.routing_directives ?? []`.
* `directives.length === 0`: Renders a lightweight empty state directing the user to enter an entity in the Intake Panel above.
* `directives.length === 1` (including any `blocking: true` gate): Renders a single `<LanePanel directive="{directives[0]}" fullHeight/>`.
* `directives.length >= 2`: Renders a responsive CSS Grid (`grid-cols-1 xl:grid-cols-2 gap-4`) of `LanePanel` cards.





---

#### Deliverable 5: Right Pane (`RoutingSummaryPanel`)

**Location:** `src/components/widgets/RoutingSummaryPanel.tsx`

**Acceptance Criteria:**

1. **Empty State:** When `activeContent === null`, renders a clean empty state explaining that no session is active yet and prompting the user to submit an entity in the Intake Panel.
2. **Four Domain-Agnostic Sections** (when `activeContent` is present):
* **Active Directives:** Lists `routing_directives` (`lane`, `agent_role`, `next_step`, `routing_reason`, `blocking`, `terminal`, `write`).
* **Playbook Checks:** Pulls `status === "assigned"` checks to the top (highlighted) and collapses `did_not_apply` and `skipped` checks into a toggleable section. Every check item must display `probe_id`, `title`, `detail`, its `status` badge, and a `skipped_reason` badge when present (`lane_already_matched`).
* **Specialist View (`view_data`):** Renders formatted JSON (`JSON.stringify(view_data, null, 2)`) inside a scrollable `<pre>` block.
* **Session Graph (`session_graph`):** Iterates over `Object.entries(session_graph)` generically and renders collapsible key-value sections for whatever top-level keys are present—zero hardcoded domain key names.





---

#### Deliverable 6: Widget Registry, Split-Pane Layout, & Entry Page

1. **`src/components/widgets/WidgetRegistry.tsx`**:
* Maps `"chat_feed"` → `ChatFeed` and `"routing_summary_panel"` → `RoutingSummaryPanel`.
* Exports `WidgetRenderer({ widgetKey }: { widgetKey: string })` with a styled fallback for unknown widget keys.


2. **`src/components/layout/SplitPane.tsx`**:
* Renders a full-height (`h-screen overflow-hidden`) responsive two-column layout:
* Left pane (`w-3/5 h-full overflow-hidden flex flex-col`) — delegates scrolling to `ChatFeed`'s lane grid so `IntakePanel` remains pinned.
* Right pane (`w-2/5 h-full overflow-y-auto border-l`) — scrolls the inspector independently.


* Uses `activeLayout?.widgets ?? ["chat_feed", "routing_summary_panel"]` to render widgets via `WidgetRenderer`.


3. **`src/app/page.tsx`**:
* Renders `SplitPane`, `CotDialog`, and a floating dismissible `actionToast` notification (bottom-right) showing `actionToast.status`, `actionToast.message`, and `actionToast.artifact` when present.



---

#### Phase 3 Verification Checklist

* [ ] `npx tsc --noEmit` passes with zero errors and zero `any` usage.
* [ ] `npm run build` succeeds and generates `out/index.html`.
* [ ] On first paint (`activeContent === null`), the left pane shows the pinned Intake Panel + empty lane grid, and the right pane shows the inspector empty state.
* [ ] Changing `pack` or `dialect` updates the Zustand store and is reflected in the `POST /api/v1/chat` payload; a failed intake request leaves the typed text in the intake box.
* [ ] While `isSubmitting` is `true`, pack/dialect selects, intake input, lane inputs, quick replies, and tool buttons are all disabled.
* [ ] Multi-lane cards scroll internally without pushing `IntakePanel` off-screen, and `RoutingSummaryPanel` renders `probe_id`, `title`, `detail`, `status`, `skipped_reason`, and all top-level `session_graph` keys generically.