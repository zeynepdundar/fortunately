"use client";

import { useObject } from "@ai-sdk/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RequirementRow } from "@/components/requirement-row";
import { needsApiKey } from "@/lib/ai/provider-id";
import { cleanPartialRequirements } from "@/lib/extraction";
import { ExtractRequest, KEY_HEADER } from "@/lib/api/extract-contract";
import type { SamplePosting } from "@/lib/samples";
import { Extraction } from "@/lib/schemas";
import { useHydrated } from "@/lib/use-hydrated";
import { useSettings } from "@/stores/settings";

/** Server errors arrive as the JSON body in error.message. */
function errorMessage(error: Error): string {
  try {
    const body = JSON.parse(error.message) as {
      message?: string;
      error?: string;
    };
    if (body.message) return body.message;
    if (body.error === "invalid_input")
      return "The request was invalid. Check the posting and your model.";
  } catch {
    // not JSON: a provider or network error
  }
  return "Something went wrong. Check your provider, model and API key in Settings (for Ollama: is it running?), then try again.";
}

export function AnalyzeClient({ samples }: { samples: SamplePosting[] }) {
  const [posting, setPosting] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [firstItemMs, setFirstItemMs] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const [submittedPosting, setSubmittedPosting] = useState("");

  // Settings live in sessionStorage, so read them only after hydration.
  const hydrated = useHydrated();
  const { provider, modelId, apiKey, thinking } = useSettings();
  const configured =
    hydrated &&
    modelId.length > 0 &&
    (!needsApiKey(provider) || apiKey.length > 0);

  const { object, submit, isLoading, stop, error, clear } = useObject({
    api: "/api/extract",
    schema: Extraction,
    headers: (): Record<string, string> => {
      const key = useSettings.getState().apiKey;
      return key ? { [KEY_HEADER]: key } : {};
    },
  });

  const requirements = useMemo(
    () =>
      cleanPartialRequirements(object?.requirements ?? [], submittedPosting),
    [object, submittedPosting],
  );
  const mustCount = requirements.filter((r) => r?.kind === "must").length;
  const niceCount = requirements.filter((r) => r?.kind === "nice").length;

  useEffect(() => {
    if (
      firstItemMs === null &&
      startedAt.current !== null &&
      requirements[0]?.text
    ) {
      setFirstItemMs(performance.now() - startedAt.current);
    }
  }, [requirements, firstItemMs]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = ExtractRequest.safeParse({
      posting,
      provider,
      modelId,
      thinking,
    });
    if (!parsed.success) {
      setInputError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setInputError(null);
    setFirstItemMs(null);
    clear();
    startedAt.current = performance.now();
    setSubmittedPosting(parsed.data.posting);
    submit(parsed.data);
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-10 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Analyze a posting
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Paste a job posting or start from a sample.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Sample postings</span>
          <select
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
            defaultValue=""
            onChange={(e) => {
              const sample = samples.find((s) => s.id === e.target.value);
              if (sample) setPosting(sample.body);
            }}
          >
            <option value="" disabled>
              Choose a sample…
            </option>
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">Job posting</span>
          <textarea
            value={posting}
            onChange={(e) => setPosting(e.target.value)}
            placeholder="Paste the full job posting here…"
            className="min-h-80 flex-1 rounded-md border border-neutral-300 bg-transparent p-3 font-mono text-xs leading-relaxed dark:border-neutral-700"
          />
        </label>

        {hydrated && !configured && (
          <p
            role="alert"
            className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            Add a model (and an API key, unless you use Ollama) in{" "}
            <Link href="/settings" className="font-medium underline">
              Settings
            </Link>{" "}
            to run an analysis.
          </p>
        )}
        {inputError && (
          <p role="alert" className="text-sm text-rose-600">
            {inputError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!configured || isLoading}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {isLoading ? "Extracting…" : "Extract requirements"}
          </button>
          {isLoading && (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Stop
            </button>
          )}
        </div>
      </form>

      <section
        aria-labelledby="requirements-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="requirements-heading" className="text-lg font-semibold">
            Requirements
          </h2>
          <p
            className="text-xs text-neutral-500 tabular-nums"
            aria-live="polite"
          >
            {mustCount} must · {niceCount} nice
            {firstItemMs !== null &&
              ` · first item in ${(firstItemMs / 1000).toFixed(1)} s`}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          >
            {errorMessage(error)}
          </p>
        )}

        {requirements.length > 0 ? (
          <ol className="rounded-lg border border-neutral-200 px-3 dark:border-neutral-800">
            {requirements.map((item, i) => (
              <RequirementRow key={i} index={i} item={item} />
            ))}
          </ol>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
            {isLoading
              ? "Reading the posting…"
              : "Requirements will stream in here."}
          </div>
        )}
      </section>
    </main>
  );
}
