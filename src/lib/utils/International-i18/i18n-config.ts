export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'zh'] as const,
} as const;

export type Locale = (typeof i18n)['locales'][number];

// 获取请求的语言，如果不支持则返回默认语言
export function getLocale(locale: string): Locale {
  if (!i18n.locales.includes(locale as Locale)) {
    return i18n.defaultLocale;
  }
  return locale as Locale;
} 