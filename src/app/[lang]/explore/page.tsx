import Explore from '@/components/main/Explore';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/i18n-config';

export default async function ExplorePage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang);
  return <Explore explores={[]} dict={dict} />;
}