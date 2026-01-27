// src/components/chat/ChatMessage.tsx
import React, {useState} from "react";
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
    onLocationClick?: (metadata: any) => void;
}
interface RecommendedPlace {
    placeName: string;
    address: string;
    latitude: number;
    longitude: number;
    isAiRecommendation?: boolean | string; // 타입 보강
    lat?: number; // 메타데이터 필드 호환성
    lng?: number;
}
interface BillMetadata {
    totalAmount?: number;
    participants?: Array<{ userId: number; name: string; isPaid: boolean }>;
    account?: string;
}
const ChatMessage: React.FC<Props> = ({ message, isMine, onLocationClick }) => {
    const { user: currentUser } = useAuthStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDownload = async (e: React.MouseEvent, imageUrl: string) => {
        e.stopPropagation(); // 부모 클릭 이벤트(확대 모달) 방지
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // 파일명 생성 (예: chat_image_12345.png)
            link.download = `chat_image_${message.messageId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("이미지가 저장되었습니다.");
        } catch (error) {
            console.error("이미지 다운로드 실패:", error);
            toast.error("다운로드에 실패했습니다.");
        }
    };
        // 1. metadata 파싱 (새로고침 시 문자열 대응)
    const parsedData = React.useMemo(() => {
        try {
            if (!message.metadata) return null;

            // ✅ 1. 문자열인 경우 객체로 변환, 객체인 경우 그대로 사용
            let data = typeof message.metadata === 'string'
                ? JSON.parse(message.metadata)
                : message.metadata;

            // ✅ 2. (방어 코드) 만약 파싱 결과가 여전히 문자열이라면 한 번 더 파싱
            // 일부 DB 설정에 따라 JSON이 이중 문자열로 저장되는 경우를 대비합니다.
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            // ✅ 3. 최종 데이터를 'any' 또는 'RecommendedPlace'로 형변환하여 속성 접근 허용
            return data as RecommendedPlace & BillMetadata;
        } catch (e) {
            console.error("Metadata 파싱 에러:", e);
            return null;
        }
    }, [message.metadata]);

    const isAiReco = parsedData && (
        parsedData.isAiRecommendation === true ||
        parsedData.isAiRecommendation === 'true'
    );

    // 2. 특수 타입 렌더링 (parsedData 기반)
    const renderSpecialContent = () => {
        if (isAiReco) {
            const aiBubbleGradient = isMine
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)';
            return (
                <div className="ai-reco-bubble"
                     onClick={() => {
                         // ✅ 좌표가 있다면 클릭 시 모달 오픈
                         const lat = parsedData?.latitude || parsedData?.lat;
                         const lng = parsedData?.longitude || parsedData?.lng;
                         if (lat && lng) {
                             onLocationClick?.(parsedData);
                         }
                     }}
                     style={{
                    background: aiBubbleGradient,
                    color: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    boxShadow: '0 4px 15px rgba(118, 75, 162, 0.3)'
                }}>
                    {message.content}
                    {(parsedData?.latitude || parsedData?.lat) && (
                        <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8, textAlign: 'right' }}>
                            검색된 위치 확인하기 🔍
                        </div>
                    )}
                </div>
            );
        }
        if (message.type === "LOCATION") {
            if (!parsedData) return <div>{message.content}</div>;

            const titleColor = isMine ? "#ffffff" : "#333333";
            const addressColor = isMine ? "rgba(255, 255, 255, 0.85)" : "#666666";
            const footerColor = isMine ? "#ffffff" : "#6366f1";
            const borderColor = isMine ? "rgba(255, 255, 255, 0.3)" : "#eeeeee";

            return (
                <div
                    className="location-bubble"
                    onClick={() => onLocationClick?.(parsedData)}
                    style={{
                        cursor: 'pointer',
                        padding: '12px 16px',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: '220px'
                    }}
                >
                    <div style={{
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        color: titleColor,
                        textShadow: isMine ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}>
                        📍 {parsedData.placeName}
                    </div>

                    <div style={{
                        fontSize: '0.85rem',
                        color: addressColor,
                        marginBottom: '10px',
                        lineHeight: '1.4'
                    }}>
                        {parsedData.address}
                    </div>

                    <div style={{
                        fontSize: '0.8rem',
                        color: footerColor,
                        fontWeight: '700',
                        borderTop: `1px solid ${borderColor}`,
                        paddingTop: '10px',
                        textAlign: 'center',
                        letterSpacing: '-0.3px'
                    }}>
                        지도로 위치 확인하기
                    </div>
                </div>
            );
        }
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
            const imageUrl = `http://localhost:8080${message.content}`;
            // 백엔드 FileController 수정이 되어있어야 ?download=true가 작동합니다.
            const downloadUrl = `${imageUrl}?download=true`;

            return (
                <div style={{ position: 'relative', display: 'inline-block', borderRadius: '12px', overflow: 'hidden' }}>
                    {/* 이미지 (클릭 시 확대 모달) */}
                    <img
                        src={imageUrl}
                        alt="uploaded"
                        className="chat-img"
                        onClick={() => setIsModalOpen(true)}
                        style={{ cursor: 'zoom-in', display: 'block', maxWidth: '100%', height: 'auto' }}
                    />

                    {/* 🎨 심플한 다운로드 버튼 (SVG 아이콘) */}
                    <a
                        href={downloadUrl}
                        download
                        onClick={(e) => handleDownload(e, imageUrl)} // 이미지 확대 방지
                        title="저장하기"
                        style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0, 0, 0, 0.4)', // 반투명 검정 배경 (세련됨)
                            backdropFilter: 'blur(4px)', // 배경 흐림 효과 (고급짐)
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.2)', // 은은한 테두리
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textDecoration: 'none',
                            zIndex: 10
                        }}
                        // 마우스 올렸을 때 조금 더 진해지게 처리
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'}
                    >
                        {/* 깔끔한 다운로드 화살표 아이콘 (SVG) */}
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </a>

                    {/* 확대 모달 */}
                    {isModalOpen && (
                        <div className="image-full-modal" onClick={() => setIsModalOpen(false)}>
                            <div className="modal-overlay"></div>
                            <img src={imageUrl} alt="full" className="full-image-content" onClick={(e) => e.stopPropagation()} />
                            <span className="close-x" onClick={() => setIsModalOpen(false)}>×</span>
                        </div>
                    )}
                </div>
            );
        }

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
                             background: isAiReco ? 'transparent' :
                                 (message.type === 'IMAGE') ? 'transparent' :
                                     (message.type === 'POLL' || message.type === 'BILL') ? '#ffffff' : undefined,
                             border: (message.type === 'IMAGE') ? 'none' : (message.type === 'POLL' || message.type === 'BILL') ? '1px solid #e9ecef' : undefined,
                             boxShadow: (message.type === 'IMAGE') ? 'none' : (message.type === 'POLL' || message.type === 'BILL') ? '0 4px 12px rgba(0,0,0,0.08)' : undefined,
                             padding: (message.type === 'IMAGE') ? '0' : (message.type === 'POLL' || message.type === 'BILL') ? '0' : '12px',
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