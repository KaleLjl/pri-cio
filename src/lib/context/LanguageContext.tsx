'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/i18n-config';

interface LanguageContextType {
  lang: Locale;
  dict: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ 
  children,
  initialLang,
  initialDict,
}: { 
  children: ReactNode;
  initialLang: Locale;
  initialDict: Dictionary;
}) {
  return (
    <LanguageContext.Provider value={{ lang: initialLang, dict: initialDict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 