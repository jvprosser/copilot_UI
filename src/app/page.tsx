"use client";

import { CotDialog } from "@/components/layout/CotDialog";
import { SplitPane } from "@/components/layout/SplitPane";
import { TileGrid } from "@/components/layout/TileGrid";
import { useSessionStore } from "@/store/sessionStore";

export default function HomePage() {
  const template = useSessionStore((state) => state.activeLayout?.template);
  const actionToast = useSessionStore((state) => state.actionToast);
  const clearActionToast = useSessionStore((state) => state.clearActionToast);

  return (
    <>
      {template === "tile_grid" ? <TileGrid /> : <SplitPane />}
      <CotDialog />
      {actionToast ? (
        <div className="fixed bottom-4 right-4 z-40 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">
                {actionToast.status}
              </p>
              <p className="text-sm text-slate-800">{actionToast.message}</p>
            </div>
            <button
              type="button"
              className="text-xs text-slate-600"
              onClick={clearActionToast}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
