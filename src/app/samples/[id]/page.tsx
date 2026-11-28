import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FactsBar } from "@/components/facts-bar";
import { MatchCard } from "@/components/match-card";
import { mustTexts } from "@/components/match-summary";
import { RequirementRow } from "@/components/requirement-row";
import { DEFAULT_CRITERIA } from "@/lib/criteria/config";
import { evaluatePosting } from "@/lib/criteria/engine";
import { loadSampleResult, SAMPLE_PROFILE } from "@/lib/sample-results";

export const metadata: Metadata = { title: "Sample analysis — Fortunately" };

export default function SamplePage({ params }: PageProps<"/samples/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        }
      >
        <SampleView params={params} />
      </Suspense>
    </main>
  );
}

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

async function SampleView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sample = await loadSampleResult(id);
  if (!sample) notFound();

  const { extraction, matches } = sample;
  const evaluation = evaluatePosting(
    {
      facts: extraction.facts,
      requirements: extraction.requirements,
      matches,
    },
    SAMPLE_PROFILE,
    DEFAULT_CRITERIA,
  );
  const targets = SAMPLE_PROFILE.targetCountries
    .map((c) => COUNTRY_NAMES.of(c) ?? c)
    .join(" and ");

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← All samples
        </Link>
        <p className="w-fit rounded-md px-1.5 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-neutral-300 ring-inset dark:text-neutral-400 dark:ring-neutral-700">
          Sample · fictional posting and CV, analysed ahead of time
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {extraction.facts.title ?? "Untitled posting"}
        </h1>
        <FactsBar facts={extraction.facts} />
        <p className="text-xs text-neutral-500">
          {sample.provider} / {sample.model} · {sample.extractPromptVersion} ·{" "}
          {sample.matchPromptVersion}
        </p>
      </div>

      <MatchCard
        evaluation={evaluation}
        heading="Alex's match"
        cvLabel="Alex's CV"
        mustByVerdict={{
          missing: mustTexts(extraction.requirements, matches, "missing"),
          partial: mustTexts(extraction.requirements, matches, "partial"),
        }}
        footer={
          <>
            Alex Rivera (fictional): {SAMPLE_PROFILE.yearsOfExperience} years,
            lives in Lisbon, would relocate to {targets} ·{" "}
            <Link href="/analyze" className="underline">
              Analyze your own posting
            </Link>
          </>
        }
      />

      <section
        aria-labelledby="requirements-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="requirements-heading" className="text-lg font-semibold">
          Requirements
        </h2>
        <ol className="rounded-lg border border-neutral-200 px-3 dark:border-neutral-800">
          {extraction.requirements.map((item, i) => (
            <RequirementRow
              key={i}
              index={i}
              item={item}
              match={matches[i]}
              yearsOfExperience={SAMPLE_PROFILE.yearsOfExperience}
            />
          ))}
        </ol>
      </section>

      <details className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
        <summary className="cursor-pointer font-medium">
          Original posting
        </summary>
        <pre className="mt-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
          {sample.posting}
        </pre>
      </details>
      <details className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
        <summary className="cursor-pointer font-medium">
          Alex&apos;s CV (numbered lines the evidence cites)
        </summary>
        <ol className="mt-3 font-mono text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
          {sample.cvLines.map((line) => (
            <li key={line.n} className="flex gap-3">
              <span className="w-6 shrink-0 text-right text-neutral-400 tabular-nums">
                {line.n}
              </span>
              <span>{line.text}</span>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
