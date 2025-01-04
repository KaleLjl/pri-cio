import type { Locale } from '@/lib/i18n/config'

interface UserPrompts {
  initialQuery: string;
  funnyEstimate: string;
  baseMarketPrice: string;
  marketResearchPrice: string;
}

const prompts: Record<Locale, UserPrompts> = {
  en: {
    initialQuery: "What do you see in this image?",
    funnyEstimate: "Give me a funny description and price estimate!",
    baseMarketPrice: "Based on the image, what's a fair second-hand market price?",
    marketResearchPrice: "Based on the market research and image, what's a fair second-hand market price?"
  },
  zh: {
    initialQuery: "这张图片中你看到了什么？",
    funnyEstimate: "只用中文回答,给我一个有趣的描述和价格估算！",
    baseMarketPrice: "只用中文回答,基于图片，给出一个合理的二手市场价格？",
    marketResearchPrice: "只用中文回答,根据市场调研和图片，给出一个合理的二手市场价格？"
  }
};

export const getPrompts = (locale: Locale = 'en'): UserPrompts => {
  return prompts[locale];
};