"use client";

import type { ReactNode } from "react";

type MagneticButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  strength?: number;
  target?: string;
  rel?: string;
  ariaLabel?: string;
};

/**
 * Static button/link wrapper. (The magnetic cursor-follow effect was removed
 * per user preference — no reactive movement.) Kept as a component so existing
 * call sites don't need to change.
 */
export function MagneticButton({
  children,
  href,
  onClick,
  className,
  target,
  rel,
  ariaLabel,
}: MagneticButtonProps) {
  if (href) {
    return (
      <a href={href} target={target} rel={rel} aria-label={ariaLabel} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={className}>
      {children}
    </button>
  );
}
