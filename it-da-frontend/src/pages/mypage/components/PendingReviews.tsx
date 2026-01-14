import React from "react";
import type { PendingReview } from "../../../api/mypage.api";
import "./MyReviews.css";

interface Props {
    data: PendingReview[];
    onWriteReview: (meetingId: number, title: string, dateText: string) => void;
}

const PendingReviews: React.FC<Props> = ({ data, onWriteReview }) => {
    if (!data || data.length === 0) {
        return (
            <div className="mypage-placeholder">
                <h3>📝 남은 후기</h3>
                <p>남겨야 할 후기가 없어요. 당신… 성실함 그 자체.</p>
            </div>
        );
    }

    return (
        <div className="mypage-section">
            <h3>📝 작성 대기 후기</h3>
            <ul className="mypage-list">
                {data.map((item) => (
                    <li key={item.meetingId} className="mypage-list-item">
                        <div>
                            <div className="mypage-title">{item.meetingTitle}</div>
                            <div className="mypage-sub">{item.meetingDateText}</div>
                        </div>

                        <button
                            className="mypage-btn"
                            type="button"
                            onClick={() =>
                                onWriteReview(item.meetingId, item.meetingTitle, item.meetingDateText)
                            }
                        >
                            후기 쓰기
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PendingReviews;
