import { useAuthStore } from "@/stores/useAuthStore.ts";
import { useCallback } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

export const useSocialLogin = () => {
    const { setSocialUser } = useAuthStore();

    const handleCallback = useCallback(async (): Promise<void> => {
        const maxRetries = 10; // 20초 (2초 × 10)
        console.log("🔄 OAuth2 세션 확인 시작");

        for (let i = 1; i <= maxRetries; i++) {
            try {
                console.log(`⏳ [${i}/${maxRetries}] 세션 확인 중...`);

                const response = await axios.get(`${API_BASE_URL}/api/auth/session`, {
                    withCredentials: true,
                    headers: {
                        "Cache-Control": "no-cache",
                        Pragma: "no-cache",
                    },
                });

                if (response.data?.userId) {
                    console.log("✅ 세션 확인 성공!", response.data);

                    // ✅ Zustand 스토어에 사용자 정보 저장
                    setSocialUser(response.data);

                    // ✅ 성향 데이터 확인
                    try {
                        await axios.get(
                            `${API_BASE_URL}/api/users/${response.data.userId}/preferences`,
                            { withCredentials: true }
                        );

                        console.log("✅ 성향 데이터 존재 - 메인으로 이동");
                        window.location.href = "/";
                    } catch (prefError: any) {
                        const errorStatus = prefError.response?.status;

                        if (errorStatus === 404 || errorStatus === 500) {
                            console.log("⚠️ 성향 데이터 없음 - 설정 페이지로 이동");
                            window.location.href = "/user-preference/setup";
                        } else {
                            throw prefError;
                        }
                    }
                    return;
                }
            } catch (error: any) {
                const status = error.response?.status;

                if (status === 401 && i < maxRetries) {
                    console.warn(`⏳ [${i}/${maxRetries}] 세션 확인 대기 중 (401)...`);
                    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기
                    continue;
                }

                console.error("❌ 세션 확인 실패:", error);
                break;
            }
        }

        console.error("❌ 로그인 세션 확인 최종 실패");
        alert("로그인에 실패했습니다. 다시 시도해주세요.");
        window.location.href = "/login";
    }, [setSocialUser]);

    return { handleCallback };
};