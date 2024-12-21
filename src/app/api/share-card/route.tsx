import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import React from 'react';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { imageUrl, price, description, currency } = await request.json();

    // 加载字体
    const interFont = await fetch(
      new URL('/fonts/Inter-VariableFont_opsz,wght.ttf', process.env.NEXT_PUBLIC_BASE_URL)
    ).then((res) => res.arrayBuffer());

    const imageResponse = new ImageResponse(
      (
        // 最外层容器 - 整个卡片的背景
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '2400px',
            minHeight: '3200px',
            backgroundColor: '#F3F4F6', // 浅灰色背景
            padding: '128px',
          }}
        >
          {/* 主要内容区域 - 白色卡片容器 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              backgroundColor: 'white',
              padding: '128px',
              borderRadius: '128px',
              marginBottom: '80px',
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
                {currency === 'USD' ? '$' : 
                 currency === 'GBP' ? '£' : 
                 currency === 'EUR' ? '€' : 
                 currency === 'CNY' ? '¥' : 
                 currency}{price}
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
              background: '#000000',
              borderRadius: '64px',
              padding: '64px 96px',
              width: '100%',
              minHeight: '320px',
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '48px',
                flex: 1,
              }}>
                <img
                  src="https://pri-cio.co.uk/image/logo.png"
                  alt="Logo"
                  style={{
                    width: '180px',
                    height: '180px',
                  }}
                />
                <span
                  style={{
                    color: '#FFFFFF',
                    fontSize: '100px',
                    fontWeight: 'bold',
                    fontFamily: 'Inter Variable, system-ui, sans-serif',
                    display: 'block',
                  }}
                >
                  PRICIO AI
                </span>
              </div>

              {/* 右侧二维码区域 */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                flex: 1,
              }}>
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
        width: 2400,
        height: 4000,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        fonts: [
          {
            name: 'Inter Variable',
            data: interFont,
            weight: 400,
            style: 'normal',
          }
        ],
      }
    );

    return new Response(await imageResponse.arrayBuffer(), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Share card generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate share card' },
      { status: 500 }
    );
  }
}