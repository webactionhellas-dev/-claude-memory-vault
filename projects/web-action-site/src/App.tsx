import { motion, useScroll, useSpring } from 'framer-motion'

import { Navbar } from '@/components/site/Navbar'
import { Footer } from '@/components/site/Footer'
import Home from '@/pages/Home'

export default function App() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })

  return (
    <div className="relative flex min-h-[100svh] flex-col">
      {/* scroll progress bar */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-primary via-accent to-primary"
      />
      <Navbar />
      <main className="flex-1">
        <Home />
      </main>
      <Footer />
    </div>
  )
}
