"use client";

import { useActionState, useState } from "react";
import { toNumberedLines } from "@/lib/cv";
import { CV_MAX_CHARS } from "@/lib/profile/schema";
import { saveProfileAction, type SaveProfileState } from "./actions";

type Initial = {
  yearsOfExperience: number | null;
  targetCountries: string[];
  relocationNeeded: boolean;
  cvText: string;
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="text-xs text-rose-600">
      {errors[0]}
    </p>
  );
}

export function ProfileForm({
  initial,
  sampleCv,
}: {
  initial: Initial;
  sampleCv: string;
}) {
  const [state, formAction, pending] = useActionState<
    SaveProfileState,
    FormData
  >(saveProfileAction, { status: "idle" });
  const [cvText, setCvText] = useState(initial.cvText);
  const lineCount = toNumberedLines(cvText).length;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="years" className="font-medium">
            Years of experience
          </label>
          <input
            id="years"
            name="yearsOfExperience"
            type="number"
            min={0}
            max={50}
            defaultValue={initial.yearsOfExperience ?? ""}
            aria-describedby="years-error"
            className={inputClass}
          />
          <FieldError
            id="years-error"
            errors={state.errors?.yearsOfExperience}
          />
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="countries" className="font-medium">
            Target countries
          </label>
          <input
            id="countries"
            name="targetCountries"
            defaultValue={initial.targetCountries.join(", ")}
            placeholder="DE, NL, DK"
            aria-describedby="countries-help countries-error"
            className={inputClass}
            spellCheck={false}
          />
          <p id="countries-help" className="text-xs text-neutral-500">
            Two-letter country codes, separated by commas.
          </p>
          <FieldError
            id="countries-error"
            errors={state.errors?.targetCountries}
          />
        </div>
      </div>

      <div className="flex items-start gap-3 text-sm">
        <input
          id="relocation"
          name="relocationNeeded"
          type="checkbox"
          defaultChecked={initial.relocationNeeded}
          aria-describedby="relocation-help"
          className="mt-1"
        />
        <div>
          <label htmlFor="relocation" className="font-medium">
            I need relocation support
          </label>
          <p id="relocation-help" className="text-xs text-neutral-500">
            Used by the relocation filter and score.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="cv" className="font-medium">
            CV
          </label>
          <button
            type="button"
            onClick={() => setCvText(sampleCv)}
            className="text-xs text-neutral-600 underline dark:text-neutral-400"
          >
            Use the sample CV
          </button>
        </div>
        <textarea
          id="cv"
          name="cvText"
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Paste your CV as plain text…"
          aria-describedby="cv-help cv-error"
          className="min-h-80 rounded-md border border-neutral-300 bg-transparent p-3 font-mono text-xs leading-relaxed dark:border-neutral-700"
        />
        <p id="cv-help" className="text-xs text-neutral-500 tabular-nums">
          {lineCount} lines · {cvText.length.toLocaleString("en")} /{" "}
          {CV_MAX_CHARS.toLocaleString("en")} characters. Each non-empty line
          gets a number; matches cite these numbers as evidence.
        </p>
        <FieldError id="cv-error" errors={state.errors?.cvText} />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <p
          role="status"
          className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}
        >
          {state.message}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
