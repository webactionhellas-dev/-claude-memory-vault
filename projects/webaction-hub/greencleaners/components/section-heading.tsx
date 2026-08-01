import { cn } from "@/lib/utils";
import { Reveal } from "@/components/reveal";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  index,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  /** Optional editorial index, e.g. "01". */
  index?: string;
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {index && (
        <div
          className={cn("section-index mb-1 select-none", align === "center" && "mx-auto w-fit")}
          aria-hidden
        >
          {index}
        </div>
      )}
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="display mt-3 text-[clamp(2.1rem,5vw,3.6rem)] text-foreground text-balance">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg",
            align === "center" && "mx-auto max-w-xl",
          )}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
