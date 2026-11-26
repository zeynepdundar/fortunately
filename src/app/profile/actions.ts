"use server";

import { z } from "zod";
import { isDbEnabled } from "@/db";
import { saveProfile } from "@/lib/persistence/profile";
import { getOrCreateWorkspaceId } from "@/lib/persistence/workspace";
import { ProfileInput } from "@/lib/profile/schema";

export type SaveProfileState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Partial<Record<keyof ProfileInput, string[]>>;
};

export async function saveProfileAction(
  _previous: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  if (!isDbEnabled()) {
    return {
      status: "error",
      message: "Saving a profile needs a database (DATABASE_URL).",
    };
  }

  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const parsed = ProfileInput.safeParse({
    yearsOfExperience: text("yearsOfExperience"),
    targetCountries: text("targetCountries"),
    relocationNeeded: formData.get("relocationNeeded") === "on",
    cvText: text("cvText"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    const workspaceId = await getOrCreateWorkspaceId();
    if (!workspaceId)
      return { status: "error", message: "No workspace available." };
    await saveProfile(workspaceId, parsed.data);
    return { status: "saved", message: "Profile saved." };
  } catch (error) {
    console.error(
      "[profile] could not save:",
      error instanceof Error ? error.message : error,
    );
    return {
      status: "error",
      message: "Could not save the profile. Try again.",
    };
  }
}
