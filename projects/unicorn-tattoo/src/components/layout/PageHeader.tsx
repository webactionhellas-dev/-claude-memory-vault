import { cn } from '@/lib/utils';

export default function PageHeader({
  kicker,
  title,
  subtitle,
  className
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'edge mx-auto max-w-edge pb-12 pt-[120px] sm:pb-16 sm:pt-[180px]',
        className
      )}
    >
      <p className="eyebrow mb-6 flex items-center gap-3">
        <span className="inline-block h-px w-10 bg-violet" />
        {kicker}
      </p>
      <h1 className="font-display text-[clamp(2.75rem,9vw,7rem)] uppercase leading-[0.86] tracking-[-0.01em] text-bone">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-7 max-w-2xl text-balance text-base leading-relaxed text-bone-dim sm:text-lg">
          {subtitle}
        </p>
      )}
    </header>
  );
}
