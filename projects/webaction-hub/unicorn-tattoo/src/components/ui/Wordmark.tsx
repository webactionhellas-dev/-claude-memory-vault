import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The real Unicorn Tattoo logo (white lockup, scraped from unicorntattoo.gr).
 * Control the displayed size with a height class on `className` (width auto).
 */
export default function Wordmark({
  className,
  priority = false
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Unicorn Tattoo"
      width={800}
      height={566}
      priority={priority}
      className={cn('w-auto', className)}
    />
  );
}
