import React from 'react';

import {
  createBookCover,
  type BookCover,
  type CreateBookCoverInput,
} from '@/lib/presentation/createBookCover';

type UseCoverResult = {
  cover: BookCover;
  handleImageError: () => void;
};

export function useCover({
  coverUrl,
  seed,
  title,
}: CreateBookCoverInput): UseCoverResult {
  const [imageFailed, setImageFailed] = React.useState(false);
  const baseCover = React.useMemo(
    () =>
      createBookCover({
        coverUrl,
        seed,
        title,
      }),
    [coverUrl, seed, title]
  );

  React.useEffect(() => {
    setImageFailed(false);
  }, [coverUrl, seed, title]);

  if (baseCover.kind === 'image' && imageFailed) {
    return {
      cover: baseCover.fallback,
      handleImageError: () => {
        setImageFailed(true);
      },
    };
  }

  return {
    cover: baseCover,
    handleImageError: () => {
      setImageFailed(true);
    },
  };
}
