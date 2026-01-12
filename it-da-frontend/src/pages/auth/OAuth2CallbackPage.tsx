import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocialLogin } from '@/hooks/auth/useSocialLogin';
import './OAuth2CallbackPage.css';

const OAuth2CallbackPage: React.FC = () => {
    const { provider } = useParams<{ provider: string }>();
    const [searchParams] = useSearchParams();
    const { handleCallback } = useSocialLogin();  // isLoading 제거

    useEffect(() => {
        const processCallback = async () => {
            const code = searchParams.get('code');
            const error = searchParams.get('error');

            if (error) {
                console.error('OAuth2 error:', error);
                window.location.href = '/login?error=social_login_failed';
                return;
            }

            if (code && provider) {
                try {
                    await handleCallback(provider, code);
                } catch (err) {
                    console.error('Callback processing error:', err);
                }
            } else {
                window.location.href = '/login';
            }
        };

        processCallback();
    }, [provider, searchParams, handleCallback]);

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