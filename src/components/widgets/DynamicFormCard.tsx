"use client";

import { FormEvent, useState } from "react";
import { FormFieldSchema, PendingForm } from "@/types/api-contract";

export interface DynamicFormCardProps {
  form: PendingForm;
  disabled: boolean;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function DynamicFormCard({
  form,
  disabled,
  onSubmit,
}: DynamicFormCardProps) {
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [fieldError, setFieldError] = useState<string | null>(null);

  const textOf = (field: FormFieldSchema) => textValues[field.id] ?? "";
  const flagOf = (field: FormFieldSchema) => flags[field.id] ?? false;

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values: Record<string, unknown> = {};
    for (const field of form.fields) {
      if (field.type === "boolean") {
        values[field.id] = flagOf(field);
        continue;
      }
      if (field.type === "number") {
        const raw = textOf(field);
        if (isBlank(raw)) {
          if (field.required) {
            setFieldError(`${field.label} is required.`);
            return;
          }
          continue;
        }
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) {
          setFieldError(`${field.label} must be a number.`);
          return;
        }
        values[field.id] = parsed;
        continue;
      }
      const raw = textOf(field);
      if (field.required && isBlank(raw)) {
        setFieldError(`${field.label} is required.`);
        return;
      }
      if (!isBlank(raw)) values[field.id] = raw.trim();
    }
    setFieldError(null);
    void onSubmit(values);
  };

  return (
    <form className="space-y-3" onSubmit={onFormSubmit}>
      {form.fields.map((field) => (
        <label key={field.id} className="block text-sm text-slate-800">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {field.label}
          </span>
          {field.type === "boolean" ? (
            <input
              type="checkbox"
              checked={flagOf(field)}
              disabled={disabled}
              onChange={(event) =>
                setFlags((current) => ({
                  ...current,
                  [field.id]: event.target.checked,
                }))
              }
            />
          ) : null}
          {field.type === "select" ? (
            <select
              className="w-full rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
              value={textOf(field)}
              disabled={disabled}
              onChange={(event) =>
                setTextValues((current) => ({
                  ...current,
                  [field.id]: event.target.value,
                }))
              }
            >
              <option value="">Select</option>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : null}
          {field.type === "text" || field.type === "number" || field.type === "date" ? (
            <input
              type={field.type}
              className="w-full rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
              value={textOf(field)}
              disabled={disabled}
              onChange={(event) =>
                setTextValues((current) => ({
                  ...current,
                  [field.id]: event.target.value,
                }))
              }
            />
          ) : null}
        </label>
      ))}
      {fieldError ? <p className="text-xs text-red-700">{fieldError}</p> : null}
      <button
        type="submit"
        className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
        disabled={disabled}
      >
        Submit
      </button>
    </form>
  );
}
