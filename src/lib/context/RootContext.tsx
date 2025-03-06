"use client";

import { SessionProvider } from "next-auth/react";
import { CurrentUserProvider } from "@/lib/context/CurrentUserContext";
import { QueryProvider } from "@/lib/context/QueryContext";
import { LanguageProvider } from "@/lib/context/LanguageContext";
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/i18n-config';

interface RootContextProps {
  children: React.ReactNode;
  lang: Locale;
  dict: Dictionary;
}

export function RootProvider({ children, lang, dict }: RootContextProps) {
  return (
    <SessionProvider>
      <CurrentUserProvider>
        <QueryProvider>
          <LanguageProvider initialLang={lang} initialDict={dict}>
              {children}
          </LanguageProvider>
        </QueryProvider>
      </CurrentUserProvider>
    </SessionProvider>
  );
} 