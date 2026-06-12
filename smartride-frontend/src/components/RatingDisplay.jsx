import StarRating from './StarRating'

export default function RatingDisplay({ averageRating = 0, totalReviews = 0 }) {
  if (totalReviews === 0) {
    return (
      <div className="rating-display">
        <StarRating rating={0} readonly size={18} />
        <span className="rating-display-empty">No ratings yet</span>
      </div>
    )
  }

  return (
    <div className="rating-display">
      <StarRating rating={averageRating} readonly size={18} />
      <span className="rating-display-number">{averageRating}</span>
      <span className="rating-display-count">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
    </div>
  )
}
