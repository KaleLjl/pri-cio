import { getDictionary } from '@/lib/i18n/get-dictionary'
import type { Locale } from '@/lib/i18n/config'
import LandingContent from '@/components/LandingContent'

interface Props {
  params: Promise<{
    lang: Locale
  }>
}

export default async function HomePage(props: Props) {
  const { lang } = await props.params
  const dict = await getDictionary(lang)
  
  return <LandingContent dict={dict} />
}







