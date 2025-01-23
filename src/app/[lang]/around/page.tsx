import Around from '@/components/main/Around';
import { Locale } from '@/lib/i18n/i18n-config';

export default function AroundPage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  return <Around />;
}