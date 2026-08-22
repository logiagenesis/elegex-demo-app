import { ShieldCheck } from "lucide-react";
import React from "react";

type BrandMarkProps = {
  className?: string;
  label?: string;
};

export function BrandMark({
  className = "h-10 w-10",
  label = "Elegex",
}: BrandMarkProps) {
  return (
    <span
      aria-label={label}
      className={`grid shrink-0 place-items-center rounded-xl bg-[#61A0FF] text-[#102447] shadow-[0_8px_20px_rgba(97,160,255,0.28)] ${className}`}
      role="img"
    >
      <ShieldCheck
        aria-hidden="true"
        className="h-[58%] w-[58%] stroke-[2.4]"
      />
    </span>
  );
}
