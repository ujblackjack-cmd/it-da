import React, {useEffect, useState} from 'react';
import { chatApi } from '@/api/chat.api.ts';
import toast from 'react-hot-toast';
import '../../pages/chat/ChatRoomPage.css'; // 모달 전체 틀(overlay, content)
import './ChatMemberList.css';              // 멤버 리스트 아이템 디자인 (avatar 등)
import './InviteMemberModal.css';           // ✅ 검색창 및 모달 전용 디자인

interface User {
    userId: number;
    username:string;
    nickname: string;
    email: string;
    profileImageUrl?: string;
}

interface Props {
    roomId: number;
    onClose: () => void;
    onInviteCompleted: () => void; // 초대 후 목록 갱신용
}

const InviteMemberModal: React.FC<Props> = ({ roomId, onClose, onInviteCompleted }) => {
    const [keyword, setKeyword] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchInitialUsers();
    }, []);

    const fetchInitialUsers = async () => {
        setIsLoading(true);
        try {
            // 키워드 없이 호출하면 백엔드에서 기본 목록을 반환하도록 수정됨
            const users = await chatApi.searchUsers("");
            setSearchResults(users);
        } catch (e) {
            console.error("초기 유저 로드 실패", e);
            // 조용히 실패하거나 필요하면 토스트 메시지
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!keyword.trim()) return;
        setIsLoading(true);
        try {
            const users = await chatApi.searchUsers(keyword);
            setSearchResults(users);
        } catch (e) {
            console.error(e);
            toast.error("검색 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async (userId: number) => {
        if (!confirm("이 멤버를 초대하시겠습니까?")) return;

        try {
            await chatApi.inviteUser(roomId, userId);
            toast.success("멤버를 초대했습니다!");
            onInviteCompleted(); // 부모 컴포넌트에 알림
            onClose(); // 모달 닫기
        } catch (e) {
            console.error(e);
            toast.error("초대에 실패했거나 이미 참여 중인 멤버입니다.");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h3>멤버 초대</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                    <input
                        className="message-input"
                        placeholder="닉네임 또는 이메일 검색"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn-mini btn-follow" onClick={handleSearch} style={{ padding: '10px 15px' }}>
                        검색
                    </button>
                </div>

                <div className="search-results" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {isLoading ? (
                        <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>로딩 중...</p>
                    ) : searchResults.length > 0 ? (
                        searchResults.map(user => {
                            // ✅ [수정 2] 표시 이름 우선순위 결정 (닉네임 -> 유저네임 -> 이름 없음)
                            const displayName = user.nickname || user.username || "이름 없음";;
                        return (
                        <div key={user.userId} className="member-item" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div className="member-avatar">
                            {user.profileImageUrl ? (
                                <img src={user.profileImageUrl} alt="profile" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                            ) : (
                                displayName[0] // 아바타 글자도 이름에 맞춰 표시
                            )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div className="member-name">{displayName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.email}
                            </div>
                        </div>
                    </div>
                    <button
                        className="btn-mini"
                        style={{ backgroundColor: '#667eea', color: 'white', border: 'none', flexShrink: 0 }}
                        onClick={() => handleInvite(user.userId)}
                    >
                        초대
                    </button>
                </div>
                );
                })
                ) : (
                <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                    {keyword ? "검색 결과가 없습니다." : "초대 가능한 멤버가 없습니다."}
                </p>
                )}
            </div>
        </div>
</div>
);
};
export default InviteMemberModal;