/** Brand accent: used only in the logo, so the app itself stays neutral. */
export const LOGO_ACCENT = "#ff8a3d";

/**
 * The Fortunately mark: an open eye, a winking eye and a checkmark for a smile,
 * the same "Met" the app shows when a CV proves a requirement.
 */
export function LogoMark({
  size = 24,
  title,
}: {
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="120" height="120" rx="28" fill="#16161a" />
      <circle cx="40" cy="44" r="8" fill={LOGO_ACCENT} />
      <path
        d="M68 47 q10 -11 20 0"
        stroke={LOGO_ACCENT}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M36 74 l15 14 l33 -30"
        stroke={LOGO_ACCENT}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
