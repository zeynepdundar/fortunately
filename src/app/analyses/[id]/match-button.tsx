"use client";

import { useObject } from "@ai-sdk/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { needsApiKey } from "@/lib/ai/provider-id";
import { KEY_HEADER } from "@/lib/api/extract-contract";
import { errorMessage } from "@/lib/api/error-message";
import { CheckedMatches } from "@/lib/schemas";
import { useHydrated } from "@/lib/use-hydrated";
import { useSettings } from "@/stores/settings";

/** Match this saved analysis against the profile CV, then reload the page with the result. */
export function MatchButton({
  analysisId,
  className,
}: {
  analysisId: string;
  className: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { provider, modelId, apiKey } = useSettings();
  const configured =
    hydrated &&
    modelId.length > 0 &&
    (!needsApiKey(provider) || apiKey.length > 0);

  const matching = useObject({
    api: "/api/match",
    schema: CheckedMatches,
    headers: (): Record<string, string> => {
      const key = useSettings.getState().apiKey;
      return key ? { [KEY_HEADER]: key } : {};
    },
    onFinish: ({ error }) => {
      if (!error) router.refresh();
    },
  });

  if (hydrated && !configured) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Choose a model in{" "}
        <Link href="/settings" className="font-medium underline">
          Settings
        </Link>{" "}
        to match this posting.
      </p>
    );
  }

  const done = matching.object?.matches?.length ?? 0;
  return (
    <div className="flex flex-col items-start gap-2" aria-live="polite">
      <button
        type="button"
        className={`${className} disabled:opacity-40`}
        disabled={!configured || matching.isLoading}
        onClick={() => {
          const s = useSettings.getState();
          matching.submit({
            analysisId,
            provider: s.provider,
            modelId: s.modelId,
            thinking: s.thinking,
          });
        }}
      >
        {matching.isLoading ? "Matching…" : "Match with my CV"}
      </button>
      {matching.isLoading && done > 0 && (
        <p className="text-xs text-neutral-500 tabular-nums">
          {done} requirements checked
        </p>
      )}
      {matching.error && (
        <p role="alert" className="text-sm text-amber-800 dark:text-amber-300">
          {errorMessage(matching.error)}
        </p>
      )}
    </div>
  );
}
