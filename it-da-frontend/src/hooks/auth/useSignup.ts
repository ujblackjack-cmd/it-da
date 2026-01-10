import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import toast from 'react-hot-toast';
import type { SignupData } from '@/types/auth.types';
import { authAPI } from '@/api/auth';

interface UseSignupReturn {
    isLoading: boolean;
    error: string | null;
    signup: (data: SignupData) => Promise<void>;
    clearError: () => void;
}

export const useSignup = (): UseSignupReturn => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signup = async (signupData: SignupData) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await authAPI.signup(signupData);

            if (response.user) {
                useAuthStore.setState({
                    user: response.user,
                    isAuthenticated: true
                });

                toast.success('회원가입이 완료되었습니다! 환영합니다 🎉');
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || '회원가입에 실패했습니다.';
            setError(errorMessage);
            toast.error(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    return {
        isLoading,
        error,
        signup,
        clearError,
    };
};