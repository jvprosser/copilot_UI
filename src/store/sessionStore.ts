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

function laneState(
  response: ChatResponse,
  transcriptsByLane: Record<string, LaneMessage[]>,
  cotByLane: Record<string, CotModalData>,
): {
  transcriptsByLane: Record<string, LaneMessage[]>;
  cotByLane: Record<string, CotModalData>;
} {
  const lane = response.meta.active_lane;
  if (!lane) {
    return { transcriptsByLane, cotByLane };
  }
  return {
    transcriptsByLane: {
      ...transcriptsByLane,
      [lane]: response.content.lane_messages,
    },
    cotByLane: {
      ...cotByLane,
      [lane]: buildCotData(response),
    },
  };
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
      const { packId, dialectOverride } = get();
      const response = await postChat({
        user_text: userText,
        pack_id: packId,
        dialect: dialectOverride,
      });
      const intakeSummaryText = response.content.chat_text;
      const intakeCot = buildCotData(response);
      if (response.meta.entity_id === null) {
        set({ intakeSummaryText, intakeCot });
        return;
      }
      if (response.meta.entity_id !== get().activeMeta?.entity_id) {
        const stored = laneState(response, {}, {});
        set({
          intakeSummaryText,
          intakeCot,
          transcriptsByLane: stored.transcriptsByLane,
          cotByLane: stored.cotByLane,
          draftsByLane: {},
          laneNotice: null,
          activeMeta: response.meta,
          activeLayout: response.layout,
          activeContent: response.content,
          activeActions: response.actions,
        });
        return;
      }
      set((state) => {
        const stored = laneState(
          response,
          state.transcriptsByLane,
          state.cotByLane,
        );
        return {
          intakeSummaryText,
          intakeCot,
          transcriptsByLane: stored.transcriptsByLane,
          cotByLane: stored.cotByLane,
          laneNotice: response.meta.active_lane ? null : state.laneNotice,
          activeMeta: response.meta,
          activeLayout: response.layout,
          activeContent: response.content,
          activeActions: response.actions,
        };
      });
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
      const { packId, dialectOverride } = get();
      const response = await postChat({
        user_text: userText,
        pack_id: packId,
        dialect: dialectOverride,
        entity_id: entityId,
        lane,
      });
      const activeLane = response.meta.active_lane;
      if (activeLane !== null) {
        set((state) => {
          const stored = laneState(
            response,
            state.transcriptsByLane,
            state.cotByLane,
          );
          return {
            activeMeta: response.meta,
            activeLayout: response.layout,
            activeContent: response.content,
            activeActions: response.actions,
            transcriptsByLane: stored.transcriptsByLane,
            cotByLane: stored.cotByLane,
            draftsByLane: { ...state.draftsByLane, [lane]: "" },
            laneNotice: null,
          };
        });
        return;
      }
      set((state) => ({
        activeMeta: response.meta,
        activeActions: response.actions,
        activeContent: state.activeContent
          ? {
              ...state.activeContent,
              routing_directives: response.content.routing_directives,
              checks: response.content.checks,
              routing_summary: response.content.routing_summary,
            }
          : state.activeContent,
        laneNotice: { lane, text: response.content.chat_text },
      }));
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
      const response = await postAction({
        intent: invocation.intent,
        pack_id: get().packId,
        payload: invocation.payload,
      });
      const message = response.artifact
        ? `Saved ${response.artifact}`
        : "Action completed.";
      set({
        actionToast: {
          id: `${Date.now()}`,
          intent: invocation.intent,
          status: "success",
          message,
          artifact: response.artifact,
        },
      });
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
