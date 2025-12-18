"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "zh"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh")

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language
    if (saved) setLanguageState(saved)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
  }

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}

export function useTranslation() {
  const { language } = useLanguage()

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        dashboard_title: "KOL Analytics Dashboard",
        dashboard_subtitle: "Track and analyze Twitter influencer metrics",
        search_placeholder: "Search KOLs by name or username...",
      },
      zh: {
        dashboard_title: "KOL 分析仪表板",
        dashboard_subtitle: "追踪和分析 Twitter 影响力指标",
        search_placeholder: "按名称或用户名搜索 KOL...",
      },
    }

    return translations[language]?.[key] || key
  }

  return { t, language }
}
