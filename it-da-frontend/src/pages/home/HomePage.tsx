const HomePage = () => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            gap: '20px'
        }}>
            <h1>IT-DA 메인 페이지</h1>
            <p>로그인 후 이용 가능합니다</p>
            <a href="/login" style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px'
            }}>
                로그인하러 가기
            </a>
        </div>
    );
};

export default HomePage;