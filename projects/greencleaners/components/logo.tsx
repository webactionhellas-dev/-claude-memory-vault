import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The real Green Cleaners logo (hanger + tree). Processed to a transparent
 * background and trimmed. See public/brand/logo.png.
 *
 * - variant "default": sits on light backgrounds (navbar, mobile menu).
 * - variant "chip":    framed in a white rounded card for dark backgrounds
 *                       (footer), where the green wordmark would otherwise
 *                       disappear.
 */
export function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "chip";
}) {
  const img = (
    <Image
      src="/brand/logo.png"
      alt="Green Cleaners · Καθαριστήρια Πράσινης Τεχνολογίας"
      width={188}
      height={94}
      priority
      className={cn("w-auto", variant === "chip" ? "h-9" : "h-10 md:h-11")}
    />
  );

  if (variant === "chip") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-soft",
          className,
        )}
      >
        {img}
      </span>
    );
  }

  return <span className={cn("inline-flex items-center", className)}>{img}</span>;
}
