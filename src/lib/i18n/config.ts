export const i18n = {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
  } as const
  
  // 导出类型以便在其他文件中使用
  export type Locale = (typeof i18n)['locales'][number]