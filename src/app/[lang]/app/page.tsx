import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ImageCapture from '@/components/ImageCapture';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  params: Promise<{
    lang: Locale
  }>
}

export default async function AppPage(props: Props) {
  // 检查认证
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }

  // 获取翻译
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  
  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 space-y-4 pt-4 justify-center">
      <div className="w-full flex justify-center pt-4 pb-2">
      </div>
      <ImageCapture dict={dict} />
    </div>
  );
}