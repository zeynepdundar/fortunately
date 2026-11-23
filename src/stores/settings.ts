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
  /** Thinking mode for models that support switching it (e.g. qwen3). */
  thinking: boolean;
  set: (
    patch: Partial<
      Pick<SettingsState, "provider" | "modelId" | "apiKey" | "thinking">
    >,
  ) => void;
  clearKey: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      provider: "anthropic",
      modelId: DEFAULT_MODEL.anthropic,
      apiKey: "",
      thinking: false,
      set: (patch) => set(patch),
      clearKey: () => set({ apiKey: "" }),
    }),
    {
      name: "fortunately-settings",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
