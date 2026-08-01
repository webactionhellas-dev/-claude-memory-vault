import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { dict, type Content, type Lang } from '@/i18n/content'

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  c: Content
}

const LanguageContext = createContext<Ctx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('wa-lang') : null
    return saved === 'el' ? 'el' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('wa-lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const toggle = () => setLang((l) => (l === 'en' ? 'el' : 'en'))

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, c: dict[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}
