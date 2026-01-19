import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";

import NotificationDropdown from "../../pages/mypage/components/NotificationDropdown";
import "./Header.css";

const Header = () => {
  const { user, logout } = useAuthStore();

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
              {/* ✅ 이것만 변경: /profile → /mypage */}
              <Link to="/mypage" className="user-avatar">
                {user.username?.[0] || "사"}
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
