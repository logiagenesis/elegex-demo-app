import { useId } from "react";

type BrandMarkProps = {
  variant?: "full" | "compact" | "mark";
  inverted?: boolean;
  className?: string;
};

function Mark({ className = "" }: { className?: string }) {
  const idPrefix = useId().replace(/:/g, "");
  const gradientId = `${idPrefix}-chrome`;
  const maskId = `${idPrefix}-slot`;

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id={gradientId} x1="0.08" x2="0.92" y1="0" y2="1">
          <stop offset="0" stopColor="#FAFCFE" />
          <stop offset="0.14" stopColor="#DCE6F0" />
          <stop offset="0.31" stopColor="#A9BCCE" />
          <stop offset="0.46" stopColor="#E8F0F7" />
          <stop offset="0.58" stopColor="#B6C7D8" />
          <stop offset="0.72" stopColor="#7C90A5" />
          <stop offset="0.86" stopColor="#C6D4E1" />
          <stop offset="1" stopColor="#8395AA" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="1024" height="1024" fill="#000" />
          <g fill="#fff">
            <rect x="232" y="168" width="250" height="712" rx="28" />
            <rect x="456" y="160" width="344" height="196" rx="28" />
            <rect x="456" y="430" width="306" height="186" rx="28" />
            <rect x="456" y="692" width="344" height="196" rx="28" />
          </g>
          <rect x="336" y="318" width="40" height="398" rx="20" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <rect width="1024" height="1024" fill={`url(#${gradientId})`} />
      </g>
    </svg>
  );
}

export function BrandMark({
  variant = "full",
  inverted = false,
  className = "",
}: BrandMarkProps) {
  if (variant === "mark") {
    return (
      <span
        aria-label="Elegex"
        className={`inline-flex ${className}`}
        role="img"
      >
        <Mark className="h-full w-full" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${
        inverted ? "text-white" : "text-[#101827]"
      } ${className}`}
    >
      <Mark className="h-7 w-7 shrink-0" />
      <span className="text-[1.05rem] font-black tracking-[0.13em]">
        ELEGEX
      </span>
      {variant === "full" ? (
        <span
          className={`text-[9px] font-bold tracking-[0.18em] ${
            inverted ? "text-[#A8C8FF]" : "text-[#667085]"
          }`}
        >
          OPERATIONS
        </span>
      ) : null}
    </span>
  );
}
