// src/components/chat/ChatMessage.tsx

import React from "react";
import { ChatMessage as ChatMessageType } from "@/stores/useChatStore.ts"; // ✅ 통합된 타입 사용
import "./ChatMessage.css";

interface Props {
    message: ChatMessageType;
    isMine: boolean;
}

const ChatMessageItem: React.FC<Props> = ({ message, isMine }) => {
    // ✅ 백엔드 DTO 필드명(sentAt)을 사용하여 시간 표시
    const displayTime = message.sentAt
        ? new Date(message.sentAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
        })
        : "";

    // ✅ 특수 콘텐츠(투표, 정산) 렌더링 로직
    const renderSpecialContent = () => {
        // metadata가 있을 경우 처리 (백엔드에서 JSON으로 내려줌)
        const data = (message as { metadata?: Record<string, unknown> }).metadata;
        if (!data) return <p className="chat-text">{message.content}</p>;

        switch (message.type) {
            case "POLL":
                return (
                    <div className="special-card poll-card">
                        <h4>{String(data.title)}</h4>
                        {Array.isArray(data.options) && data.options.map((opt: string, i: number) => (
                            <button key={i} className="poll-option-btn">{opt}</button>
                        ))}
                    </div>
                );
            case "BILL":
                return (
                    <div className="special-card bill-card">
                        <p className="bill-title">💰 정산 요청</p>
                        <div className="bill-amount">{Number(data.totalAmount).toLocaleString()}원</div>
                        <p className="bill-info">{String(data.account)}</p>
                        <button className="pay-btn">송금하기</button>
                    </div>
                );
            default:
                return <p className="chat-text">{message.content}</p>;
        }
    };

    return (
        <div className={`message-item ${isMine ? "mine" : "others"}`}>
            {/* ✅ 상대방 메시지일 때만 아바타를 보여줍니다. */}
            {!isMine && (
                <div className="sender-avatar">
                    {message.senderNickname ? message.senderNickname[0] : "익"}
                </div>
            )}

            <div className="message-bubble-wrapper">
                {/* ✅ 상대방 메시지일 때만 이름을 보여줍니다. */}
                {!isMine && <div className="sender-name">{message.senderNickname}</div>}

                <div className={`chat-bubble ${isMine ? "mine-bubble" : "others-bubble"}`}>
                    {renderSpecialContent()}
                </div>

                <div className="chat-timestamp">
                    {displayTime}
                </div>
            </div>
        </div>
    );
};

export default ChatMessageItem;