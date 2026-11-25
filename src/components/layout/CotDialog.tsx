"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";

export function CotDialog() {
  const activeCotModalData = useSessionStore((state) => state.activeCotModalData);
  const closeCotModal = useSessionStore((state) => state.closeCotModal);

  useEffect(() => {
    if (!activeCotModalData) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCotModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCotModalData, closeCotModal]);

  if (!activeCotModalData) return null;

  const copyCot = () => {
    void navigator.clipboard
      .writeText(activeCotModalData.debug_cot.join("\n\n"))
      .catch(() => undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
      onClick={closeCotModal}
      role="presentation"
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg"
        role="dialog"
        aria-label="Chain of thought"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div className="text-sm text-slate-700">
            <div>
              <span className="font-medium">Run</span> {activeCotModalData.run_id}
            </div>
            <div>
              <span className="font-medium">Dialect</span> {activeCotModalData.dialect}
            </div>
            <div>
              <span className="font-medium">Lane</span>{" "}
              {activeCotModalData.active_lane ?? "none"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1 text-sm"
              onClick={copyCot}
            >
              Copy
            </button>
            <button
              type="button"
              className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
              onClick={closeCotModal}
            >
              Close
            </button>
          </div>
        </div>
        <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-4 py-3 font-mono text-xs text-slate-800">
          {activeCotModalData.debug_cot.map((line, index) => (
            <div key={`${index}-${line.slice(0, 24)}`}>{line}</div>
          ))}
        </pre>
      </div>
    </div>
  );
}
