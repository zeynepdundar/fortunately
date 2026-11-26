"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { DEFAULT_CRITERIA, type CriteriaConfig } from "@/lib/criteria/config";
import type { Profile } from "@/lib/criteria/engine";
import {
  buildPostingList,
  type ListedAnalysis,
} from "@/lib/criteria/postings-list";
import { saveCriteriaAction, type SaveCriteriaResult } from "./actions";

type Preferences = CriteriaConfig["preferences"];
type PreferenceKey = keyof Preferences;
type WorkMode = Preferences["workMode"]["accepted"][number];

const WORK_MODES: { id: WorkMode; label: string }[] = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700";

function PreferenceSwitches({
  id,
  value,
  onChange,
  disabled,
}: {
  id: PreferenceKey;
  value: { hideMismatches: boolean; hideUnknown: boolean };
  onChange: (
    patch: Partial<{ hideMismatches: boolean; hideUnknown: boolean }>,
  ) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <div className="flex items-center gap-2">
        <input
          id={`${id}-mismatch`}
          type="checkbox"
          disabled={disabled}
          checked={value.hideMismatches}
          onChange={(e) => onChange({ hideMismatches: e.target.checked })}
        />
        <label htmlFor={`${id}-mismatch`}>Hide postings that do not fit</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`${id}-unknown`}
          type="checkbox"
          disabled={disabled}
          checked={value.hideUnknown}
          onChange={(e) => onChange({ hideUnknown: e.target.checked })}
        />
        <label htmlFor={`${id}-unknown`}>Hide when not stated</label>
      </div>
    </div>
  );
}

export function PreferencesForm({
  initial,
  isDefault,
  analyses,
  profile,
}: {
  initial: CriteriaConfig | undefined;
  isDefault: boolean;
  analyses: ListedAnalysis[];
  profile: Profile;
}) {
  const [config, setConfig] = useState<CriteriaConfig>(
    initial ?? DEFAULT_CRITERIA,
  );
  const [result, setResult] = useState<SaveCriteriaResult | null>(null);
  const [saving, startSaving] = useTransition();

  const preview = useMemo(
    () => buildPostingList(analyses, profile, config),
    [analyses, profile, config],
  );

  const update = (change: (c: CriteriaConfig) => CriteriaConfig) => {
    setConfig((c) => change(c));
    setResult(null);
  };
  const setPreference = <K extends PreferenceKey>(
    key: K,
    patch: Partial<Preferences[K]>,
  ) =>
    update((c) => ({
      ...c,
      preferences: {
        ...c.preferences,
        [key]: { ...c.preferences[key], ...patch },
      },
    }));
  const toggleWorkMode = (mode: WorkMode, on: boolean) => {
    const current = config.preferences.workMode.accepted;
    const next = on
      ? [...new Set([...current, mode])]
      : current.filter((m) => m !== mode);
    if (next.length > 0) setPreference("workMode", { accepted: next });
  };

  const save = () =>
    startSaving(async () => {
      setResult(await saveCriteriaAction(config));
    });

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="must-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="must-heading" className="text-base font-semibold">
            Must-haves
          </h2>
          <p className="text-sm text-neutral-500">
            Postings are ranked by facts from your CV match: fewest missing
            must-haves first, then the share of must-haves and nice-to-haves
            your CV proves.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label htmlFor="allowed-missing">
            Missing must-haves I still apply with
          </label>
          <select
            id="allowed-missing"
            value={config.allowedMissingMust}
            onChange={(e) =>
              update((c) => ({
                ...c,
                allowedMissingMust: Number(e.target.value),
              }))
            }
            className={inputClass}
          >
            <option value={0}>None</option>
            <option value={1}>Up to 1</option>
            <option value={2}>Up to 2</option>
            <option value={3}>Up to 3</option>
          </select>
          <span className="text-xs text-neutral-500">
            More than this goes to Below threshold.
          </span>
        </div>
      </section>

      <section
        aria-labelledby="preferences-heading"
        className="flex flex-col gap-5"
      >
        <div>
          <h2 id="preferences-heading" className="text-base font-semibold">
            Where and how you want to work
          </h2>
          <p className="text-sm text-neutral-500">
            These show as a badge on each posting, or hide postings that do not
            fit.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Relocation</h3>
          <p className="text-xs text-neutral-500">
            {profile.relocationNeeded
              ? "Your profile says you need relocation support."
              : "Your profile says you do not need relocation, so this is not checked."}{" "}
            <Link href="/profile" className="underline">
              Change in About you
            </Link>
          </p>
          <PreferenceSwitches
            id="relocation"
            value={config.preferences.relocation}
            disabled={!profile.relocationNeeded}
            onChange={(patch) => setPreference("relocation", patch)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Country</h3>
          <p className="text-xs text-neutral-500">
            {profile.targetCountries.length > 0
              ? `Target countries: ${profile.targetCountries.join(", ")}.`
              : "No target countries in your profile, so this is not checked."}{" "}
            <Link href="/profile" className="underline">
              Change in About you
            </Link>
          </p>
          <PreferenceSwitches
            id="country"
            value={config.preferences.country}
            disabled={profile.targetCountries.length === 0}
            onChange={(patch) => setPreference("country", patch)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Work mode</h3>
          <fieldset className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <legend className="sr-only">Accepted work modes</legend>
            {WORK_MODES.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <input
                  id={`mode-${m.id}`}
                  type="checkbox"
                  checked={config.preferences.workMode.accepted.includes(m.id)}
                  onChange={(e) => toggleWorkMode(m.id, e.target.checked)}
                />
                <label htmlFor={`mode-${m.id}`}>{m.label}</label>
              </div>
            ))}
          </fieldset>
          <PreferenceSwitches
            id="workMode"
            value={config.preferences.workMode}
            disabled={config.preferences.workMode.accepted.length === 3}
            onChange={(patch) => setPreference("workMode", patch)}
          />
        </div>
      </section>

      <section
        aria-labelledby="preview-heading"
        className="flex flex-col gap-3 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900"
      >
        <h2 id="preview-heading" className="text-base font-semibold">
          Preview
        </h2>
        {analyses.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No postings yet.{" "}
            <Link href="/analyze" className="underline">
              Analyze a posting
            </Link>{" "}
            to see these settings at work.
          </p>
        ) : (
          <>
            <p className="text-sm tabular-nums" aria-live="polite">
              {preview.shown.length} of {analyses.length} shown ·{" "}
              {preview.belowThreshold.length} below threshold ·{" "}
              {preview.filteredOut.length} filtered out
            </p>
            <ol className="flex flex-col gap-1 text-sm">
              {preview.shown.slice(0, 5).map((p) => {
                const { must, matched } = p.evaluation.match;
                return (
                  <li
                    key={p.analysis.analysisId}
                    className="flex justify-between gap-4"
                  >
                    <span className="truncate">{p.analysis.title}</span>
                    <span className="text-neutral-600 tabular-nums dark:text-neutral-400">
                      {matched
                        ? `${must.met}/${must.total} must-haves`
                        : "not matched"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <p
          role="status"
          className={`text-sm ${result && !result.ok ? "text-rose-600" : "text-neutral-600 dark:text-neutral-400"}`}
        >
          {result?.message ??
            (isDefault
              ? "Using the default preferences."
              : "Using your saved preferences.")}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => update(() => DEFAULT_CRITERIA)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
