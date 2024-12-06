import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      {/* Video Background */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
      >
        {/* Ensure the file path is correct */}
        <source src="/public/video/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Content */}
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">来到我们的网站</h1>
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">关于我们</h2>
            <p className="text-gray-600">
              这是一个示例页面,展示了一些基本的布局和设计元素。您可以根据需要自定义内容。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-3">特色功能</h3>
              <ul className="list-disc list-inside text-gray-600">
                <li>响应式设计</li>
                <li>现代化界面</li>
                <li>用户友好</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-3">联系我们</h3>
              <p className="text-gray-600">
                邮箱: contact@example.com<br />
                电话: (123) 456-7890
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

