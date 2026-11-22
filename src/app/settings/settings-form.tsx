"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_MODEL, MODEL_SUGGESTIONS } from "@/lib/ai/models";
import { ProviderId } from "@/lib/ai/provider-id";
import { useHydrated } from "@/lib/use-hydrated";
import { useSettings } from "@/stores/settings";

const PROVIDER_LABEL: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";

export function SettingsForm() {
  const hydrated = useHydrated();
  const { provider, modelId, apiKey, set, clearKey } = useSettings();
  const [showKey, setShowKey] = useState(false);

  if (!hydrated) {
    return (
      <div className="h-72 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
    );
  }

  const ready = apiKey.length > 0 && modelId.length > 0;

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Provider</legend>
        <div className="flex gap-2">
          {ProviderId.options.map((id) => (
            <label
              key={id}
              className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm has-checked:border-neutral-900 has-checked:ring-1 has-checked:ring-neutral-900 dark:border-neutral-700 dark:has-checked:border-white dark:has-checked:ring-white"
            >
              <input
                type="radio"
                name="provider"
                value={id}
                checked={provider === id}
                onChange={() =>
                  set({ provider: id, modelId: DEFAULT_MODEL[id], apiKey: "" })
                }
              />
              {PROVIDER_LABEL[id]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Model</span>
        <input
          className={inputClass}
          list="model-suggestions"
          value={modelId}
          onChange={(e) => set({ modelId: e.target.value.trim() })}
          placeholder="Model id from your provider's docs"
          spellCheck={false}
        />
        <datalist id="model-suggestions">
          {MODEL_SUGGESTIONS[provider].map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <span className="text-xs text-neutral-500">
          A small, fast model is enough for extraction and keeps costs low.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{PROVIDER_LABEL[provider]} API key</span>
        <div className="flex gap-2">
          <input
            className={`${inputClass} font-mono`}
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => set({ apiKey: e.target.value.trim() })}
            autoComplete="off"
            spellCheck={false}
            placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="rounded-md border border-neutral-300 px-3 text-sm dark:border-neutral-700"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <span className="text-xs text-neutral-500">
          Stored only in this browser tab&apos;s session storage and sent with
          each request. It is never saved or logged on the server, and it is
          gone when you close the tab.
        </span>
      </label>

      <div className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <p className="text-sm" role="status">
          {ready ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              Ready to analyze.
            </span>
          ) : (
            <span className="text-neutral-500">
              Add a model and a key to start.
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearKey}
            disabled={!apiKey}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-700"
          >
            Clear key
          </button>
          <Link
            href="/analyze"
            aria-disabled={!ready}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white aria-disabled:pointer-events-none aria-disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            Go to Analyze
          </Link>
        </div>
      </div>
    </form>
  );
}
