"use client";

import { useEffect, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { WidgetRenderer } from "@/components/widgets/WidgetRegistry";

const DEFAULT_WIDGETS = ["chat_feed", "routing_summary_panel"];
const HIDDEN_WIDGETS = new Set(["active_directives", "rule_probes"]);

function WorkspaceTile({
  widgetKey,
  focus,
}: {
  widgetKey: string;
  focus: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const focused = focus === widgetKey;

  useEffect(() => {
    if (focus === widgetKey) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [focus, widgetKey]);

  return (
    <section
      ref={ref}
      className={`flex h-[38rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white ${
        focused ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="h-full min-h-0 flex-1 overflow-hidden">
        <WidgetRenderer widgetKey={widgetKey} />
      </div>
    </section>
  );
}

export function TileGrid() {
  const widgets = useSessionStore(
    (state) => state.activeLayout?.widgets ?? DEFAULT_WIDGETS,
  );
  const focus = useSessionStore((state) => state.activeLayout?.focus ?? "");
  const visible = widgets.filter((widgetKey) => !HIDDEN_WIDGETS.has(widgetKey));

  return (
    <div className="grid min-h-screen grid-cols-1 gap-4 bg-slate-100 p-4 lg:grid-cols-2">
      {visible.map((widgetKey) => (
        <WorkspaceTile key={widgetKey} widgetKey={widgetKey} focus={focus} />
      ))}
    </div>
  );
}
