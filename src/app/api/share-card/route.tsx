import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import React from 'react';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { imageUrl, price, description, currency } = await request.json();

    const imageResponse = new ImageResponse(
      (
        // 最外层容器 - 整个卡片的背景
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '1200px',
            minHeight: '1600px',
            backgroundColor: '#F3F4F6', // 浅灰色背景
            padding: '64px',
          }}
        >
          {/* 主要内容区域 - 白色卡片容器 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              backgroundColor: 'white',
              padding: '64px',
              borderRadius: '64px',
              marginBottom: '80px',
            }}
          >
            {/* 图片区域 */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '900px',
                borderRadius: '48px',
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
                  fontSize: '128px',
                  fontWeight: 'bold',
                  fontFamily: 'Arial, Helvetica, sans-serif',
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
                fontSize: '48px',
                textAlign: 'center',
                margin: '0',
                lineHeight: '1.5',
                fontFamily: 'Arial, Helvetica, sans-serif',
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
              borderRadius: '32px',
              padding: '24px 48px',
              minWidth: '320px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '32px',
              }}
            >
              <img
                src="https://pri-cio.co.uk/image/logo.png"
                alt="Logo"
                style={{
                  width: '64px',
                  height: '64px',
                }}
              />
              <span
                style={{
                  color: '#FFFFFF',
                  fontSize: '36px',
                  fontWeight: 'bold',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                }}
              >
                PRICIO AI
              </span>
              <img
                src="https://pri-cio.co.uk/image/qrcode.png"
                alt="QR Code"
                style={{
                  width: '64px',
                  height: '64px',
                  marginLeft: '16px',
                }}
              />
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 2000,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        }
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