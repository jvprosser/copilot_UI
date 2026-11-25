"use client";

import { FormEvent, useState } from "react";
import { SqlDialect } from "@/types/api-contract";
import {
  AVAILABLE_PACKS,
  PackId,
  useSessionStore,
} from "@/store/sessionStore";

export function IntakePanel() {
  const packId = useSessionStore((state) => state.packId);
  const setPackId = useSessionStore((state) => state.setPackId);
  const dialectOverride = useSessionStore((state) => state.dialectOverride);
  const setDialectOverride = useSessionStore((state) => state.setDialectOverride);
  const entityId = useSessionStore((state) => state.activeMeta?.entity_id);
  const intakeSummaryText = useSessionStore((state) => state.intakeSummaryText);
  const intakeCot = useSessionStore((state) => state.intakeCot);
  const isSubmitting = useSessionStore((state) => state.isSubmitting);
  const submitIntake = useSessionStore((state) => state.submitIntake);
  const openCotModal = useSessionStore((state) => state.openCotModal);
  const resetSession = useSessionStore((state) => state.resetSession);
  const [text, setText] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) return;
    await submitIntake(trimmedText);
    if (useSessionStore.getState().error === null) setText("");
  };

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3">
      <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
        <label className="text-xs font-medium text-slate-600" htmlFor="pack-id">
          Pack
        </label>
        <select
          id="pack-id"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
          value={packId}
          disabled={isSubmitting}
          onChange={(event) => setPackId(event.target.value as PackId)}
        >
          {AVAILABLE_PACKS.map((pack) => (
            <option key={pack} value={pack}>
              {pack}
            </option>
          ))}
        </select>
        <label className="text-xs font-medium text-slate-600" htmlFor="dialect">
          Dialect
        </label>
        <select
          id="dialect"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
          value={dialectOverride ?? ""}
          disabled={isSubmitting}
          onChange={(event) => {
            const value = event.target.value;
            setDialectOverride(value === "" ? null : (value as SqlDialect));
          }}
        >
          <option value="">Default (manifest)</option>
          <option value="impala">impala</option>
          <option value="trino">trino</option>
        </select>
        <input
          className="min-w-48 flex-1 rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
          value={text}
          disabled={isSubmitting}
          placeholder="Enter an entity id"
          aria-label="Intake"
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
          disabled={isSubmitting}
        >
          Send
        </button>
        {entityId ? (
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {entityId}
          </span>
        ) : null}
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          disabled={isSubmitting}
          onClick={resetSession}
        >
          Reset
        </button>
      </form>
      {intakeSummaryText !== null ? (
        <div className="mt-2 flex items-start gap-2">
          <p className="line-clamp-2 flex-1 text-sm text-slate-800">
            {intakeSummaryText}
          </p>
          {intakeCot ? (
            <button
              type="button"
              className="shrink-0 rounded border border-slate-300 px-2 py-0.5 text-xs"
              onClick={() => openCotModal(intakeCot)}
            >
              CoT
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
