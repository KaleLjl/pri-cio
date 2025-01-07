import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import clientPromise from '@/lib/mongodb'
import DisplayHistory from '@/components/main/History'

async function getHistoryData(email: string) {
  const client = await clientPromise;
  const db = client.db("pri-cio");
  const histories = await db.collection("histories")
    .find({ userEmail: email })
    .sort({ createdAt: -1 })
    .toArray();
  
  return JSON.parse(JSON.stringify(histories));
}

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/signin')
  }

  const histories = await getHistoryData(session.user.email);

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <DisplayHistory histories={histories} />
    </div>
  );
}