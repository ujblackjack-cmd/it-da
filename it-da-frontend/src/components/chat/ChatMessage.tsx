// src/components/chat/ChatMessage.tsx
import React from "react";
import { ChatMessage as ChatMessageType } from "@/stores/useChatStore.ts";
import "./ChatMessage.css";
import VoteMessage from "@/components/chat/VoteMessage.tsx";
import api from "@/api/axios.config";
import { useAuthStore } from "@/stores/useAuthStore.ts";
import "./BillMessage.css"
import toast from "react-hot-toast";

interface Props {
    message: ChatMessageType;
    isMine: boolean;
}

const ChatMessage: React.FC<Props> = ({ message, isMine }) => {
    const { user: currentUser } = useAuthStore();

    // 1. metadata 파싱 (새로고침 시 문자열 대응)
    const parsedData = React.useMemo(() => {
        try {
            if (!message.metadata) return null;
            const data = typeof message.metadata === 'string'
                ? JSON.parse(message.metadata)
                : message.metadata;

            return data;
        } catch (e) {
            console.error("Metadata 파싱 에러:", e);
            return null; }
    }, [message.metadata, message.sentAt]);

    // 2. 특수 타입 렌더링 (parsedData 기반)
    const renderSpecialContent = () => {
        if (message.type === 'BILL') {
            if (!parsedData) return <div className="loading-placeholder">정산 정보를 불러오는 중...</div>;

            const perPerson = Math.floor((parsedData.totalAmount || 0) / (parsedData.participants?.length || 1));
            const participants = parsedData.participants || [];
            const isAllPaid = participants.length > 0 && participants.every((p: any) => p.isPaid);

            const handleCheckPaid = async (participantUserId: number) => {
                if (Number(message.senderId) !== Number(currentUser?.userId)) {
                    toast.error("정산 확인은 요청자만 가능합니다.");
                    return;
                }
                if (participantUserId === currentUser.userId) return;
                try {
                    const realMessageId =  message.messageId;
                    // ✅ axios 사용 - baseURL이 자동으로 추가됨
                    await api.post(`/social/messages/${Number(realMessageId)}/bill/check`, {
                        userId: participantUserId
                    });

                    console.log('✅ 입금 확인 완료');

                    // ✅ UI 업데이트 (옵션)
                    // 메시지 목록 새로고침 또는 상태 업데이트

                } catch (error) {
                    console.error('입금 확인 처리 실패:', error);
                    alert('입금 확인에 실패했습니다.');
                }
            };
            return (
                <div className="bill-calc-card" style={{ display: 'block', minHeight: '200px', background: '#fff' }}>
                    <div className="bill-calc-header" style={{ display: 'flex', alignItems: 'center', color: '#333', padding: '10px' }}>
                        <span style={{ marginRight: '8px' }}>💰</span>
                        <strong style={{ color: '#000' }}>정산 계산기</strong>
                        {isAllPaid && <span style={{ background: '#2ecc71', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', marginLeft: 'auto' }}>정산 완료</span>}
                    </div>

                    <div className="bill-calc-summary" style={{ padding: '0 10px 15px', borderBottom: '1px solid #eee' }}>
                        <div className="row" style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                            <span>총 비용</span>
                            <strong style={{ color: '#000' }}>{Number(parsedData.totalAmount).toLocaleString()}원</strong>
                        </div>
                        <div className="row per" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                            <span>1인당</span>
                            <strong style={{ color: '#6c5ce7', fontSize: '1.2rem' }}>{perPerson.toLocaleString()}원</strong>
                        </div>
                    </div>

                    <div className="bill-member-list" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px',
                        padding: '10px'
                    }}>
                        {participants.map((p: any) => {
                            // ✅ 현재 로그인한 유저의 ID와 참여자의 ID가 같은지 확인
                            const isMe = Number(currentUser?.userId) === Number(p.userId);

                            return (
                                <div
                                    key={`bill-participant-${p.userId}-${p.isPaid}`} // 💡 key에 isPaid를 포함하면 강제 리렌더링 효과가 있습니다.
                                    className={`bill-member-row ${p.isPaid ? 'is-paid' : ''}`}
                                    onClick={() => handleCheckPaid(p.userId)}
                                    style={{
                                        background: p.isPaid ? '#f0f4ff' : '#f8f9fa',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: p.isPaid ? '1px solid #6c5ce7' : '1px solid #eee',
                                        // 모임장일 때만 클릭 가능하다는 시각적 힌트 제공
                                        cursor: Number(message.senderId) === Number(currentUser?.userId) ? 'pointer' : 'default'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
                    <span style={{ fontWeight: '600' }}>
                        {p.name}
                        {/* ✅ 본인일 경우 이름 옆에 (나) 표시 추가 */}
                        {isMe && <span style={{ color: '#6c5ce7', fontSize: '0.8rem', marginLeft: '4px' }}>(나)</span>}
                    </span>
                                        <span>{p.isPaid ? '✅' : '⏰'}</span>
                                    </div>
                                    <div style={{ color: '#6c5ce7', fontWeight: 'bold', marginTop: '5px' }}>
                                        {perPerson.toLocaleString()}원
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bill-calc-footer" style={{ textAlign: 'center', padding: '10px', fontSize: '0.85rem', color: '#888', borderTop: '1px solid #eee' }}>
                        {isAllPaid ? (
                            <strong style={{ color: '#27ae60', fontSize: '1.05rem' }}>🎉 모든 정산이 완료되었습니다!</strong>
                        ) : (
                            <span style={{ color: '#888' }}>{parsedData.account}</span>
                        )}
                    </div>
                </div>
            );
        }
        if (message.type === 'POLL') {
            if (!parsedData) return <div className="loading-placeholder">투표 데이터를 불러오는 중...</div>;
            return <VoteMessage message={{ ...message, metadata: parsedData }} />;
        }

        // 3. IMAGE 타입
        if (message.type === 'IMAGE') {
            return <img src={`http://localhost:8080${message.content}`} alt="uploaded" className="chat-img" />;
        }

        // 4. 일반 텍스트: 위의 특수 타입들에 해당하지 않는 경우에만 실행됨
        return <p className="chat-text">{message.content}</p>;
    };

    const displayTime = message.sentAt ? new Date(message.sentAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "";

    return (
        <div className={`message-item ${isMine ? "mine" : "others"}`}>
            {!isMine && <div className="sender-avatar">{message.senderNickname?.[0] || "익"}</div>}
            <div className="message-bubble-wrapper"
                 style={{
                     width: (message.type === 'POLL' || message.type === 'BILL') ? '100%' : 'auto',
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: isMine ? 'flex-end' : 'flex-start'
                 }}>
                {!isMine && <div className="sender-name" style={{ fontWeight: 'bold' }}>{message.senderNickname}</div>}

                <div className="bubble-info-container"
                     style={{
                         display:'flex',
                         flexDirection: isMine ? 'row-reverse' : 'row',
                         alignItems:'flex-end',
                         gap:'5px',
                         width: (message.type === 'POLL' || message.type === 'BILL') ? '100%' : 'auto'
                     }}>
                    {message.unreadCount > 0 && (
                        <span className="unread-num" style={{
                            color: '#FFD700',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            alignSelf: 'flex-end', // 하단 정렬
                            marginBottom: '4px'
                        }}>
                        {message.unreadCount}
                            </span>
                    )}
                    <div className={`chat-bubble ${isMine ? "mine-bubble" : "others-bubble"}`}
                         style={{
                             width: (message.type === 'POLL' || message.type === 'BILL') ? '100%' : 'auto',
                             maxWidth: (message.type === 'POLL' || message.type === 'BILL') ? '400px' : '70%',
                             background: (message.type === 'POLL' || message.type === 'BILL') ? '#ffffff' : undefined,
                             border: (message.type === 'POLL' || message.type === 'BILL') ? '1px solid #e9ecef' : undefined,
                             boxShadow: (message.type === 'POLL' || message.type === 'BILL') ? '0 4px 12px rgba(0,0,0,0.08)' : undefined,
                             padding: (message.type === 'POLL' || message.type === 'BILL') ? '0' : '12px',
                             borderRadius: '16px',
                             overflow: 'hidden' // ✅ 내부 요소가 둥근 모서리를 빠져나가지 않게 함
                         }}>
                        {renderSpecialContent()}
                    </div>
                    <div className="chat-timestamp">{displayTime}</div>
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;