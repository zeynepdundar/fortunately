"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProviderId } from "@/lib/ai/provider";

type SettingsState = {
  provider: ProviderId;
  modelId: string;
  /** BYOK: kept in sessionStorage only, sent per request, never stored server-side. */
  apiKey: string;
  set: (
    patch: Partial<Pick<SettingsState, "provider" | "modelId" | "apiKey">>,
  ) => void;
  clearKey: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      provider: "anthropic",
      modelId: "",
      apiKey: "",
      set: (patch) => set(patch),
      clearKey: () => set({ apiKey: "" }),
    }),
    {
      name: "fortunately-settings",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
