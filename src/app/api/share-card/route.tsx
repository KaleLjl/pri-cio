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
            width: '2400px',
            minHeight: '3200px',
            backgroundColor: '#000000',
            padding: '128px',
            // 若需要进一步兼容，可尝试把 padding 改为数值，如 padding: 128
          }}
        >
          {/* 主要内容区域 - 白色卡片容器 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
              padding: '128px',
              borderRadius: '128px',
              marginBottom: '80px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* 图片区域 */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '1800px',
                borderRadius: '96px',
                overflow: 'hidden',
                marginBottom: '64px',
              }}
            >
              <img
                src={imageUrl}
                alt={description}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'rotate(90deg)',
                  imageOrientation: 'from-image',
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
                  fontSize: '256px',
                  fontWeight: 'bold',
                  fontFamily: 'sans-serif',
                }}
              >
                {
                  currency === 'USD' ? '$' : 
                  currency === 'GBP' ? '£' : 
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
                fontSize: '96px',
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
              background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
              borderRadius: '64px',
              padding: '64px 96px',
              width: '100%',
              minHeight: '320px',
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
                  gap: '32px',
                  flex: 1,
                }}
              >
                <img
                  src="https://pri-cio.co.uk/image/logo.png"
                  alt="Logo"
                  style={{
                    width: '200px',
                    height: '200px',
                  }}
                />
                <span
                  style={{
                    color: '#FFFFFF',
                    fontSize: '96px',
                    fontWeight: 'bold',
                    // fontFamily: 'sans-serif',
                  }}
                >
                  PRICIO AI
                </span>
              </div>

              {/* 右侧二维码区域 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flex: 1,
                }}
              >
                <img
                  src="https://pri-cio.co.uk/image/qrcode.png"
                  alt="QR Code"
                  style={{
                    width: '240px',
                    height: '240px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ),
      {
        // 你可以根据需要调整宽高
        width: 2400,
        height: 4000,
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