import LandingContent from '@/components/main/LandingContent';
import { Locale } from '@/lib/i18n/i18n-config';

export default function HomePage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  return <LandingContent />;
}







