import { z } from "zod";

/** Where the visitor stands with a posting. New = analysed, no decision yet. */
export const APPLICATION_STATUSES = [
  "new",
  "applied",
  "interview",
  "offer",
  "rejected",
  "skipped",
] as const;

export const ApplicationStatus = z.enum(APPLICATION_STATUSES);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  new: "New",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  skipped: "Skipped",
};

/** The Postings section a status belongs to. */
export type StatusGroup = "to_decide" | "in_progress" | "closed";

export function statusGroup(status: ApplicationStatus): StatusGroup {
  switch (status) {
    case "new":
      return "to_decide";
    case "applied":
    case "interview":
    case "offer":
      return "in_progress";
    case "rejected":
    case "skipped":
      return "closed";
  }
}
