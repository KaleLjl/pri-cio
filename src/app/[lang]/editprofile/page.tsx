import Profile from '@/components/main/EditProfile';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/i18n-config';

export default async function ProfilePage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang);
  return <Profile dict={dict} />;
}