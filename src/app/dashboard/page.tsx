import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }``

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">仪表盘</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>欢迎, {session.user?.name}</p>
        {/* 这里可以添加仪表盘的具体内容 */}
      </div>
    </div>
  )
}
