import { cn } from '@/lib/utils';

/**
 * Refined photo placeholder. Renders a gallery-like dark slot with a label so
 * compositions read as intentional before real photography is dropped in.
 *
 * TODO: client asset - replace these <Frame> slots with <Image> once licensed
 * studio photos exist. Example:
 *   <Image src={item.src} alt={alt} fill sizes="(max-width:768px) 100vw, 33vw"
 *          placeholder="blur" blurDataURL={...} className="object-cover" />
 */
export default function Frame({
  label,
  className,
  hover = true,
  tone = 0
}: {
  label?: string;
  className?: string;
  hover?: boolean;
  tone?: number;
}) {
  const tones = ['#121212', '#161616', '#0f0f0f', '#181818', '#101010'];
  const bg = tones[tone % tones.length];

  return (
    <div
      className={cn(
        'group/frame relative h-full w-full overflow-hidden bg-ink-700',
        className
      )}
      style={{ backgroundColor: bg }}
      data-cursor="hover"
    >
      <div
        className={cn(
          'absolute inset-0 transition-transform duration-[1.2s] ease-ink',
          hover && 'group-hover/frame:scale-[1.06]'
        )}
        style={{
          background:
            'radial-gradient(120% 80% at 30% 10%, rgba(255,255,255,0.05), transparent 55%), radial-gradient(120% 120% at 80% 100%, rgba(46,150,176,0.07), transparent 50%)'
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 9px)'
        }}
        aria-hidden="true"
      />
      {label && (
        <span className="absolute bottom-4 left-4 z-10 font-sans text-[10px] uppercase tracking-eyebrow text-bone-dim">
          {label}
        </span>
      )}
      <span className="absolute right-4 top-4 z-10 h-1.5 w-1.5 rounded-full bg-bone-faint/40" aria-hidden="true" />
    </div>
  );
}
