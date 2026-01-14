import React, { useEffect } from "react";
import { useSocialLogin } from "@/hooks/auth/useSocialLogin";
import "./OAuth2CallbackPage.css";

const OAuth2CallbackPage: React.FC = () => {
    const { handleCallback } = useSocialLogin();

    useEffect(() => {
        const processCallback = async () => {
            try {
                console.log("🔄 OAuth2 콜백 처리 시작");
                await handleCallback();
            } catch (err) {
                console.error("❌ Callback processing error:", err);
                alert("로그인 처리 중 오류가 발생했습니다.");
                window.location.href = "/login";
            }
        };

        processCallback();
    }, [handleCallback]);

    return (
        <div className="oauth-callback-page">
            <div className="callback-container">
                <div className="spinner-wrapper">
                    <div className="spinner"></div>
                </div>
                <h2>로그인 처리중...</h2>
                <p>잠시만 기다려주세요</p>
            </div>
        </div>
    );
};

export default OAuth2CallbackPage;