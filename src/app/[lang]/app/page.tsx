import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ImageCapture from '@/components/main/App';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/i18n-config';

export default async function AppPage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  const session = await auth();
  if (!session) {
    redirect('/signin')
  }
  const dict = await getDictionary(lang);
  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 space-y-4 pt-4 justify-center">
      <div className="w-full flex justify-center pt-4 pb-2">
      </div>
      <ImageCapture dict={dict} />
    </div>
  );
}