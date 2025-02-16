'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image, { ImageProps } from 'next/image';

interface ImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  src: string | undefined;
  isAvatar?: boolean;
  alt: string;
}

export default function ImageWithFallback({
  src,
  isAvatar = false,
  alt,
  ...props
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('16px');

  useEffect(() => {
    if (error && isAvatar && containerRef.current) {
      const containerSize = containerRef.current.offsetWidth;
      setFontSize(`${containerSize * 0.4}px`);
    }
  }, [error, isAvatar]);

  if (error && isAvatar) {
    return (
      <div 
        ref={containerRef}
        className="w-full h-full bg-purple-600 flex items-center justify-center rounded-full"
        style={{
          fontSize,
          fontWeight: 600,
          color: 'white',
          lineHeight: 1,
          letterSpacing: '-0.05em'
        }}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      src={src || '/fallback.jpg'}
      onError={() => setError(true)}
    />
  );
} 