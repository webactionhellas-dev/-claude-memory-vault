interface CosmicParallaxBgProps {
  /** kept for API compatibility (title/subtitle are not rendered) */
  head?: string
  text?: string
  loop?: boolean
  className?: string
}

/**
 * Cosmic background for the hero — just the brand horizon glow and the Earth
 * planet (styled in index.css), over a transparent base. The starfield is now
 * the single, site-wide <StarsBackground> that sits behind everything, so the
 * hero shares the exact same stars as the rest of the page.
 */
export function CosmicParallaxBg({ className = '' }: CosmicParallaxBgProps) {
  return (
    <div className={`cosmic-parallax-container ${className}`}>
      <div id="horizon">
        <div className="glow"></div>
      </div>
      <div id="earth"></div>
    </div>
  )
}
