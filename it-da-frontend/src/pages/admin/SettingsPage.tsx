import React from 'react';

const SettingsPage: React.FC = () => {
    return (
        <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">시스템 설정</h2>
            <p className="text-gray-500">이 페이지는 곧 구현될 예정입니다.</p>
            <div className="mt-6 space-y-2 text-left max-w-md mx-auto text-gray-600">
                <p>• 카테고리 관리</p>
                <p>• 관리자 계정 관리</p>
                <p>• 사이트 설정</p>
                <p>• 시스템 로그</p>
            </div>
        </div>
    );
};

export default SettingsPage;