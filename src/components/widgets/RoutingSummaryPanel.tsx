"use client";

import { useState } from "react";
import { CheckItem } from "@/types/api-contract";
import { useSessionStore } from "@/store/sessionStore";

function graphValue(value: unknown): { pre: boolean; text: string } {
  if (value === null) return { pre: false, text: "null" };
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { pre: false, text: String(value) };
  }
  if (typeof value === "object") {
    return { pre: true, text: JSON.stringify(value, null, 2) };
  }
  return { pre: false, text: String(value) };
}

function CheckRow({ item, highlighted }: { item: CheckItem; highlighted: boolean }) {
  return (
    <article
      className={`rounded border px-3 py-2 text-sm ${
        highlighted ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-slate-500">{item.probe_id}</span>
        <span className="font-medium text-slate-900">{item.title}</span>
        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">{item.status}</span>
        {item.skipped_reason ? (
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-white">
            {item.skipped_reason}
          </span>
        ) : null}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-slate-700">{item.detail}</p>
    </article>
  );
}

export function RoutingSummaryPanel() {
  const activeContent = useSessionStore((state) => state.activeContent);
  const [showOtherChecks, setShowOtherChecks] = useState(false);

  if (!activeContent) {
    return (
      <div className="p-4 text-sm text-slate-600">
        No session is active yet. Submit an entity in the Intake Panel.
      </div>
    );
  }

  const assigned = activeContent.checks.filter((item) => item.status === "assigned");
  const otherChecks = activeContent.checks.filter((item) => item.status !== "assigned");
  const graphEntries = Object.entries(activeContent.session_graph);

  return (
    <div className="space-y-6 p-4">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Active Directives</h2>
        <div className="space-y-2">
          {activeContent.routing_directives.map((directive) => (
            <article
              key={directive.directive_id}
              className="rounded border border-slate-200 px-3 py-2 text-sm"
            >
              <div className="font-medium text-slate-900">
                {directive.lane} · {directive.agent_role}
              </div>
              <p>{directive.next_step}</p>
              <p className="text-slate-600">{directive.routing_reason}</p>
              <p className="text-xs text-slate-500">
                blocking {String(directive.blocking)} · terminal{" "}
                {String(directive.terminal)} · write {directive.write ?? "null"}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Playbook Checks</h2>
        <div className="space-y-2">
          {assigned.map((item) => (
            <CheckRow key={item.probe_id} item={item} highlighted />
          ))}
        </div>
        {otherChecks.length > 0 ? (
          <div className="mt-2">
            <button
              type="button"
              className="text-xs font-medium text-slate-700"
              onClick={() => setShowOtherChecks((open) => !open)}
            >
              {showOtherChecks ? "Hide" : "Show"} did not apply and skipped (
              {otherChecks.length})
            </button>
            {showOtherChecks ? (
              <div className="mt-2 space-y-2">
                {otherChecks.map((item) => (
                  <CheckRow key={item.probe_id} item={item} highlighted={false} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Specialist View</h2>
        <pre className="max-h-80 overflow-auto rounded bg-slate-900 p-3 font-mono text-xs text-slate-100">
          {JSON.stringify(activeContent.view_data, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Session Graph</h2>
        <div className="space-y-2">
          {graphEntries.map(([key, value]) => {
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
                  <p className="border-t border-slate-200 px-3 py-2 text-sm">{formatted.text}</p>
                )}
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
