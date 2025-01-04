import 'server-only'
import type { Locale } from './config'

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  zh: () => import('./dictionaries/zh.json').then((module) => module.default),
} as const

export const getDictionary = async (locale: Locale) => {
  try {
    return dictionaries[locale]()
  } catch (error) {
    console.error(`Failed to load dictionary for locale: ${locale}`, error)
    // 如果加载失败，返回英文字典作为后备
    return dictionaries.en()
  }
}

// 定义字典类型，这样在组件中使用时可以获得类型提示
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
