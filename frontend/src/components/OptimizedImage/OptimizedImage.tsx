import React, { useState, useRef, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  loading?: 'lazy' | 'eager';
  quality?: number;
  sizes?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'skeleton' | 'none';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Generate WebP and AVIF versions for better compression
const generateImageSrcSet = (src: string, quality: number = 75) => {
  const baseSrc = src.split('.').slice(0, -1).join('.');
  const ext = src.split('.').pop();
  
  return {
    webp: `${baseSrc}.webp`,
    avif: `${baseSrc}.avif`,
    original: src,
    // Generate different sizes for responsive images
    srcSet: [
      `${baseSrc}-400w.${ext} 400w`,
      `${baseSrc}-800w.${ext} 800w`,
      `${baseSrc}-1200w.${ext} 1200w`,
      `${baseSrc}-1600w.${ext} 1600w`,
    ].join(', ')
  };
};

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  quality = 75,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  placeholder = 'skeleton',
  blurDataURL,
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'lazy' && imgRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        },
        {
          rootMargin: '50px', // Start loading 50px before entering viewport
          threshold: 0.1
        }
      );

      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  const imageSources = generateImageSrcSet(src, quality);

  // Show placeholder while loading or not in view
  if ((loading === 'lazy' && !isInView) || isLoading) {
    return (
      <Box
        ref={imgRef}
        sx={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden'
        }}
        className={className}
      >
        {placeholder === 'skeleton' && (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            animation="wave"
          />
        )}
        {placeholder === 'blur' && blurDataURL && (
          <img
            src={blurDataURL}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit,
              filter: 'blur(10px)',
              transform: 'scale(1.1)'
            }}
          />
        )}
      </Box>
    );
  }

  // Show error fallback
  if (hasError) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.200',
          color: 'text.secondary'
        }}
        className={className}
      >
        Failed to load image
      </Box>
    );
  }

  return (
    <picture>
      {/* Modern formats for better compression */}
      <source srcSet={imageSources.avif} type="image/avif" />
      <source srcSet={imageSources.webp} type="image/webp" />
      
      {/* Fallback for older browsers */}
      <img
        ref={imgRef}
        src={imageSources.original}
        srcSet={imageSources.srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          objectFit,
          transition: 'opacity 0.3s ease-in-out',
          opacity: isLoading ? 0 : 1
        }}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
};

export default OptimizedImage;
