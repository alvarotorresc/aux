import { useState } from 'react';

interface StarRatingProps {
  /** Current rating value (0-5, supports halves). null = no rating yet */
  rating: number | null;
  /** Callback when user clicks a star. Omit for read-only display */
  onRate?: (rating: number) => void;
  /** Star icon size in px */
  size?: number;
}

const STARS = [1, 2, 3, 4, 5] as const;
const STAR_POINTS =
  '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';

/**
 * Star rating component with half-star support (0 to 5 in 0.5 increments).
 *
 * Each star is split into left half (star - 0.5) and right half (star).
 * Hover previews the rating before clicking. Read-only when onRate is omitted.
 */
export function StarRating({ rating, onRate, size = 22 }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating ?? rating ?? 0;
  const isInteractive = typeof onRate === 'function';

  return (
    <div
      className={`flex gap-0.5 ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
      onMouseLeave={() => setHoverRating(null)}
      role={isInteractive ? 'radiogroup' : 'img'}
      aria-label={`Rating: ${rating ?? 0} out of 5 stars`}
    >
      {STARS.map((star) => {
        const filled = displayRating >= star;
        const halfFilled = !filled && displayRating >= star - 0.5;

        return (
          <div key={star} className="relative" style={{ width: size, height: size }}>
            {/* Left half — hover/click for star - 0.5 */}
            {isInteractive && (
              <button
                type="button"
                className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer"
                style={{ background: 'transparent', border: 'none', padding: 0 }}
                onMouseEnter={() => setHoverRating(star - 0.5)}
                onClick={() => onRate(star - 0.5)}
                aria-label={`${star - 0.5} stars`}
              />
            )}
            {/* Right half — hover/click for star */}
            {isInteractive && (
              <button
                type="button"
                className="absolute right-0 top-0 z-10 h-full w-1/2 cursor-pointer"
                style={{ background: 'transparent', border: 'none', padding: 0 }}
                onMouseEnter={() => setHoverRating(star)}
                onClick={() => onRate(star)}
                aria-label={`${star} stars`}
              />
            )}
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {/* Background star (empty) */}
              <polygon points={STAR_POINTS} className="fill-star-empty" />
              {/* Filled or half-filled star */}
              {(filled || halfFilled) && (
                <polygon
                  points={STAR_POINTS}
                  className="fill-star"
                  clipPath={halfFilled ? 'inset(0 50% 0 0)' : undefined}
                />
              )}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
