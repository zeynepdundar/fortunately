import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FactsBar } from "@/components/facts-bar";
import { RequirementRow } from "@/components/requirement-row";
import { getAnalysis } from "@/lib/persistence/analyses";
import { readWorkspaceId } from "@/lib/persistence/workspace";

export const metadata: Metadata = { title: "Analysis — Fortunately" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AnalysisPage({ params }: PageProps<"/analyses/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        }
      >
        <AnalysisView params={params} />
      </Suspense>
    </main>
  );
}

async function AnalysisView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const workspaceId = await readWorkspaceId();
  if (!workspaceId) notFound();
  const analysis = await getAnalysis(id, workspaceId);
  if (!analysis) notFound();

  const must = analysis.requirements.filter((r) => r.kind === "must").length;
  const nice = analysis.requirements.length - must;
  const date = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(analysis.createdAt);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href="/analyze"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          ← Analyze another posting
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {analysis.jobTitle ?? analysis.postingTitle ?? "Untitled posting"}
        </h1>
        {analysis.status === "done" && (
          <FactsBar
            facts={{
              company: analysis.company,
              country: analysis.country,
              city: analysis.city,
              workMode: analysis.workMode,
              relocation: analysis.relocation ?? "not_stated",
            }}
          />
        )}
        <p className="text-xs text-neutral-500 tabular-nums">
          {date} · {analysis.provider} / {analysis.model} ·{" "}
          {analysis.promptVersion}
          {analysis.latencyMs !== null &&
            ` · ${(analysis.latencyMs / 1000).toFixed(1)} s`}
        </p>
      </div>

      {analysis.status === "running" && (
        <p
          role="status"
          className="rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900"
        >
          Still extracting. Refresh in a moment.
        </p>
      )}
      {analysis.status === "error" && (
        <p
          role="status"
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300"
        >
          This analysis did not finish. Try it again from Analyze.
        </p>
      )}

      {analysis.requirements.length > 0 && (
        <section
          aria-labelledby="requirements-heading"
          className="flex flex-col gap-3"
        >
          <div className="flex items-baseline justify-between">
            <h2 id="requirements-heading" className="text-lg font-semibold">
              Requirements
            </h2>
            <p className="text-xs text-neutral-500 tabular-nums">
              {must} must · {nice} nice
            </p>
          </div>
          <ol className="rounded-lg border border-neutral-200 px-3 dark:border-neutral-800">
            {analysis.requirements.map((item, i) => (
              <RequirementRow key={i} index={i} item={item} />
            ))}
          </ol>
        </section>
      )}

      <details className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
        <summary className="cursor-pointer font-medium">
          Original posting
        </summary>
        <pre className="mt-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
          {analysis.postingText}
        </pre>
      </details>
    </>
  );
}
