"use client";

import { useSessionStore } from "@/store/sessionStore";
import { GraphExplorerPanel } from "@/components/widgets/GraphExplorerPanel";

const EMPTY_WIDGETS: string[] = [];

export function RoutingSummaryPanel() {
  const activeContent = useSessionStore((state) => state.activeContent);
  const widgets = useSessionStore(
    (state) => state.activeLayout?.widgets ?? EMPTY_WIDGETS,
  );

  if (!activeContent) {
    return (
      <div className="p-4 text-sm text-slate-600">
        No session is active yet. Submit an entity in the Intake Panel.
      </div>
    );
  }

  const summary = activeContent.routing_summary;

  return (
    <div className="space-y-6 p-4">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Routing Summary
        </h2>
        <dl className="space-y-1 text-sm text-slate-800">
          <div>Next step: {summary.next_step ?? "null"}</div>
          <div>Agent: {summary.agent_role ?? "null"}</div>
          <div>Lane: {summary.lane ?? "null"}</div>
          <div>Reason: {summary.routing_reason ?? "null"}</div>
        </dl>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Specialist View
        </h2>
        <pre className="max-h-80 overflow-auto rounded bg-slate-900 p-3 font-mono text-xs text-slate-100">
          {JSON.stringify(activeContent.view_data, null, 2)}
        </pre>
      </section>
      {widgets.includes("graph_explorer") ? null : <GraphExplorerPanel />}
    </div>
  );
}
