import React from "react";
import { ChatMessage as ChatMessageType } from "../../types/chat.types";
import "./ChatMessage.css";

interface Props {
    message: ChatMessageType;
    isMine: boolean;
}

const ChatMessage: React.FC<Props> = ({ message, isMine }) => {
    // ✅ 사용하지 않는 avatarLetter 변수 제거
    const senderName = message.senderName || message.senderEmail || "익명";

    // ✅ formatTime 함수 대신 JSX 내부에서 직접 포맷팅하여 미사용 함수 에러 해결
    const displayTime = message.createdAt ? new Date(message.createdAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    }) : "";
    const renderSpecialContent = () => {
        const data = message.metadata;
        if (!data) return <p>{message.content}</p>;

        switch (message.type) {
            case "POLL": // 투표 UI
                return (
                    <div className="special-card poll-card">
                        <h4>{String(data.title)}</h4>
                        {Array.isArray(data.options) && data.options.map((opt, i) => (
                            <button key={i} className="poll-option-btn">{String(opt)}</button>
                        ))}
                    </div>
                );
            case "BILL": // 정산 UI
                return (
                    <div className="special-card bill-card">
                        <p className="bill-title">💰 정산 요청</p>
                        <div className="bill-amount">{Number(data.totalAmount).toLocaleString()}원</div>
                        <p className="bill-info">{String(data.account)}</p>
                        <button className="pay-btn">송금하기</button>
                    </div>
                );
            default:
                return <p>{message.content}</p>;
        }
    };
    return (
        <div className={`message-item ${isMine ? "mine" : "others"}`}>
            {!isMine && (
                <div className="sender-avatar">
                    {/* 옵셔널 체이닝으로 방어 코드 작성 */}
                    {message.senderName ? message.senderName[0] : "익"}
                </div>
            )}

            <div className="message-bubble-wrapper">
                {!isMine && <div className="sender-name">{senderName}</div>}

                <div className="chat-bubble">
                    {message.content}
                </div>

                <div className="chat-timestamp">
                    {displayTime}
                </div>
            </div>
            <div className="message-bubble-wrapper">
                {!isMine && <div className="sender-name">{senderName}</div>}
                <div className="chat-bubble">
                    {renderSpecialContent()}
                </div>
                <div className="chat-timestamp">{displayTime}</div>
            </div>
        </div>
    );
};

export default ChatMessage;