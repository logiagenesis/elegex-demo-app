import { useId } from "react";

type BrandMarkProps = {
  variant?: "full" | "compact" | "mark";
  inverted?: boolean;
  className?: string;
};

function Mark({ className = "" }: { className?: string }) {
  const idPrefix = useId().replace(/:/g, "");
  const faceId = `${idPrefix}-face`;
  const edgeId = `${idPrefix}-edge`;
  const shapeId = `${idPrefix}-e`;

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 500 500">
      <defs>
        <linearGradient id={faceId} x1="0.1" x2="0.9" y1="0" y2="1">
          <stop offset="0" stopColor="#F7FAFC" />
          <stop offset="0.18" stopColor="#D5E0EB" />
          <stop offset="0.36" stopColor="#A2B4C6" />
          <stop offset="0.52" stopColor="#EDF3F8" />
          <stop offset="0.68" stopColor="#AEC0D1" />
          <stop offset="0.84" stopColor="#7B8FA4" />
          <stop offset="1" stopColor="#B9C8D8" />
        </linearGradient>
        <linearGradient id={edgeId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#8A9BAC" />
          <stop offset="1" stopColor="#41505F" />
        </linearGradient>
        <path
          id={shapeId}
          d="M105 78 H392 V152 H180 V212 H358 V282 H180 V344 H392 V418 H105 Z"
        />
      </defs>
      <use href={`#${shapeId}`} x="17" y="17" fill={`url(#${edgeId})`} />
      <use href={`#${shapeId}`} fill={`url(#${faceId})`} />
      <use
        href={`#${shapeId}`}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.5"
        strokeWidth="3"
      />
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
