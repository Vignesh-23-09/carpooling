import { useState } from 'react'

export default function StarRating({ rating = 0, onRate, size = 28, readonly = false }) {
  const [hovered, setHovered] = useState(0)

  const handleClick = (star) => {
    if (!readonly && onRate) onRate(star)
  }

  return (
    <div className="star-rating-wrap">
      <div className="star-rating-stars">
        {[1, 2, 3, 4, 5].map(star => {
          const filled = readonly ? star <= Math.round(rating) : star <= (hovered || rating)
          return (
            <span
              key={star}
              className={`star-rating-star ${filled ? 'filled' : ''} ${readonly ? 'readonly' : 'clickable'}`}
              style={{ fontSize: size, cursor: readonly ? 'default' : 'pointer' }}
              onClick={() => handleClick(star)}
              onMouseEnter={() => !readonly && setHovered(star)}
              onMouseLeave={() => !readonly && setHovered(0)}
            >
              ★
            </span>
          )
        })}
      </div>
      {!readonly && rating > 0 && (
        <span className="star-rating-number">{rating}/5</span>
      )}
    </div>
  )
}
