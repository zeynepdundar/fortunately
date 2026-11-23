"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_MODEL,
  MODEL_SUGGESTIONS,
  supportsThinkingToggle,
} from "@/lib/ai/models";
import { needsApiKey, ProviderId } from "@/lib/ai/provider-id";
import { useHydrated } from "@/lib/use-hydrated";
import { useSettings } from "@/stores/settings";

const PROVIDER_LABEL: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  ollama: "Ollama (local)",
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";

export function SettingsForm() {
  const hydrated = useHydrated();
  const { provider, modelId, apiKey, thinking, set, clearKey } = useSettings();
  const [showKey, setShowKey] = useState(false);

  if (!hydrated) {
    return (
      <div className="h-72 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
    );
  }

  const keyRequired = needsApiKey(provider);
  const ready = modelId.length > 0 && (!keyRequired || apiKey.length > 0);

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

      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="model" className="font-medium">
          Model
        </label>
        <input
          id="model"
          aria-describedby="model-help"
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
        <p id="model-help" className="text-xs text-neutral-500">
          A small, fast model is enough for extraction and keeps costs low.
        </p>
      </div>

      {supportsThinkingToggle(provider, modelId) && (
        <div className="flex items-start gap-3 text-sm">
          <input
            id="thinking"
            type="checkbox"
            className="mt-1"
            aria-describedby="thinking-help"
            checked={thinking}
            onChange={(e) => set({ thinking: e.target.checked })}
          />
          <div>
            <label htmlFor="thinking" className="font-medium">
              Thinking mode
            </label>
            <p id="thinking-help" className="text-xs text-neutral-500">
              Lets the model reason before answering. Slower; off is usually
              enough for extracting requirements.
            </p>
          </div>
        </div>
      )}

      {keyRequired ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="api-key" className="font-medium">
            {PROVIDER_LABEL[provider]} API key
          </label>
          <div className="flex gap-2">
            <input
              id="api-key"
              aria-describedby="api-key-help"
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
          <p id="api-key-help" className="text-xs text-neutral-500">
            Stored only in this browser tab&apos;s session storage and sent with
            each request. It is never saved or logged on the server, and it is
            gone when you close the tab.
          </p>
        </div>
      ) : (
        <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          Runs on your machine, free and without a key. Install{" "}
          <a
            href="https://ollama.com"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Ollama
          </a>
          , run{" "}
          <code className="font-mono text-xs">
            ollama pull {modelId || "qwen3:8b"}
          </code>
          , and keep it running. Only available in local development.
        </div>
      )}

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
