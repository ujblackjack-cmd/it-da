import React, { useEffect, useMemo, useState } from 'react';
import './ReviewModal.css';
import mypageApi, { ReviewCreateRequest } from '../../../api/mypage.api';

interface Props {
    isOpen: boolean;
    onClose: () => void;

    userId: number;
    currentUserId: number;

    meetingId: number | null;
    meetingTitle: string;
    meetingDateText: string; // "2026-01-03 참여" 같은 표시용

    onSubmitted?: () => void; // 등록 성공 후 재조회 트리거
}

const ratingTexts = ['별점을 선택해주세요', '별로예요 😞', '그저 그래요 😐', '괜찮아요 🙂', '좋아요! 😊', '최고예요! 🤩'];

const ReviewModal: React.FC<Props> = ({
                                          isOpen,
                                          onClose,
                                          userId,
                                          currentUserId,
                                          meetingId,
                                          meetingTitle,
                                          meetingDateText,
                                          onSubmitted,
                                      }) => {
    const [rating, setRating] = useState<number>(0);
    const [content, setContent] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setContent('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const canSubmit = useMemo(() => rating > 0 && content.trim().length > 0 && !isSubmitting, [rating, content, isSubmitting]);

    const handleSubmit = async () => {
        if (!meetingId) return;
        if (!canSubmit) return;

        const payload: { rating: number; content: string } = {
            rating,
            content: content.trim(),
        };

        try {
            setIsSubmitting(true);
            await mypageApi.createReview(userId, meetingId, payload);

            onClose();
            onSubmitted?.();
        } catch (e) {
            console.error(e);
            alert('후기 등록에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // currentUserId는 지금은 unused지만, 나중에 백엔드가 검증할 때 쿼리/헤더로 붙일 수 있어서 props로 유지
    void currentUserId;

    return (
        <div className="review-modal-overlay" onClick={onClose} role="presentation">
            <div className="review-modal-content" onClick={(e) => e.stopPropagation()} role="presentation">
                <div className="review-modal-header">
                    <h2>후기 작성</h2>
                    <button className="review-btn-close" onClick={onClose} type="button">
                        ✕
                    </button>
                </div>

                <div className="review-modal-body">
                    <div className="review-meeting-preview">
                        <h3>{meetingTitle}</h3>
                        <p>{meetingDateText}</p>
                    </div>

                    <div className="review-rating-input">
                        <label>만족도를 선택해주세요</label>

                        <div className="review-stars">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                    key={n}
                                    className={`review-star ${n <= rating ? 'active' : ''}`}
                                    onClick={() => setRating(n)}
                                    type="button"
                                    aria-label={`${n}점`}
                                >
                                    {n <= rating ? '★' : '☆'}
                                </button>
                            ))}
                        </div>

                        <p className="review-rating-text">{ratingTexts[rating]}</p>
                    </div>

                    <div className="review-text-input">
                        <label>어떤 점이 좋았나요?</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="예) 분위기가 정말 좋았어요! 다음에도 참여하고 싶어요."
                            maxLength={500}
                            rows={4}
                        />
                        <p className="review-char-count">{content.length}/500</p>
                    </div>
                </div>

                <div className="review-modal-footer">
                    <button className="review-btn-cancel" onClick={onClose} type="button" disabled={isSubmitting}>
                        취소
                    </button>
                    <button className="review-btn-submit" onClick={handleSubmit} type="button" disabled={!canSubmit}>
                        {isSubmitting ? '등록 중...' : '등록'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
