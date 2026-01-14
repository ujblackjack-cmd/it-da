import React from "react";
import type { PendingReview } from "../../../api/mypage.api";
import "./PendingReviews.css";

interface Props {
    data: PendingReview[];
    onWriteReview: (meetingId: number, title: string, dateText: string) => void;
}

const PendingReviews: React.FC<Props> = ({ data, onWriteReview }) => {
    if (!data || data.length === 0) {
        return null;
    }

    return (
        <section className="pending-reviews-section">
            <div className="pending-reviews-header">
                <h3>
                    📝 후기 작성 대기 중
                    <span className="pending-count">{data.length}</span>
                </h3>
            </div>

            <div className="pending-reviews-list">
                {data.map((item) => (
                    <div key={item.meetingId} className="pending-review-item">
                        <div className="pending-review-info">
                            <div className="pending-review-title">
                                {item.meetingTitle}
                            </div>
                            <div className="pending-review-date">
                                {item.meetingDateText}
                            </div>
                        </div>
                        <button
                            className="btn-write-review"
                            type="button"
                            onClick={() =>
                                onWriteReview(item.meetingId, item.meetingTitle, item.meetingDateText)
                            }
                        >
                            후기 쓰기
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default PendingReviews;