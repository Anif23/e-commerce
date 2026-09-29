import { useState } from 'react';

import { cn } from '../../lib/cn';
import { assetUrl } from '../../lib/assets';

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
}

/**
 * Images are lazy-loaded and fade in once decoded. A broken URL falls back to
 * the local placeholder instead of showing a torn-image icon.
 */
export const SmartImage = ({ src, alt, className, ...rest }: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={failed ? '/placeholder.svg' : assetUrl(src)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn(
        'h-full w-full object-cover transition-opacity duration-500',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
      {...rest}
    />
  );
};
