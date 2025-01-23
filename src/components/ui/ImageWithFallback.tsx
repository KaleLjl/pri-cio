'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image, { ImageProps } from 'next/image';

interface ImageWithFallbackProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
  isAvatar?: boolean;
}

const ImageWithFallback = ({ src, alt, isAvatar = false, width, height, ...props }: ImageWithFallbackProps) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('1rem');

  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  useEffect(() => {
    if (containerRef.current) {
      // 获取容器的尺寸
      const containerWidth = containerRef.current.offsetWidth;
      // 根据容器宽度计算字体大小，这里使用容器宽度的40%作为字体大小
      const calculatedSize = Math.floor(containerWidth * 0.4);
      setFontSize(`${calculatedSize}px`);
    }
  }, [width, height]); // 当宽度或高度改变时重新计算

  const initial = useMemo(() => {
    if (!alt) return '?';
    // Split the name by spaces and get initials for each part
    const initials = alt.split(' ')
      .map((part: string) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2); // Take up to 2 initials
    return initials || '?';
  }, [alt]);

  if (error || !imgSrc) {
    return (
      <div 
        ref={containerRef}
        className={`w-full h-full bg-purple-600 flex items-center justify-center text-white font-semibold ${isAvatar ? 'rounded-full' : 'rounded-[2rem]'}`}
        style={{ fontSize }}
      >
        {initial}
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => {
        setError(true);
      }}
    />
  );
};

export default ImageWithFallback; 