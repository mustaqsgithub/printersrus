import Link from "next/link";

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "printersrus";

interface LogoProps {
  /**
   * Visual variant. `light` = dark text on light bg (default), `dark` = white text on dark bg.
   * Use `dark` when placing the logo on a dark surface such as a hero or footer.
   */
  variant?: "light" | "dark";
  /** Render only the icon mark (no wordmark). */
  markOnly?: boolean;
  /** Render as a Link to the homepage. */
  asLink?: boolean;
  /** Approximate height in px (mark scales with this). */
  size?: number;
  className?: string;
}

/**
 * Brand logo — a primary-tinted printer mark plus a clean wordmark.
 * The mark is an SVG so it stays crisp at any size; the wordmark uses
 * tabular tracking and tight kerning for a wordmark feel.
 */
export function Logo({
  variant,
  markOnly = false,
  asLink = true,
  size = 32,
  className = "",
}: LogoProps) {
  const wordmarkColor = variant === "dark" ? "text-white" : "text-gray-900";
  const dotColor = variant === "dark" ? "text-primary-400" : "text-primary-600";

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} variant={variant} />
      {!markOnly && (
        <span className={`font-bold tracking-tight ${wordmarkColor} leading-none`}>
          <span className="lowercase">{STORE_NAME}</span>
          <span className={`${dotColor} ml-0.5`}>.</span>
        </span>
      )}
    </span>
  );

  if (!asLink) return content;

  return (
    <Link href="/" aria-label={`${STORE_NAME} home`} className="inline-flex items-center group">
      {content}
    </Link>
  );
}

export function LogoMark({
  size = 32,
  variant,
}: {
  size?: number;
  variant?: "light" | "dark";
}) {
  const tone = variant === "dark" ? "text-primary-500" : "text-primary-600";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`${tone} shrink-0`}
    >
      {/* Rounded badge */}
      <rect width="32" height="32" rx="8" fill="currentColor" />

      {/* Top paper tray */}
      <rect x="9" y="6" width="14" height="3" rx="1" fill="white" fillOpacity="0.9" />

      {/* Printer body */}
      <path
        d="M7 11h18a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1.5v3a2 2 0 0 1-2 2H10.5a2 2 0 0 1-2-2v-3H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
        fill="white"
      />

      {/* Output paper area */}
      <rect
        x="10.5"
        y="18"
        width="11"
        height="6"
        rx="1"
        fill="currentColor"
      />

      {/* Print lines */}
      <rect x="12" y="20" width="7" height="0.9" rx="0.45" fill="white" fillOpacity="0.9" />
      <rect x="12" y="22" width="5" height="0.9" rx="0.45" fill="white" fillOpacity="0.7" />

      {/* Status LED */}
      <circle cx="22" cy="14" r="0.9" fill="currentColor" />
    </svg>
  );
}
