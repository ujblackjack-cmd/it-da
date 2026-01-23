import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './ChatRoomSuccess.css'; //

const ChatRoomSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const title = searchParams.get('title') || "새로운 모임";
    const roomId = searchParams.get('roomId');

    return (
        <div className="success-container">
            <div className="success-icon">🎉</div>
            <h1 className="success-title">모임 등록 완료!</h1>
            <p className="success-message">
                방장으로서 모임을 관리하고<br />참여자들과 대화를 시작해보세요.
            </p>

            <div className="meeting-preview">
                <h3 className="preview-title">🌅 {title}</h3>
                {/* 상세 정보 로직 생략 */}
            </div>

            <div className="action-buttons">
                <button
                    className="primary-button"
                    onClick={() => navigate(`/chat/${roomId}`)} // 생성된 ID로 이동
                >
                    💬 채팅방 입장하기
                </button>
                <button className="secondary-button" onClick={() => navigate('/social/rooms')}>
                    목록보기
                </button>
            </div>
        </div>
    );
};

export default ChatRoomSuccess;