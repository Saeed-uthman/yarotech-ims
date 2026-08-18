import React, { useState } from 'react';
import { Pill } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 'square',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getDimensionClass = () => {
    switch (size) {
      case 'xs': return 'w-8 h-8';
      case 'sm': return 'w-10 h-10';
      case 'md': return 'w-14 h-14';
      case 'lg': return 'w-20 h-20';
      case 'xl': return 'w-full max-w-sm';
      default: return 'w-12 h-12';
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square';
      case 'video': return 'aspect-video';
      default: return '';
    }
  };

  const isImageValid = Boolean(src && !hasError);

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 border border-slate-200/80 rounded-lg flex-shrink-0 flex items-center justify-center ${getDimensionClass()} ${getAspectClass()} ${className}`}
    >
      {isImageValid ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}
          <img
            src={src}
            alt={alt || 'Pharmaceutical product image'}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-400 bg-slate-50 select-none">
          <Pill className="w-1/2 h-1/2 max-w-6 max-h-6 text-slate-300 stroke-1" />
        </div>
      )}
    </div>
  );
};
