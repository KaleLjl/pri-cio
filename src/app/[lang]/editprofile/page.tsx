import Profile from '@/components/main/EditProfile';
import { Locale } from '@/lib/i18n/i18n-config';

export default async function ProfilePage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  return <Profile />;
}