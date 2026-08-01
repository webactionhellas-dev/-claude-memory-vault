import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rotating circular "wax seal" badge with text on a circular path.
 * A premium, asset-free signature mark.
 */
export function Seal({
  text = "GREEN CLEANERS · ΟΙΚΟΛΟΓΙΚΗ ΤΕΧΝΟΛΟΓΙΑ · ",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-square", className)} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="h-full w-full motion-safe:animate-spin-slow">
        <defs>
          <path id="seal-curve" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
        </defs>
        <text className="fill-current text-[12.5px] font-semibold uppercase tracking-[0.28em]">
          <textPath href="#seal-curve" startOffset="0">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="relative flex h-[42%] w-[42%] items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-current opacity-20" />
          <Leaf className="h-1/2 w-1/2" />
        </span>
      </span>
    </div>
  );
}
