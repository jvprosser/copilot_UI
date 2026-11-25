# UI_ARCHITECTURE.md & Rules of Engagement

The UI renders the backend envelope. It does not encode playbook rules, field names, or specialist prompts. The pack selector offers the active pack ids (`claims`, `underwriting`, `retirement_distributions`, `retirement_rollovers`). The dialect control offers `impala` and `trino`, and it is omitted from the request unless the user sets it.

## 1. What the UI renders

`layout` is fixed: `template: split_pane`, `widgets: [chat_feed, routing_summary_panel]`, `focus: chat_feed`.

**Left pane (`chat_feed`)**

- **Intake and context switch.** Pack selector, optional dialect override, and one text input. The response strip shows `content.chat_text`. A CoT button opens the dialog for this turn.
- **One lane card per `content.routing_directives` item.** A `blocking: true` directive is the only item in that list, so the card is full width. Each `blocking: false` directive is one concurrent lane. The card header shows that directive's `next_step`, `agent_role`, and `routing_reason`. The transcript is `transcriptsByLane[directive.lane]`. Each card has its own draft and text input.
- **Action bar.** `actions` belongs to the projected directive: the blocking gate if one is present, otherwise the requested lane, otherwise `routing_directives[0]`. Render `quick_replies` and `tool_invocations` on the card whose `lane` equals `routing_summary.lane`. Other cards do not show them. Both lists are empty unless that directive has `letter_on_request: true`. The invocation is `intent: save_entry_artifact`, a `label`, and `payload.entry_id`. `POST /api/v1/action` sends `pack_id`, `intent`, and `payload`. It does not send `run_id`. The response is `status` and `artifact`. The action does not replace the chat envelope.

**Right pane (`routing_summary_panel`)**

Inspector for `routing_directives`, `checks`, `view_data`, and `session_graph`. A check has `probe_id`, `title`, `status`, and `detail`. `status` is `assigned`, `did_not_apply`, or `skipped`. `skipped_reason` is present only when it is `lane_already_matched`.

**CoT dialog**

Shows `meta.debug_cot` (a list of strings), `meta.run_id`, `meta.dialect`, and `meta.active_lane`.

`routing_summary` is always an object. `next_step`, `agent_role`, `lane`, and `routing_reason` are strings or `null`. After a turn that re-evaluates the playbook, `routing_summary` and `meta.terminal` follow the projected directive. `chat_text` stays the specialist who already spoke.

## 2. Chat turns

Requests are serialized. A second chat or action request is dropped while an in-flight request is active (requests are not queued), because a `patch_session_field` turn re-evaluates the playbook inside that same response.

**Intake and context switch.** Post `{ user_text, pack_id }` plus `dialect` only when the user has set one. Omit `entity_id` and `lane`. The backend extracts the id and runs one specialist. `meta.active_lane` is that lane. `content.lane_messages` is the full transcript for that lane, not a delta. Replace `transcriptsByLane[active_lane]` with that array. Leave every other lane's cached transcript in place.

Replace `activeMeta`, `activeLayout`, `activeContent`, and `activeActions` from the response, including when `meta.entity_id` is unchanged. A second intake of the same entity still returns a new directive list, checks, `session_graph`, and `view_data`.

When `meta.entity_id` is non-null and differs from the entity already on screen, clear `transcriptsByLane`, `draftsByLane`, and per-lane CoT, then store `lane_messages` on `transcriptsByLane[active_lane]`.

**Missing id.** `meta.entity_id` is `null`, `routing_directives` is empty, and `chat_text` is the notice. Put that notice in the intake strip and store this turn's CoT. Do not clear transcripts, drafts, lane cards, or the envelope already on screen.

**Lane follow-up.** Requires the entity id already on screen. Post `{ user_text, pack_id, entity_id, lane }` plus `dialect` only when the user has set one.

- When `meta.active_lane` is set, replace `transcriptsByLane[active_lane]` with `content.lane_messages`, store that turn's CoT on that lane, and clear the draft for the lane the user sent. Replace the active envelope so directives, checks, `session_graph`, and `view_data` match the response.
- When the requested lane is no longer active, the response is HTTP 200 with `meta.active_lane: null`, an empty `lane_messages`, and the notice in `chat_text`. Do not replace any transcript with the empty array. Keep `draftsByLane[lane]`. Render `chat_text` in a dismissible `laneNotice` banner above the lane grid, not on the removed card. Replace `activeMeta`, `activeActions`, `routing_directives`, `checks`, and `routing_summary`. Preserve the existing `view_data`, `session_graph`, and `activeContent.chat_text`.

Changing `pack_id` clears the envelope, intake strip, transcripts, drafts, and per-lane CoT.

## 3. Cloudera AI application

Production is a static export. `next.config.ts` sets `output: "export"`. The Cloudera application Script field is `serve.py`. It binds `127.0.0.1` and `CDSW_APP_PORT` (default `8080`) and serves `out/`.

`GET /config.js` is `Cache-Control: no-store` and returns `export const API_BASE = "<PROCESS_AGENT_API_URL>";`. The value has no trailing slash. An empty value keeps requests on the same origin. The API client reads `/config.js` at runtime, then `NEXT_PUBLIC_API_BASE_URL` during `next dev`, then `""`.

## 4. Code rules

- No `index.ts` barrel files. Import from the file that defines the symbol.
- No `any`. Use `unknown` or `Record<string, unknown>` for `session_graph` and `view_data`.
- One component per file. Keep that component's props in the same file.
- This document is the root `UI_ARCHITECTURE.md`.

## 5. Directory map

- `serve.py` — static file server and `/config.js`.
- `src/types/api-contract.ts` — `ChatRequest`, `ChatResponse`, and `ActionRequest`.
- `src/lib/api/client.ts` — `postChat` and `postAction`. Resolves `API_BASE` as in Section 3.
- `src/store/sessionStore.ts` — pack, dialect, envelope, per-lane transcripts and drafts, CoT, action toast.
- `src/components/layout/` — `SplitPane` and `CotDialog`.
- `src/components/widgets/` — `IntakePanel`, `LanePanel`, `ChatFeed`, `RoutingSummaryPanel`, and `WidgetRegistry`.

## 6. API endpoints

- `POST ${API_BASE}/api/v1/chat` — returns the four-node envelope.
- `POST ${API_BASE}/api/v1/action` — runs one tool and does not evaluate the playbook.
