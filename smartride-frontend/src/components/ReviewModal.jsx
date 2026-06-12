import { useState } from 'react'
import { reviewAPI } from '../services/api'
import StarRating from './StarRating'
import toast from 'react-hot-toast'
import { X, MapPin, Calendar, User, Send } from 'lucide-react'
import './ReviewModal.css'

export default function ReviewModal({ booking, revieweeName, onClose, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    setSubmitting(true)
    const reviewData = {
      bookingId: booking.bookingId,
      rating: rating,
      comment: comment.trim() || ""
    };

    try {
      await reviewAPI.submitReview(reviewData);
      toast.success("Review submitted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data || "Failed to submit review";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="review-modal-overlay" onClick={onClose}>
        <div className="review-modal" onClick={e => e.stopPropagation()}>
          <div className="review-success-content">
            <div className="review-success-icon">✅</div>
            <h3>Review Submitted!</h3>
            <p>Thank you for your feedback.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button className="review-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Header */}
        <div className="review-modal-header">
          <div className="review-modal-icon-wrap">⭐</div>
          <h3>Rate Your Experience</h3>
          <p>How was your ride?</p>
        </div>

        {/* Ride Info */}
        <div className="review-ride-info">
          <div className="review-ride-route">
            <MapPin size={14} />
            <span>{booking.source}</span>
            <span className="review-arrow">→</span>
            <span>{booking.destination}</span>
          </div>
          <div className="review-ride-meta">
            <span><Calendar size={12} /> {booking.date}</span>
          </div>
        </div>

        {/* Reviewee */}
        <div className="review-reviewee">
          <div className="review-reviewee-avatar">
            {revieweeName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="review-reviewee-label">Rating</div>
            <div className="review-reviewee-name">{revieweeName}</div>
          </div>
        </div>

        {/* Star Rating */}
        <div className="review-stars-section">
          <StarRating rating={rating} onRate={setRating} size={36} />
          {rating > 0 && (
            <div className="review-rating-text">
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
            </div>
          )}
        </div>

        {/* Comment */}
        <div className="review-comment-section">
          <textarea
            className="review-textarea"
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="review-char-count">{comment.length}/500</div>
        </div>

        {/* Actions */}
        <div className="review-modal-actions">
          <button className="review-btn-skip" onClick={onClose}>
            Skip for now
          </button>
          <button
            className="review-btn-submit"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting...</>
            ) : (
              <><Send size={14} /> Submit Review</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
