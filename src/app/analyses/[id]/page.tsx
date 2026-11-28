import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FactsBar } from "@/components/facts-bar";
import { MatchCard } from "@/components/match-card";
import { hiddenReason, mustTexts } from "@/components/match-summary";
import { RequirementRow } from "@/components/requirement-row";
import { StatusSelect } from "@/components/status-select";
import { evaluatePosting, type Evaluation } from "@/lib/criteria/engine";
import { toEngineProfile } from "@/lib/criteria/postings-list";
import { MatchButton } from "./match-button";
import { getAnalysis } from "@/lib/persistence/analyses";
import { getCriteria, getProfile } from "@/lib/persistence/profile";
import type { PostingFacts } from "@/lib/schemas";
import { countVerdicts } from "@/lib/stored-matches";
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
  const [analysis, profile, criteria] = await Promise.all([
    getAnalysis(id, workspaceId),
    getProfile(workspaceId),
    getCriteria(workspaceId),
  ]);
  if (!analysis) notFound();

  const evaluation = evaluatePosting(
    {
      facts: {
        country: analysis.country,
        relocation: analysis.relocation ?? "not_stated",
        workMode: analysis.workMode,
      },
      requirements: analysis.requirements,
      matches: analysis.matches,
    },
    toEngineProfile(profile),
    criteria.config,
  );

  const verdicts = countVerdicts(analysis.matches);
  const matched = analysis.matches.some(Boolean);
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {analysis.jobTitle ?? analysis.postingTitle ?? "Untitled posting"}
          </h1>
          {analysis.status === "done" && (
            <StatusSelect
              postingId={analysis.postingId}
              status={analysis.postingStatus}
            />
          )}
        </div>
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

      {analysis.status === "done" && analysis.requirements.length > 0 && (
        <MatchSummary
          evaluation={evaluation}
          usingDefaults={criteria.isDefault}
          hasProfile={profile !== null}
          hasCv={Boolean(profile?.cv)}
          analysisId={analysis.id}
          mustByVerdict={{
            missing: mustTexts(
              analysis.requirements,
              analysis.matches,
              "missing",
            ),
            partial: mustTexts(
              analysis.requirements,
              analysis.matches,
              "partial",
            ),
          }}
          facts={{ country: analysis.country, workMode: analysis.workMode }}
        />
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
              {matched &&
                ` · CV match: ${verdicts.met} met · ${verdicts.partial} partial · ${verdicts.missing} missing`}
            </p>
          </div>
          <ol className="rounded-lg border border-neutral-200 px-3 dark:border-neutral-800">
            {analysis.requirements.map((item, i) => (
              <RequirementRow
                key={i}
                index={i}
                item={item}
                match={analysis.matches[i]}
                yearsOfExperience={profile?.yearsOfExperience ?? null}
              />
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

const PRIMARY_BUTTON =
  "inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900";

/**
 * Must-haves met, the facts behind it and how the posting fits your preferences.
 * Before a CV match exists it only says how to get one: no score, no preferences.
 */
function MatchSummary({
  evaluation,
  usingDefaults,
  hasProfile,
  hasCv,
  mustByVerdict,
  facts,
  analysisId,
}: {
  evaluation: Evaluation;
  usingDefaults: boolean;
  hasProfile: boolean;
  hasCv: boolean;
  /** Texts of the must-haves the CV does not fully prove. */
  mustByVerdict: { missing: string[]; partial: string[] };
  facts: Pick<PostingFacts, "country" | "workMode">;
  analysisId: string;
}) {
  const { match } = evaluation;

  if (!match.matched) {
    return (
      <section
        aria-labelledby="match-heading"
        className="flex flex-col items-start gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        data-testid="match-pending"
      >
        <h2 id="match-heading" className="text-lg font-semibold">
          Your match
        </h2>
        {hasCv ? (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Match this posting with your CV to see how well you fit the job.
            </p>
            <MatchButton analysisId={analysisId} className={PRIMARY_BUTTON} />
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Add your CV to see how well you match this job.
            </p>
            <Link href="/profile" className={PRIMARY_BUTTON}>
              Add CV
            </Link>
          </>
        )}
      </section>
    );
  }

  const hidden = evaluation.preferences.filter((p) => p.hidden);
  const status =
    evaluation.bucket === "filtered_out"
      ? `Hidden from Postings because ${hidden.map((p) => hiddenReason(p, facts)).join(" and ")}`
      : evaluation.bucket === "below_threshold"
        ? `Below threshold in Postings: ${evaluation.belowThreshold.join(", ")}`
        : `Using ${usingDefaults ? "the default preferences" : "your preferences"}`;

  return (
    <MatchCard
      evaluation={evaluation}
      mustByVerdict={mustByVerdict}
      footer={
        <>
          {status} ·{" "}
          <Link href="/profile/preferences" className="underline">
            Adjust preferences
          </Link>
          {!hasProfile && (
            <>
              {" "}
              ·{" "}
              <Link href="/profile" className="underline">
                Fill in your profile
              </Link>{" "}
              to check years, countries and relocation
            </>
          )}
        </>
      }
    />
  );
}
