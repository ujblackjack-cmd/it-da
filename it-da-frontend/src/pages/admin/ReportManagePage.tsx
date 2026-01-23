import React from 'react';

const ReportManagePage: React.FC = () => {
    return (
        <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">신고 관리</h2>
            <p className="text-gray-500">이 페이지는 곧 구현될 예정입니다.</p>
            <div className="mt-6 space-y-2 text-left max-w-md mx-auto text-gray-600">
                <p>• 신고 목록 조회</p>
                <p>• 처리 상태별 필터링</p>
                <p>• 신고 상세 내용</p>
                <p>• 신고 처리 (승인/반려)</p>
            </div>
        </div>
    );
};

export default ReportManagePage;