import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { isDbEnabled } from "@/db";
import { getProfile } from "@/lib/persistence/profile";
import { readWorkspaceId } from "@/lib/persistence/workspace";
import { loadSampleCv } from "@/lib/samples";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile — Fortunately" };

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      }
    >
      <ProfileLoader />
    </Suspense>
  );
}

async function ProfileLoader() {
  // Always render per request: the profile depends on the visitor's cookie and the runtime DATABASE_URL.
  await connection();
  const sampleCv = await loadSampleCv();
  if (!isDbEnabled()) {
    return (
      <p
        role="status"
        className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      >
        Profiles are saved in Postgres. Set{" "}
        <code className="font-mono text-xs">DATABASE_URL</code> to use this
        page.
      </p>
    );
  }
  const workspaceId = await readWorkspaceId();
  const profile = workspaceId ? await getProfile(workspaceId) : null;
  return (
    <ProfileForm
      sampleCv={sampleCv}
      initial={{
        yearsOfExperience: profile?.yearsOfExperience ?? null,
        targetCountries: profile?.targetCountries ?? [],
        relocationNeeded: profile?.relocationNeeded ?? false,
        cvText: profile?.cv?.rawText ?? "",
      }}
    />
  );
}
