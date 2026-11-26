import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PostingCard } from "@/components/posting-card";
import { isDbEnabled } from "@/db";
import { DEFAULT_CRITERIA } from "@/lib/criteria/config";
import {
  buildPostingList,
  EMPTY_PROFILE,
  type ListedPosting,
} from "@/lib/criteria/postings-list";
import { listLatestAnalyses } from "@/lib/persistence/postings";
import { getProfile } from "@/lib/persistence/profile";
import { readWorkspaceId } from "@/lib/persistence/workspace";

export const metadata: Metadata = { title: "Postings — Fortunately" };

export default function PostingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Postings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Every posting you analysed, ranked by how well it fits your profile
          and criteria.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        }
      >
        <PostingsLoader />
      </Suspense>
    </main>
  );
}

function Section({
  title,
  postings,
  open = true,
}: {
  title: string;
  postings: ListedPosting[];
  open?: boolean;
}) {
  if (postings.length === 0) return null;
  const list = (
    <ol className="rounded-lg border border-neutral-200 px-3 dark:border-neutral-800">
      {postings.map((p) => (
        <PostingCard key={p.analysis.analysisId} posting={p} />
      ))}
    </ol>
  );
  if (open) return list;
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {title} ({postings.length})
      </summary>
      <div className="mt-3">{list}</div>
    </details>
  );
}

async function PostingsLoader() {
  // Always per request: depends on the visitor's cookie and the runtime DATABASE_URL.
  await connection();
  if (!isDbEnabled()) {
    return (
      <p
        role="status"
        className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      >
        The postings list reads saved analyses from Postgres. Set{" "}
        <code className="font-mono text-xs">DATABASE_URL</code> to use it.
      </p>
    );
  }

  const workspaceId = await readWorkspaceId();
  const [analyses, profile] = workspaceId
    ? await Promise.all([
        listLatestAnalyses(workspaceId),
        getProfile(workspaceId),
      ])
    : [[], null];

  if (analyses.length === 0) {
    return (
      <p
        role="status"
        className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700"
      >
        No postings yet.{" "}
        <Link href="/analyze" className="font-medium underline">
          Analyze your first posting
        </Link>
        .
      </p>
    );
  }

  const engineProfile = profile
    ? {
        yearsOfExperience: profile.yearsOfExperience,
        targetCountries: profile.targetCountries,
        relocationNeeded: profile.relocationNeeded,
      }
    : EMPTY_PROFILE;
  const list = buildPostingList(analyses, engineProfile, DEFAULT_CRITERIA);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-neutral-500">
        {list.shown.length} shown · {list.belowThreshold.length} below threshold
        · {list.filteredOut.length} filtered out · scored with the default
        criteria.{" "}
        {!profile && (
          <>
            <Link href="/profile" className="underline">
              Fill in your profile
            </Link>{" "}
            to score years, countries and relocation.
          </>
        )}
      </p>
      {list.shown.length === 0 && (
        <p className="text-sm text-neutral-500">
          No posting passes your filters right now.
        </p>
      )}
      <Section title="Shown" postings={list.shown} />
      <Section
        title="Below threshold"
        postings={list.belowThreshold}
        open={false}
      />
      <Section title="Filtered out" postings={list.filteredOut} open={false} />
    </div>
  );
}
