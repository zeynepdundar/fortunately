import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { isDbEnabled } from "@/db";
import { EMPTY_PROFILE } from "@/lib/criteria/postings-list";
import { listLatestAnalyses } from "@/lib/persistence/postings";
import { getCriteria, getProfile } from "@/lib/persistence/profile";
import { readWorkspaceId } from "@/lib/persistence/workspace";
import { PreferencesForm } from "./preferences-form";

export const metadata: Metadata = { title: "Preferences — Fortunately" };

export default function PreferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      }
    >
      <PreferencesLoader />
    </Suspense>
  );
}

async function PreferencesLoader() {
  // Always per request: depends on the visitor's cookie and the runtime DATABASE_URL.
  await connection();
  if (!isDbEnabled()) {
    return (
      <p
        role="status"
        className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      >
        Preferences are saved in Postgres. Set{" "}
        <code className="font-mono text-xs">DATABASE_URL</code> to use this
        page.
      </p>
    );
  }
  const workspaceId = await readWorkspaceId();
  const [criteria, profile, analyses] = workspaceId
    ? await Promise.all([
        getCriteria(workspaceId),
        getProfile(workspaceId),
        listLatestAnalyses(workspaceId),
      ])
    : [null, null, []];

  return (
    <PreferencesForm
      initial={criteria?.config}
      isDefault={criteria?.isDefault ?? true}
      analyses={analyses}
      profile={
        profile
          ? {
              yearsOfExperience: profile.yearsOfExperience,
              targetCountries: profile.targetCountries,
              relocationNeeded: profile.relocationNeeded,
            }
          : EMPTY_PROFILE
      }
    />
  );
}
