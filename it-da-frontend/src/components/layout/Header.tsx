// src/components/layout/Header.tsx
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  useProfileWebSocket,
  ProfileUpdate,
} from "@/hooks/auth/useProfileWebSocket";
import { useCallback, useState, useEffect, useRef } from "react";
import NotificationDropdown from "../../pages/mypage/components/NotificationDropdown";

const Header = () => {
  const { user } = useAuthStore();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const headerContentRef = useRef<HTMLDivElement>(null);

  // ✅ DOM 직접 조작으로 강제 스타일 적용
  useEffect(() => {
    if (headerContentRef.current) {
      const element = headerContentRef.current;

      // 기존 스타일 완전 제거
      element.removeAttribute("class");
      element.removeAttribute("style");

      // 새로운 스타일 강제 적용
      element.style.cssText = `
                max-width: 1400px !important;
                margin: 0 auto !important;
                padding: 20px 32px !important;
                min-height: 70px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                gap: 24px !important;
                box-sizing: border-box !important;
            `;

      console.log("✅ 헤더 스타일 적용됨:", element.style.padding);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setProfileImage(user.profileImageUrl || null);
      setUsername(user.username || "");
    }
  }, [user]);

  const handleProfileUpdate = useCallback((update: ProfileUpdate) => {
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

  return (
    <header
      style={{
        background: "white",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        width: "100%",
      }}
    >
      <div ref={headerContentRef}>
        <Link
          to="/"
          style={{
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
            margin: 0,
            padding: 0,
          }}
        >
          IT-DA
        </Link>

        <nav
          style={{
            display: "flex",
            gap: "2rem",
            alignItems: "center",
            flexShrink: 0,
            margin: 0,
            padding: 0,
          }}
        >
          <Link
            to="/meetings"
            style={{
              color: "#495057",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "1.05rem",
              whiteSpace: "nowrap",
              margin: 0,
              padding: 0,
            }}
          >
            모임 찾기
          </Link>
          <Link
            to="/my-meetings"
            style={{
              color: "#495057",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "1.05rem",
              whiteSpace: "nowrap",
              margin: 0,
              padding: 0,
            }}
          >
            내 모임
          </Link>
          <Link
            to="/meetings/create"
            style={{
              color: "#495057",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "1.05rem",
              whiteSpace: "nowrap",
              margin: 0,
              padding: 0,
            }}
          >
            모임 만들기
          </Link>
          <Link
            to="/notices"
            style={{
              color: "#495057",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "1.05rem",
              whiteSpace: "nowrap",
              margin: 0,
              padding: 0,
            }}
          >
            공지사항
          </Link>
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexShrink: 0,
            margin: 0,
            padding: 0,
          }}
        >
          <NotificationDropdown />

          {user ? (
            <Link
              to="/mypage"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "50%",
                margin: 0,
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(102, 126, 234, 0.3)",
                  margin: 0,
                  padding: 0,
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={username}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      margin: 0,
                      padding: 0,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: "white",
                      fontWeight: 700,
                      fontSize: "1.2rem",
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {username?.[0] || user.username?.[0] || "😊"}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <div
              style={{ display: "flex", gap: "1rem", margin: 0, padding: 0 }}
            >
              <Link
                to="/login"
                style={{
                  padding: "0.6rem 1.5rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "#667eea",
                  border: "1px solid #667eea",
                  textDecoration: "none",
                  margin: 0,
                }}
              >
                로그인
              </Link>
              <Link
                to="/signup"
                style={{
                  padding: "0.6rem 1.5rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "white",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  textDecoration: "none",
                  margin: 0,
                }}
              >
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
