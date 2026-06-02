// @refresh reset
import { createContext, useContext, useState, ReactNode } from "react";
import { translations, Language } from "@/i18n/translations";

type T = typeof translations["en"];

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: T;
};

export const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("fincava_lang") as Language | null;
      if (saved === "en" || saved === "es") return saved;
      const browser = navigator.language || "";
      return browser.toLowerCase().startsWith("es") ? "es" : "en";
    } catch {
      return "en";
    }
  });

  const setLang = (l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem("fincava_lang", l);
    } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // During HMR or initialization, provide a sensible default instead of throwing.
    // This prevents crashes during dev server hot reloads before context re-initializes.
    if (import.meta.env.DEV) {
      return {
        lang: "en" as const,
        setLang: () => {},
        t: translations["en"],
      };
    }
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
