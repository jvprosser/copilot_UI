"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckItem, LaneMessage, RoutingDirective } from "@/types/api-contract";
import { useSessionStore } from "@/store/sessionStore";

const EMPTY_TRANSCRIPT: LaneMessage[] = [];
const EMPTY_CHECKS: CheckItem[] = [];

export interface LanePanelProps {
  directive: RoutingDirective;
  fullHeight?: boolean;
}

export function LanePanel({ directive, fullHeight = false }: LanePanelProps) {
  const transcript = useSessionStore(
    (state) => state.transcriptsByLane[directive.lane] ?? EMPTY_TRANSCRIPT,
  );
  const laneCot = useSessionStore((state) => state.cotByLane[directive.lane]);
  const draft = useSessionStore(
    (state) => state.draftsByLane[directive.lane] ?? "",
  );
  const summaryLane = useSessionStore(
    (state) => state.activeContent?.routing_summary.lane,
  );
  const activeActions = useSessionStore((state) => state.activeActions);
  const isSubmitting = useSessionStore((state) => state.isSubmitting);
  const setLaneDraft = useSessionStore((state) => state.setLaneDraft);
  const submitLaneMessage = useSessionStore((state) => state.submitLaneMessage);
  const executeToolAction = useSessionStore((state) => state.executeToolAction);
  const openCotModal = useSessionStore((state) => state.openCotModal);
  const allChecks = useSessionStore(
    (state) => state.activeContent?.checks ?? EMPTY_CHECKS,
  );
  const [showOtherChecks, setShowOtherChecks] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const checksHaveLane = allChecks.some((item) => item.lane != null);
  const laneChecks = checksHaveLane
    ? allChecks.filter((item) => item.lane === directive.lane)
    : allChecks;
  const assignedChecks = laneChecks.filter((item) => item.status === "assigned");
  const otherChecks = laneChecks.filter((item) => item.status !== "assigned");

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [transcript.length]);

  const showActions = directive.lane === summaryLane;
  const quickReplies = activeActions?.quick_replies ?? [];
  const toolInvocations = activeActions?.tool_invocations ?? [];

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitLaneMessage(directive.lane, draft);
  };

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white ${
        fullHeight ? "h-full min-h-[24rem]" : "h-[28rem]"
      }`}
    >
      <header className="shrink-0 space-y-1 border-b border-slate-200 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-white">
            {directive.lane}
          </span>
          <span className="text-sm font-medium text-slate-900">
            {directive.agent_role}
          </span>
          {directive.blocking ? (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              blocking
            </span>
          ) : null}
          {directive.terminal ? (
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
              terminal
            </span>
          ) : null}
          <button
            type="button"
            className="ml-auto rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-50"
            disabled={!laneCot}
            onClick={() => {
              if (laneCot) openCotModal(laneCot);
            }}
          >
            CoT
          </button>
        </div>
        <p className="text-sm text-slate-800">{directive.next_step}</p>
        <p className="text-xs text-slate-600">{directive.routing_reason}</p>
        <p className="text-xs text-slate-500">
          write {directive.write ?? "null"}
          {directive.form ? ` · form ${directive.form}` : ""}
        </p>
      </header>
      <details open className="shrink-0 border-b border-slate-200 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-700">
          Playbook checks
        </summary>
        <div className="mt-2 space-y-2">
          {assignedChecks.map((item) => (
            <CheckRow key={item.probe_id} item={item} highlighted />
          ))}
          {otherChecks.length > 0 ? (
            <button
              type="button"
              className="text-xs font-medium text-slate-700"
              onClick={() => setShowOtherChecks((open) => !open)}
            >
              {showOtherChecks ? "Hide" : "Show"} did not apply and skipped (
              {otherChecks.length})
            </button>
          ) : null}
          {showOtherChecks
            ? otherChecks.map((item) => (
                <CheckRow key={item.probe_id} item={item} highlighted={false} />
              ))
            : null}
        </div>
      </details>
      <div
        ref={transcriptRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2"
      >
        {transcript.map((message, index) => (
          <article key={`${message.timestamp}-${index}`} className="text-sm">
            <div className="text-xs text-slate-500">
              {message.role}
              {message.agent_role ? ` · ${message.agent_role}` : ""} ·{" "}
              {message.timestamp}
            </div>
            <p className="whitespace-pre-wrap text-slate-800">{message.text}</p>
          </article>
        ))}
      </div>
      {showActions ? (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-200 px-3 py-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
              disabled={isSubmitting}
              onClick={() => void submitLaneMessage(directive.lane, reply)}
            >
              {reply}
            </button>
          ))}
          {toolInvocations.map((invocation) => (
            <button
              key={`${invocation.intent}-${invocation.label ?? ""}`}
              type="button"
              className="rounded bg-slate-800 px-2 py-1 text-xs text-white disabled:opacity-50"
              disabled={isSubmitting}
              onClick={() => void executeToolAction(invocation)}
            >
              {invocation.label ?? invocation.intent}
            </button>
          ))}
        </div>
      ) : null}
      <form className="flex shrink-0 gap-2 border-t border-slate-200 px-3 py-2" onSubmit={onSubmit}>
        <input
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
          value={draft}
          disabled={isSubmitting}
          aria-label={`Message ${directive.lane}`}
          onChange={(event) => setLaneDraft(directive.lane, event.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
          disabled={isSubmitting}
        >
          Send
        </button>
      </form>
    </section>
  );
}

function CheckRow({
  item,
  highlighted,
}: {
  item: CheckItem;
  highlighted: boolean;
}) {
  return (
    <article
      className={`rounded border px-2 py-1 text-xs ${
        highlighted ? "border-amber-300 bg-amber-50" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-slate-500">{item.probe_id}</span>
        <span className="font-medium text-slate-900">{item.title}</span>
        <span className="rounded bg-slate-200 px-1.5 py-0.5">{item.status}</span>
        {item.skipped_reason ? (
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-white">
            {item.skipped_reason}
          </span>
        ) : null}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-slate-700">{item.detail}</p>
    </article>
  );
}
