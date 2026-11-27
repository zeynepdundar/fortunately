"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { setStatusAction } from "@/app/actions/status";
import {
  APPLICATION_STATUSES,
  STATUS_LABEL,
  type ApplicationStatus,
} from "@/lib/application-status";

/** Application status of one posting; saves on change and refreshes the page. */
export function StatusSelect({
  postingId,
  status,
  className = "",
}: {
  postingId: string;
  status: ApplicationStatus;
  className?: string;
}) {
  const id = useId();
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-xs text-neutral-500">
          Status
        </label>
        <select
          id={id}
          value={value}
          disabled={saving}
          onChange={(e) => {
            const next = e.target.value as ApplicationStatus;
            const previous = value;
            setValue(next);
            setError(null);
            startSaving(async () => {
              const result = await setStatusAction({ postingId, status: next });
              if (result.ok) {
                router.refresh();
              } else {
                setValue(previous);
                setError(result.message ?? "Could not save.");
              }
            });
          }}
          className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
