"use client";

import { useSessionStore } from "@/store/sessionStore";
import { WidgetRenderer } from "@/components/widgets/WidgetRegistry";

const DEFAULT_WIDGETS = ["chat_feed", "routing_summary_panel"];
const HIDDEN_WIDGETS = new Set(["active_directives", "rule_probes"]);

export function SplitPane() {
  const widgets = useSessionStore(
    (state) => state.activeLayout?.widgets ?? DEFAULT_WIDGETS,
  );
  const leftKey = widgets[0];
  const rightKeys = widgets
    .slice(1)
    .filter((widgetKey) => !HIDDEN_WIDGETS.has(widgetKey));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full w-3/5 flex-col overflow-hidden">
        {leftKey ? <WidgetRenderer widgetKey={leftKey} /> : null}
      </div>
      <div className="h-full w-2/5 space-y-4 overflow-y-auto border-l border-slate-200 bg-white p-4">
        {rightKeys.map((widgetKey) => (
          <WidgetRenderer key={widgetKey} widgetKey={widgetKey} />
        ))}
      </div>
    </div>
  );
}
