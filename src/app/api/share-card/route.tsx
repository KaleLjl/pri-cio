import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    // 从请求体中解析参数
    const { imageUrl, price, description, currency } = await request.json();

    // 生成图片响应
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '900px',
            minHeight: '1200px',
            backgroundColor: '#000000',
            padding: '48px',
          }}
        >
          {/* 主要内容区域 - 白色卡片容器 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
              padding: '48px',
              borderRadius: '48px',
              marginBottom: '40px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* 图片区域 */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '675px',
                borderRadius: '36px',
                overflow: 'hidden',
                marginBottom: '48px',
              }}
            >
              <img
                src={imageUrl}
                alt={description}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>

            {/* 价格显示区域 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '48px',
              }}
            >
              <span
                style={{
                  color: '#9333EA',
                  fontSize: '96px',
                  fontWeight: 'bold',
                  fontFamily: 'sans-serif',
                }}
              >
                {
                  currency === 'GBP' ? '£' : 
                  currency === 'USD' ? '$' : 
                  currency === 'EUR' ? '€' : 
                  currency === 'CNY' ? '¥' : 
                  currency
                }
                {price}
              </span>
            </div>

            {/* 描述文本区域 */}
            <p
              style={{
                color: '#4B5563',
                fontSize: '36px',
                textAlign: 'center',
                margin: '0',
                lineHeight: '1.5',
                fontFamily: 'sans-serif',
              }}
            >
              {description}
            </p>
          </div>

          {/* 底部品牌标识区域 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '24px',
              padding: '24px 36px',
              width: '100%',
              minHeight: '120px',
              fontFamily: 'sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              {/* 左侧品牌区域 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <img
                  src="https://pri-cio.co.uk/image/logo.png"
                  alt="Logo"
                  style={{
                    width: '75px',
                    height: '75px',
                  }}
                />
                <span
                  style={{
                    color: '#FFFFFF',
                    fontSize: '36px',
                    fontWeight: 'bold',
                  }}
                >
                  PRICIO AI
                </span>
              </div>

              {/* 右侧二维码区域 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <img
                  src="https://pri-cio.co.uk/image/qrcode.png"
                  alt="QR Code"
                  style={{
                    width: '112px',
                    height: '112px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 900,
        height: 1500,
      }
    );

    // 返回 PNG 图片
    return new Response(await imageResponse.arrayBuffer(), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Share card generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate share card',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}