import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileWebSocket, ProfileUpdate } from "@/hooks/auth/useProfileWebSocket";
import { useCallback, useState, useEffect } from "react";

import NotificationDropdown from "../../pages/mypage/components/NotificationDropdown";
import "./Header.css";

const Header = () => {
    const { user } = useAuthStore();
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [username, setUsername] = useState<string>("");

    // ✅ 초기값 설정
    useEffect(() => {
        if (user) {
            setProfileImage(user.profileImageUrl || null);
            setUsername(user.username || "");
        }
    }, [user]);

    // ✅ 프로필 웹소켓 연결 - 실시간 업데이트
    const handleProfileUpdate = useCallback((update: ProfileUpdate) => {
        console.log("🔔 Header 프로필 업데이트:", update);

        if (update.type === "PROFILE_INFO_UPDATE") {
            if (update.profileImageUrl !== undefined) {
                setProfileImage(update.profileImageUrl);
            }
            if (update.username !== undefined) {
                setUsername(update.username);
            }
        }
    }, []);

    useProfileWebSocket({
        profileUserId: user?.userId,
        onProfileUpdate: handleProfileUpdate,
    });

    // ✅ 프로필 이미지 URL 생성
    const getProfileImageUrl = () => {
        if (profileImage) {
            if (profileImage.startsWith('http')) {
                return profileImage;
            }
            return `http://localhost:8080${profileImage}`;
        }
        return null;
    };

    const imageUrl = getProfileImageUrl();

    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo">
                    IT-DA
                </Link>

                <nav className="nav-menu">
                    <Link to="/meetings" className="nav-item">
                        모임 찾기
                    </Link>
                    <Link to="/my-meetings" className="nav-item">
                        내 모임
                    </Link>
                    <Link to="/meetings/create" className="nav-item">
                        모임 만들기
                    </Link>
                </nav>

                <div className="header-right">
                    <NotificationDropdown />

                    {user ? (
                        <div className="user-menu">
                            {/* ✅ 프로필 아이콘만 (닉네임 삭제!) */}
                            <Link to="/mypage" className="user-profile-wrapper">
                                <div className="user-avatar">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={username}
                                            className="avatar-image"
                                        />
                                    ) : (
                                        <span className="avatar-initial">
                                            {username?.[0] || user.username?.[0] || "😊"}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="btn-login">
                                로그인
                            </Link>
                            <Link to="/signup" className="btn-signup">
                                회원가입
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
