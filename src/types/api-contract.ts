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

export type CheckStatus = "assigned" | "did_not_apply" | "skipped";

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
