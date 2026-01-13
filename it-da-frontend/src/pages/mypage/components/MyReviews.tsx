import React from 'react';
import './MyReviews.css';
import { MyReview } from '../../../api/mypage.api';

interface Props {
    data: MyReview[];
}

const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const empty = 5 - full;
    return '★'.repeat(full) + '☆'.repeat(empty);
};

const getSentimentClass = (sentiment: string) => {
    const s = (sentiment || '').toLowerCase();
    if (s.includes('pos') || s.includes('긍정')) return 'positive';
    if (s.includes('neg') || s.includes('부정')) return 'negative';
    return 'neutral';
};

const getSentimentLabel = (sentiment: string) => {
    const s = (sentiment || '').toLowerCase();
    if (s.includes('pos') || s.includes('긍정')) return '😊 긍정';
    if (s.includes('neg') || s.includes('부정')) return '😔 부정';
    return '😐 보통';
};

const MyReviews: React.FC<Props> = ({ data }) => {
    return (
        <div className="my-reviews">
            <div className="section-header">
                <h2>✨ 내가 쓴 후기</h2>
            </div>

            {data.length === 0 ? (
                <p className="empty-message">아직 작성한 후기가 없습니다.</p>
            ) : (
                <div className="reviews-list">
                    {data.map((review) => {
                        const sentimentClass = getSentimentClass(review.sentiment);
                        return (
                            <div key={`${review.meetingId}-${review.createdAt}`} className="review-card">
                                <div className="review-header">
                                    <h3>{review.meetingTitle}</h3>
                                    <div className="rating">{renderStars(review.rating)}</div>
                                </div>

                                <p className="review-text">{review.content}</p>

                                <div className="review-meta">
                                    <span className="review-date">{review.createdAt}</span>
                                    <span className={`sentiment-badge ${sentimentClass}`}>
                    {getSentimentLabel(review.sentiment)}
                  </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyReviews;
