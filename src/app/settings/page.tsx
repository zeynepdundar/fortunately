import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings — Fortunately" };

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fortunately runs on your own API key. Pick a provider and a model.
        </p>
      </div>
      <SettingsForm />
    </main>
  );
}
