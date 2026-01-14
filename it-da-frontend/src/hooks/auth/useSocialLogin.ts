export const useSocialLogin = () => {
    const handleCallback = async (provider: string, code: string) => {
        console.log("social login callback:", { provider, code });
        // TODO: 백엔드 붙이면 여기에서 API 호출
        window.location.href = "/";
    };

    return { handleCallback };
};
