"use client";

import { PendingForm } from "@/types/api-contract";
import { useSessionStore } from "@/store/sessionStore";
import { DynamicFormCard } from "@/components/widgets/DynamicFormCard";

const EMPTY_PENDING_FORMS: PendingForm[] = [];

export function DataEntryPanel() {
  const pendingForms = useSessionStore(
    (state) => state.activeActions?.pending_forms ?? EMPTY_PENDING_FORMS,
  );
  const isSubmitting = useSessionStore((state) => state.isSubmitting);
  const submitFormAction = useSessionStore((state) => state.submitFormAction);

  if (pendingForms.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-600">No form is waiting for input.</p>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4">
      {pendingForms.map((form) => (
        <section
          key={`${form.lane}-${form.form_id}`}
          className="rounded-lg border border-slate-200 p-3"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-white">
              {form.lane}
            </span>
            <h2 className="text-sm font-semibold text-slate-900">{form.title}</h2>
          </div>
          <DynamicFormCard
            form={form}
            disabled={isSubmitting}
            onSubmit={(values) => submitFormAction(form, values)}
          />
        </section>
      ))}
    </div>
  );
}
