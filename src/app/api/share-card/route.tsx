import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import React from 'react';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { imageUrl, price, description, currency } = await request.json();

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '600px',
            height: '800px',
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '32px',
          }}
        >
          {/* 图片区域 */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '500px',
              borderRadius: '24px',
              overflow: 'hidden',
              marginBottom: '32px',
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

          {/* 价格 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                color: '#9333EA',
                fontSize: '64px',
                fontWeight: 'bold',
                fontFamily: 'system-ui',
              }}
            >
              {currency === 'USD' ? '$' : 
               currency === 'GBP' ? '£' : 
               currency === 'EUR' ? '€' : 
               currency === 'CNY' ? '¥' : 
               currency}{price}
            </span>
          </div>

          {/* 描述 */}
          <p
            style={{
              color: '#4B5563',
              fontSize: '24px',
              textAlign: 'center',
              margin: '0',
              lineHeight: '1.5',
              fontFamily: 'system-ui',
              marginBottom: '60px',
            }}
          >
            {description}
          </p>

          {/* 底部品牌信息 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              bottom: '32px',
              left: '32px',
              right: '32px',
              background: '#000000',
              borderRadius: '16px',
              padding: '12px 24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {/* Logo */}
              <img
                src="https://pri-cio.co.uk/image/logo.png"
                alt="Logo"
                style={{
                  width: '32px',
                  height: '32px',
                }}
              />
              {/* 品牌名 */}
              <span
                style={{
                  color: '#FFFFFF',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  fontFamily: 'system-ui',
                }}
              >
                PRICIO AI
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 800,
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