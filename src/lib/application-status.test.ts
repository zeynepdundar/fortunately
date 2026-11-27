import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  STATUS_LABEL,
  statusGroup,
} from "./application-status";

describe("application status", () => {
  it("groups statuses into the three Postings sections", () => {
    expect(APPLICATION_STATUSES.map(statusGroup)).toEqual([
      "to_decide",
      "in_progress",
      "in_progress",
      "in_progress",
      "closed",
      "closed",
    ]);
  });

  it("labels every status and rejects unknown values", () => {
    for (const s of APPLICATION_STATUSES) expect(STATUS_LABEL[s]).toBeTruthy();
    expect(ApplicationStatus.safeParse("ghosted").success).toBe(false);
  });
});
