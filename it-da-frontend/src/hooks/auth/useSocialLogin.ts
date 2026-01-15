import { useAuthStore } from "@/stores/useAuthStore.ts";
import { useCallback } from "react";
import axios from "axios";

export const useSocialLogin = () => {
    const { setSocialUser } = useAuthStore();
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const handleCallback = useCallback(async (): Promise<void> => {
        const maxRetries = 15;
        console.log("🔄 OAuth2 세션 확인 루프 시작");

        for (let i = 1; i <= maxRetries; i++) {
            try {
                const response = await axios.get("http://localhost:8080/api/auth/session", {
                    withCredentials: true,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });

                if (response.data?.userId) {
                    console.log("✅ 세션 확인 성공!", response.data);

                    // ✅ 성향 데이터 확인 후 리다이렉트
                    try {
                        await axios.get(
                            `http://localhost:8080/api/users/${response.data.userId}/preferences`,
                            { withCredentials: true }
                        );
                        // 성향 데이터 있음 → 메인으로
                        console.log("✅ 성향 데이터 존재 - 메인으로 이동");
                        setSocialUser(response.data);
                        window.location.href = "/";
                    } catch (prefError) {
                        const errorStatus = prefError.response?.status;

                        if (errorStatus === 404 || errorStatus === 500) {
                            // 성향 데이터 없음 → 설정 페이지로
                            console.log("⚠️ 성향 데이터 없음 - 설정 페이지로 이동");
                            setSocialUser(response.data);
                            window.location.href = "/user-preference/setup";
                        } else {
                            throw prefError;
                        }
                    }
                    return;
                }
            } catch (error: any) {
                const isAuthError = error.response?.status === 401;
                const isNetworkError = error.message === 'Network Error';

                if ((isAuthError || isNetworkError) && i < maxRetries) {
                    console.warn(`⏳ [${i}/${maxRetries}] 세션 확인 대기 중 (CORS/401)...`);
                    await sleep(2000);
                    continue;
                }
                console.error("❌ 치명적 로그인 에러:", error);
                break;
            }
        }
        throw new Error("로그인 세션 확인 최종 실패");
    }, [setSocialUser]);

    return { handleCallback };
};