"use client";

import { ComponentType } from "react";
import { ChatFeed } from "@/components/widgets/ChatFeed";
import { DataEntryPanel } from "@/components/widgets/DataEntryPanel";
import { GraphExplorerPanel } from "@/components/widgets/GraphExplorerPanel";
import { RoutingSummaryPanel } from "@/components/widgets/RoutingSummaryPanel";

const widgets: Record<string, ComponentType> = {
  chat_feed: ChatFeed,
  routing_summary_panel: RoutingSummaryPanel,
  data_entry_panel: DataEntryPanel,
  graph_explorer: GraphExplorerPanel,
};

export function WidgetRenderer({ widgetKey }: { widgetKey: string }) {
  const Widget = widgets[widgetKey];
  if (!Widget) {
    return (
      <div className="p-4 text-sm text-slate-600">Unknown widget: {widgetKey}</div>
    );
  }
  return <Widget />;
}
