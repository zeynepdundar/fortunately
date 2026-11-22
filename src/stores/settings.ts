"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import type { ProviderId } from "@/lib/ai/provider-id";

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
      modelId: DEFAULT_MODEL.anthropic,
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
