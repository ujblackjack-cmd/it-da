import React from "react";
import { ChatMessage as ChatMessageType } from "../../types/chat.types";
import "./ChatMessage.css"; // ✅ 디자인 분리

interface Props {
    message: ChatMessageType;
    isMine: boolean;
}

const ChatMessage: React.FC<Props> = ({ message, isMine }) => {
    return (
        <div className={`message-item ${isMine ? "mine" : "others"}`}>
            {!isMine && (
                <div className="sender-avatar">
                    {message.senderName[0]}
                </div>
            )}

            <div className="message-bubble-wrapper">
                {!isMine && <div className="sender-name">{message.senderName}</div>}

                <div className="chat-bubble">
                    {message.content}
                </div>

                <div className="chat-timestamp">
                    {new Date(message.createdAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;