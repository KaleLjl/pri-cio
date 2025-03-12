"use client";

import { SessionProvider } from "next-auth/react";
import { CurrentUserProvider } from "@/context/CurrentUserContext";
import { QueryProvider } from "@/context/QueryContext";
import { LanguageProvider } from "@/context/LanguageContext";
import type { Dictionary } from '@/lib/utils/International-i18/types';
import type { Locale } from '@/lib/utils/International-i18/i18n-config';

// Note: We don't need to add ChatProvider here since it's only used in the Chat component tree
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