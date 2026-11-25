Grok’s `UI_ARCHITECTURE.md` is tight and clarifies several exact state transitions. Reviewing it surfaces **one contract fix**, **one UX contradiction we need to resolve**, and **three state-machine refinements** for Phase 2.

### 1. One Type Fix in `src/types/api-contract.ts`

`CheckStatus` needs a third literal value—`"skipped"`—since `checks[].status` can be `"assigned"`, `"did_not_apply"`, or `"skipped"` (with `skipped_reason` set only when it is `"lane_already_matched"`):

```typescript
export type CheckStatus = "assigned" | "did_not_apply" | "skipped";

```

### 2. UX Contradiction to Resolve: The Inactive-Lane Notice

Section 2 specifies two things when a user submits to a lane that is no longer active (`meta.active_lane: null`):

1. Show `chat_text` on the card the user submitted.
2. Replace `routing_directives` immediately so the removed lane is no longer a card.



If we remove the card immediately, there is no card left to display `chat_text` on.

**Proposed Architectural Fix:**
Add a dismissible `laneNotice: { lane: string; text: string } | null` banner at the top of the `LanePanel` grid. When an inactive-lane response arrives, the removed card disappears cleanly as `routing_directives` updates, the draft stays preserved in `draftsByLane[lane]`, and the banner displays the backend's `chat_text` notice so the user knows why that lane closed.

### 3. State & UI Refinements for Phase 2

Incorporating the rest of Grok's rules into `src/store/sessionStore.ts` and `src/lib/api/client.ts`:

* **Serialize Both Chat and Actions:** `isSubmitting` must gate `submitIntake`, `submitLaneMessage`, *and* `executeToolAction` so no action or chat request runs concurrently with an in-flight turn.
* **Three Distinct Intake Outcomes:**
* *Missing ID (`entity_id: null`):* Update `intakeSummaryText` and `intakeCot` only; leave `activeContent`, `transcriptsByLane`, and `draftsByLane` untouched.
* *Same Entity (`entity_id === current`):* Refresh the entire active envelope (`activeMeta`, `activeLayout`, `activeContent`, `activeActions`) and replace `transcriptsByLane[active_lane]` with the full `lane_messages` array, leaving other lanes' cached transcripts intact.
* *New Entity (`entity_id !== current`):* Clear `transcriptsByLane`, `draftsByLane`, and `cotByLane`, then hydrate the new envelope and `transcriptsByLane[active_lane]`.


* **Strict Action Bar Scoping:** Render `actions.quick_replies` and `actions.tool_invocations` *only* on the `LanePanel` whose `directive.lane === activeContent.routing_summary.lane`.
* **Per-Lane Draft Clearing on Preemption:** On a normal lane follow-up (`meta.active_lane !== null`), store `lane_messages` and CoT under `meta.active_lane`, and clear the draft for the `lane` the user submitted from.



---

If you approve the `laneNotice` banner fix for inactive lanes, I will generate the **Phase 2 Implementation Specifications** (`src/lib/api/client.ts` with runtime `/config.js` resolution + `src/store/sessionStore.ts` + CORS notes) for Cursor/Grok.