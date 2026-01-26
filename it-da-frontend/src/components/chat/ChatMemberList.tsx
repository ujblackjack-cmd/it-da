import React from "react";
import { User } from "@/types/user.types.ts";
import {useAuthStore} from "@/stores/useAuthStore.ts";

interface Props {
    members: User[];
    onFollow: (userId: number) => void;
    onReport: (userId: number, userName: string) => void;
}

const ChatMemberList: React.FC<Props> = ({ members, onFollow, onReport }) => {
    const { user: currentUser } = useAuthStore();

    return (
        <div className="member-list-container">
            {members.map((member) => {
                const isMe = member.userId === currentUser?.userId;
                const isLeader = member.role === "LEADER";

                return (
                    <div key={member.userId} className={`member-item ${isMe ? "is-me" : ""}`}>
                        {/* 아바타 */}
                        <div className="member-avatar">
                            {member.profileImageUrl ? (
                                <img src={member.profileImageUrl} alt="profile" className="avatar-img" />
                            ) : (
                                (member.name || member.nickname || member.username)?.[0] || "?"
                            )}
                        </div>

                        {/* 정보 영역 */}
                        <div className="member-info">
                            <div className="member-name">
                                {member.name || member.nickname || member.username}
                                {isMe && <span className="me-badge">(나)</span>}
                            </div>
                            <div className={`member-role ${isLeader ? "leader" : ""}`}>
                                {isLeader ? "👑 모임장" : "멤버"}
                            </div>
                        </div>

                        {/* 버튼 영역 (나는 버튼 안 보임) */}
                        {!isMe && (
                            <div className="member-actions">
                                {/* ✅ [수정] 팔로우 상태에 따라 버튼 분기 처리 */}
                                {member.isFollowing ? (
                                    <button
                                        className="btn-mini"
                                        style={{
                                            backgroundColor: '#e9ecef',
                                            color: '#868e96',
                                            borderColor: '#dee2e6',
                                            cursor: 'default'
                                        }}
                                        disabled
                                    >
                                        팔로우 중
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onFollow(member.userId)}
                                        className="btn-mini btn-follow"
                                    >
                                        팔로우
                                    </button>
                                )}

                                <button
                                    onClick={() => onReport(member.userId, member.name || member.nickname || member.username)}
                                    className="btn-mini btn-report"
                                >
                                    신고
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ChatMemberList;