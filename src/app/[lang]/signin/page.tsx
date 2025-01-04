import { getDictionary } from '@/lib/i18n/get-dictionary'
import type { Locale } from '@/lib/i18n/config'
import SigninForm from '@/components/SigninForm'

interface Props {
  params: Promise<{
    lang: Locale
  }>
}

export default async function SigninPage(props: Props) {
  const { lang } = await props.params
  const dict = await getDictionary(lang)
  
  return <SigninForm dict={dict} />
}