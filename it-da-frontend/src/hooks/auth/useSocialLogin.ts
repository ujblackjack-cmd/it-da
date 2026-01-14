import { useAuthStore } from "@/stores/useAuthStore";
import axios, { AxiosError } from "axios";
import { useCallback } from "react";

export const useSocialLogin = () => {
    const { setSocialUser } = useAuthStore();

    const handleCallback = useCallback(async () => {
        let retryCount = 0;
        const maxRetries = 15;

        const checkSession = async () => {
            try {
                console.log(`🔍 세션 확인 시도 (${retryCount + 1}/${maxRetries})`);

                const response = await axios.get("http://localhost:8080/api/auth/session", {
                    withCredentials: true,
                    timeout: 5000
                });

                console.log("📦 세션 응답:", response.data);

                if (response.data && response.data.userId) {
                    const userData = response.data;

                    // localStorage에 저장
                    localStorage.setItem("user", JSON.stringify(userData));

                    // Zustand 스토어 업데이트
                    setSocialUser({
                        userId: userData.userId,
                        email: userData.email,
                        nickname: userData.nickname,
                        username: userData.username
                    });

                    console.log("✅ 소셜 로그인 성공!");

                    // 상태 업데이트 후 홈으로 이동
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 500);

                    return;
                } else {
                    throw new Error("세션 데이터 불완전");
                }
            } catch (error) {
                retryCount++;

                // AxiosError 타입 가드
                if (axios.isAxiosError(error)) {
                    const axiosError = error as AxiosError;

                    if (axiosError.response?.status === 401) {
                        // 아직 세션이 생성되지 않음
                        if (retryCount < maxRetries) {
                            console.warn(`⏳ 세션 생성 대기 중... (${retryCount}/${maxRetries})`);
                            setTimeout(checkSession, 1000);
                        } else {
                            console.error("❌ 세션 확인 최대 재시도 초과");
                            throw new Error("세션 확인 실패");
                        }
                    } else {
                        console.error("❌ 세션 확인 에러:", axiosError.message);
                        throw error;
                    }
                } else {
                    // Axios 에러가 아닌 경우
                    console.error("❌ 예상치 못한 에러:", error);
                    throw error;
                }
            }
        };

        await checkSession();
    }, [setSocialUser]);

    return { handleCallback };
};