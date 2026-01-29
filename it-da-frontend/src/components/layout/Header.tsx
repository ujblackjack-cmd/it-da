// src/components/layout/Header.tsx
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  useProfileWebSocket,
  ProfileUpdate,
} from "@/hooks/auth/useProfileWebSocket";
import { useCallback, useState, useEffect } from "react";
import NotificationDropdown from "../../pages/mypage/components/NotificationDropdown";
import "./Header.css";

const Header = () => {
  const { user } = useAuthStore();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    if (user) {
      setProfileImage(user.profileImageUrl || null);
      setUsername(user.username || "");
    }
  }, [user]);

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

  const getProfileImageUrl = () => {
    if (profileImage) {
      if (profileImage.startsWith("http")) {
        return profileImage;
      }
      return `http://localhost:8080${profileImage}`;
    }
    return null;
  };

  const imageUrl = getProfileImageUrl();

  // ✅ 인라인 스타일로 강제 적용
  const headerStyle: React.CSSProperties = {
    background: "white",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    width: "100%",
  };

  const headerContentStyle: React.CSSProperties = {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "20px 32px", // ✅ 핵심!
    minHeight: "70px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
  };

  const logoStyle: React.CSSProperties = {
    fontSize: "1.5rem",
    fontWeight: 700,
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    lineHeight: 1.2,
  };

  const navMenuStyle: React.CSSProperties = {
    display: "flex",
    gap: "2rem",
    alignItems: "center",
    flexShrink: 0,
  };

  const navItemStyle: React.CSSProperties = {
    color: "#495057",
    textDecoration: "none",
    fontWeight: 500,
    fontSize: "1.05rem",
    whiteSpace: "nowrap",
    transition: "color 0.3s",
  };

  const headerRightStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexShrink: 0,
  };

  const userProfileWrapperStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "50%",
    transition: "transform 0.3s",
  };

  const userAvatarStyle: React.CSSProperties = {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(102, 126, 234, 0.3)",
    transition: "all 0.3s",
  };

  const avatarImageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  };

  const avatarInitialStyle: React.CSSProperties = {
    color: "white",
    fontWeight: 700,
    fontSize: "1.2rem",
  };

  const authButtonsStyle: React.CSSProperties = {
    display: "flex",
    gap: "1rem",
  };

  const btnLoginStyle: React.CSSProperties = {
    padding: "0.6rem 1.5rem",
    borderRadius: "8px",
    fontWeight: 600,
    textDecoration: "none",
    fontSize: "0.95rem",
    color: "#667eea",
    background: "transparent",
    border: "1px solid #667eea",
    cursor: "pointer",
    transition: "all 0.3s",
  };

  const btnSignupStyle: React.CSSProperties = {
    padding: "0.6rem 1.5rem",
    borderRadius: "8px",
    fontWeight: 600,
    textDecoration: "none",
    fontSize: "0.95rem",
    color: "white",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s",
  };

  return (
    <header style={headerStyle}>
      <div style={headerContentStyle}>
        <Link to="/" style={logoStyle}>
          IT-DA
        </Link>

        <nav style={navMenuStyle}>
          <Link to="/meetings" style={navItemStyle}>
            모임 찾기
          </Link>
          <Link to="/my-meetings" style={navItemStyle}>
            내 모임
          </Link>
          <Link to="/meetings/create" style={navItemStyle}>
            모임 만들기
          </Link>
          <Link to="/notices" style={navItemStyle}>
            공지사항
          </Link>
        </nav>

        <div style={headerRightStyle}>
          <NotificationDropdown />

          {user ? (
            <div className="user-menu">
              <Link to="/mypage" style={userProfileWrapperStyle}>
                <div style={userAvatarStyle}>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={username}
                      style={avatarImageStyle}
                    />
                  ) : (
                    <span style={avatarInitialStyle}>
                      {username?.[0] || user.username?.[0] || "😊"}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ) : (
            <div style={authButtonsStyle}>
              <Link to="/login" style={btnLoginStyle}>
                로그인
              </Link>
              <Link to="/signup" style={btnSignupStyle}>
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
