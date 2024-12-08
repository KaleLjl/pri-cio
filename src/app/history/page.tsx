import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HistoryPage() {
  const session = await auth()
  if (!session) {
    redirect('/signin')
  }
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">历史记录</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>欢迎, {session?.user?.name}</p>
        {/* 这里可以添加历史记录的具体内容 */}
      </div>
    </div>
  )
}
