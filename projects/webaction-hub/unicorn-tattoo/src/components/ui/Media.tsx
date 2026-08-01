import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Real photo tile using next/image (AVIF/WebP, responsive sizes, lazy by default).
 * Grayscale at rest → full colour on hover keeps the colour piercing shots cohesive
 * with the black-and-white editorial aesthetic.
 */
export default function Media({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, 33vw',
  className,
  imgClassName,
  priority = false,
  grayscale = false,
  hover = true,
  position,
  quality = 75
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  grayscale?: boolean;
  hover?: boolean;
  position?: string;
  quality?: number;
}) {
  return (
    <div
      className={cn('group/media relative h-full w-full overflow-hidden bg-ink-700', className)}
      data-cursor="hover"
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        className={cn(
          'object-cover transition-all duration-[1100ms] ease-ink',
          grayscale && 'grayscale group-hover/media:grayscale-0',
          hover && 'group-hover/media:scale-[1.05]',
          imgClassName
        )}
        style={position ? { objectPosition: position } : undefined}
      />
      <div className="pointer-events-none absolute inset-0 bg-ink/10" />
    </div>
  );
}
