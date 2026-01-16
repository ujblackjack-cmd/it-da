import React from "react";
import { User } from "../../types/user.types";

interface Props {
    members: User[];
    onFollow: (userId: number) => void;
    onReport: (userId: number, userName: string) => void;
}

const ChatMemberList: React.FC<Props> = ({ members, onFollow, onReport }) => {
    return (
        <div className="flex flex-col gap-3">
            {members.map((member) => (
                <div
                    key={member.userId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {member.username?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-sm">{member.username}</div>
                        <div className="text-xs text-gray-500">
                            {member.role === "LEADER" ? "👑 모임장" : "멤버"}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {member.role !== "ME" && (
                            <>
                                <button
                                    onClick={() => onFollow(member.userId)}
                                    className="px-3 py-1 text-xs font-bold border border-indigo-500 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"
                                >
                                    팔로우
                                </button>
                                <button
                                    onClick={() => onReport(member.userId, member.username || '')}
                                    className="px-3 py-1 text-xs font-bold border border-red-500 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                >
                                    신고
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ChatMemberList;