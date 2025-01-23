import Explore from '@/components/main/Explore';
import { Locale } from '@/lib/i18n/i18n-config';

export default async function ExplorePage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  return <Explore explores={[]} />;
}