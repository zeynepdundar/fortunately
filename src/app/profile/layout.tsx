import type { ReactNode } from "react";
import { ProfileTabs } from "./profile-tabs";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Who you are and how postings should be judged. Nothing here calls a
          model.
        </p>
      </div>
      <ProfileTabs />
      {children}
    </main>
  );
}
