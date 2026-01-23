import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import toast from "react-hot-toast";
import "./LoginPage.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {

        const response = await login(formData);

        // 👇 관리자/일반 사용자 구분
        if (response?.userType === 'ADMIN') {
            toast.success("관리자 로그인 성공!");
            navigate("/admin/dashboard");
        } else {
            toast.success("로그인 성공!");
            navigate("/");
        }
    } catch {
        toast.error("로그인에 실패했습니다.");
    }
  };

  // 소셜 로그인 핸들러
  const handleSocialLogin = (provider: string) => {
    // 백엔드 Spring Security OAuth2 엔드포인트로 이동
    window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">IT-DA</h1>
        <p className="login-subtitle">IT-DA</p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            name="email"
            placeholder="이메일"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="login-input"
            disabled={isLoading}
          />
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="login-input"
            disabled={isLoading}
          />
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "로그인 중..." : "로그인"}
          </button>

          <div className="social-login">
            <button
              onClick={() => handleSocialLogin("kakao")}
              className="social-button kakao"
              type="button"
            >
              <span className="social-icon">K</span> 카카오 로그인
            </button>
            <button
              onClick={() => handleSocialLogin("naver")}
              className="social-button naver"
              type="button"
            >
              <span className="social-icon">N</span> 네이버 로그인
            </button>
            <button
              onClick={() => handleSocialLogin("google")}
              className="social-button google"
              type="button"
            >
              <span className="social-icon">G</span> 구글 로그인
            </button>
          </div>
        </form>

        <div className="login-footer">
          <a href="/signup">회원가입</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
