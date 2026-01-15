import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { userPreferenceAPI } from '@/api/userPreference.api';
import { AxiosError } from 'axios';

interface PreferenceGuardProps {
    children: React.ReactNode;
}

export const PreferenceGuard: React.FC<PreferenceGuardProps> = ({ children }) => {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const checkPreference = async (): Promise<void> => {
            if (isAuthenticated && user?.userId) {
                try {
                    await userPreferenceAPI.getUserPreference(user.userId);
                } catch (error) {
                    const axiosError = error as AxiosError;
                    // ✅ 404가 뜨면 즉시 설정 페이지로 이동시켜 중복 호출을 막습니다.
                    if (axiosError.response?.status === 404) {
                        navigate('/user-preference/setup');
                    } else {
                        // 404 이외의 에러 처리
                        console.error("선호도 확인 중 오류 발생:", axiosError.message);
                    }
                }
            }
        };
        checkPreference();
    }, [isAuthenticated, user?.userId, navigate]);

    return <>{children}</>;
};