"use client";

import { useSessionStore } from "@/store/sessionStore";

function graphValue(value: unknown): { pre: boolean; text: string } {
  if (value === null) return { pre: false, text: "null" };
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return { pre: false, text: String(value) };
  }
  if (typeof value === "object") {
    return { pre: true, text: JSON.stringify(value, null, 2) };
  }
  return { pre: false, text: String(value) };
}

export function GraphExplorerPanel() {
  const sessionGraph = useSessionStore(
    (state) => state.activeContent?.session_graph,
  );
  const entries = sessionGraph ? Object.entries(sessionGraph) : [];

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Session Graph</h2>
      <div className="space-y-2">
        {entries.map(([key, value]) => {
          const formatted = graphValue(value);
          return (
            <details key={key} open className="rounded border border-slate-200">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                {key}
              </summary>
              {formatted.pre ? (
                <pre className="max-h-64 overflow-auto border-t border-slate-200 bg-slate-50 p-3 font-mono text-xs">
                  {formatted.text}
                </pre>
              ) : (
                <p className="border-t border-slate-200 px-3 py-2 text-sm">
                  {formatted.text}
                </p>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
