import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import clientPromise from '@/lib/mongodb'
import DisplayHistory from '@/components/main/History'
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/i18n-config';

async function getHistoryData(email: string) {
  const client = await clientPromise;
  const db = client.db("pri-cio");
  const histories = await db.collection("histories")
    .find({ userEmail: email })
    .sort({ createdAt: -1 })
    .toArray();
  
  return JSON.parse(JSON.stringify(histories));
}

export default async function HistoryPage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/signin')
  }

  const histories = await getHistoryData(session.user.email);
  const dict = await getDictionary(lang);

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <DisplayHistory histories={histories} dict={dict} />
    </div>
  );
}