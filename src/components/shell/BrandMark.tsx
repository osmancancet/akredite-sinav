import { cn } from "@/lib/utils";

/** AkrediteSınav marka işareti: mühür içinde jeodezik kafes (kasa + akreditasyon). */
export function BrandMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  const ink = inverted ? "#fafafa" : "#18181b";
  const paper = inverted ? "#18181b" : "#fafafa";
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill={ink} />
      <g fill="none" stroke={paper} strokeWidth="1.1" strokeLinejoin="round" opacity="0.92">
        <path d="M16 6.5 24.2 11.2v9.6L16 25.5l-8.2-4.7v-9.6z" />
        <path d="M16 6.5v19M7.8 11.2l16.4 9.6M24.2 11.2 7.8 20.8" opacity="0.45" />
      </g>
      <circle cx="16" cy="16" r="2.4" fill="#2bb3a3" />
    </svg>
  );
}
