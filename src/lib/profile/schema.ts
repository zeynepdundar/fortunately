import { z } from "zod";

/** "de, NL  dk" -> ["DE", "NL", "DK"]; invalid codes are rejected by the schema. */
export function parseCountries(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[\s,;]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

export const CV_MAX_CHARS = 20_000;

/** Profile form input, validated on the server. */
export const ProfileInput = z.object({
  yearsOfExperience: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(50)])
    .transform((v) => (v === "" ? null : v)),
  targetCountries: z
    .string()
    .transform(parseCountries)
    .pipe(
      z
        .array(
          z
            .string()
            .regex(/^[A-Z]{2}$/, "Use two-letter country codes, e.g. DE, NL."),
        )
        .max(30),
    ),
  relocationNeeded: z.boolean(),
  cvText: z
    .string()
    .trim()
    .max(CV_MAX_CHARS, `Keep the CV under ${CV_MAX_CHARS} characters.`),
});
export type ProfileInput = z.output<typeof ProfileInput>;
