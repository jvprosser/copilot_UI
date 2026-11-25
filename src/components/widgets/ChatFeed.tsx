"use client";

import { RoutingDirective } from "@/types/api-contract";
import { useSessionStore } from "@/store/sessionStore";
import { IntakePanel } from "@/components/widgets/IntakePanel";
import { LanePanel } from "@/components/widgets/LanePanel";

const EMPTY_DIRECTIVES: RoutingDirective[] = [];

export function ChatFeed() {
  const error = useSessionStore((state) => state.error);
  const laneNotice = useSessionStore((state) => state.laneNotice);
  const clearLaneNotice = useSessionStore((state) => state.clearLaneNotice);
  const directives = useSessionStore(
    (state) => state.activeContent?.routing_directives ?? EMPTY_DIRECTIVES,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <IntakePanel />
      </div>
      {error !== null ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {laneNotice !== null ? (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          <p>{laneNotice.text}</p>
          <button
            type="button"
            className="shrink-0 rounded border border-amber-300 px-2 py-0.5 text-xs"
            onClick={clearLaneNotice}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {directives.length === 0 ? (
          <p className="text-sm text-slate-600">
            Enter an entity in the Intake Panel above.
          </p>
        ) : null}
        {directives.length === 1 ? (
          <LanePanel directive={directives[0]} fullHeight />
        ) : null}
        {directives.length >= 2 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {directives.map((directive) => (
              <LanePanel key={directive.directive_id} directive={directive} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
