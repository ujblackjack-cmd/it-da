import React, { useState } from "react";
import "./ChatReportModal.css";

interface Props {
    targetName: string;
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

const ChatReportModal: React.FC<Props> = ({ targetName, onClose, onSubmit }) => {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const reasons = ["욕설 및 비방", "스팸/광고", "음란물", "기타"];

    return (
        <div className="report-modal-overlay">
            <div className="report-modal-content">
                <h3 className="report-modal-title">신고하기</h3>
                <p className="report-modal-subtitle">{targetName}님을 신고하시겠습니까?</p>

                <div className="report-reason-list">
                    {reasons.map((reason) => (
                        <button
                            key={reason}
                            className={`report-reason-item ${selectedReason === reason ? "selected" : ""}`}
                            onClick={() => setSelectedReason(reason)}
                        >
                            {reason}
                        </button>
                    ))}
                </div>

                <div className="report-modal-actions">
                    <button className="btn-modal-cancel" onClick={onClose}>취소</button>
                    <button
                        className="btn-modal-submit"
                        disabled={!selectedReason}
                        onClick={() => selectedReason && onSubmit(selectedReason)}
                    >
                        신고
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatReportModal;