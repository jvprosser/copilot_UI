"use client";

import { useSessionStore } from "@/store/sessionStore";
import { WidgetRenderer } from "@/components/widgets/WidgetRegistry";

const DEFAULT_WIDGETS = ["chat_feed", "routing_summary_panel"];

export function SplitPane() {
  const widgets = useSessionStore(
    (state) => state.activeLayout?.widgets ?? DEFAULT_WIDGETS,
  );
  const leftKey = widgets[0];
  const rightKey = widgets[1];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full w-3/5 flex-col overflow-hidden">
        {leftKey ? <WidgetRenderer widgetKey={leftKey} /> : null}
      </div>
      <div className="h-full w-2/5 overflow-y-auto border-l border-slate-200 bg-white">
        {rightKey ? <WidgetRenderer widgetKey={rightKey} /> : null}
      </div>
    </div>
  );
}
