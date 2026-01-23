import React from 'react';

const InquiryManagePage: React.FC = () => {
    return (
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>1:1 문의 관리</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>이 페이지는 곧 구현될 예정입니다.</p>
            <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left', color: '#4b5563' }}>
                <p style={{ marginBottom: '0.5rem' }}>• 문의 목록 조회</p>
                <p style={{ marginBottom: '0.5rem' }}>• 문의 유형별 필터링</p>
                <p style={{ marginBottom: '0.5rem' }}>• 문의 상세 내용</p>
                <p style={{ marginBottom: '0.5rem' }}>• 답변 작성 및 전송</p>
                <p>• 처리 상태 관리</p>
            </div>
        </div>
    );
};

export default InquiryManagePage;