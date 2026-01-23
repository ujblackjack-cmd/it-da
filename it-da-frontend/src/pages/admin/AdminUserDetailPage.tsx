import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserDetail, updateUserStatus } from '../../api/admin.api';
import type { UserManageResponse } from '../../types/admin.types';

const AdminUserDetailPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserManageResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchUserDetail();
        }
    }, [userId]);

    const fetchUserDetail = async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const response = await getUserDetail(parseInt(userId));
            setUser(response);
        } catch (error) {
            console.error('회원 상세 조회 실패:', error);
            alert('회원 정보를 불러오는데 실패했습니다.');
            navigate('/admin/users');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (status: string) => {
        if (!userId || !confirm(`정말 회원 상태를 "${getStatusText(status)}"로 변경하시겠습니까?`)) {
            return;
        }

        try {
            await updateUserStatus(parseInt(userId), { status: status as any });
            alert('회원 상태가 변경되었습니다.');
            fetchUserDetail();
        } catch (error) {
            console.error('상태 변경 실패:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    const getStatusText = (status: string) => {
        const statusMap: any = {
            ACTIVE: '활성',
            SUSPENDED: '정지',
            DELETED: '삭제',
        };
        return statusMap[status] || status;
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: any = {
            ACTIVE: { bg: '#d1fae5', color: '#065f46', text: '활성' },
            SUSPENDED: { bg: '#fee2e2', color: '#991b1b', text: '정지' },
            DELETED: { bg: '#e5e7eb', color: '#374151', text: '삭제' },
        };
        const config = statusConfig[status] || statusConfig.ACTIVE;

        return (
            <span style={{
                padding: '0.5rem 1rem',
                backgroundColor: config.bg,
                color: config.color,
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '600'
            }}>
                {config.text}
            </span>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '16rem' }}>
                <div style={{ fontSize: '1.25rem' }}>로딩 중...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '16rem' }}>
                <div style={{ fontSize: '1.25rem' }}>회원 정보를 찾을 수 없습니다.</div>
            </div>
        );
    }

    return (
        <div>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/admin/users')}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#e5e7eb',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    ← 목록으로
                </button>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                    회원 상세 정보
                </h2>
            </div>

            {/* 회원 정보 카드 */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>

                {/* 프로필 영역 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2rem',
                    paddingBottom: '2rem',
                    borderBottom: '2px solid #e5e7eb',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: 'white'
                    }}>
                        {user.username.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {user.username}
                        </h3>
                        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{user.email}</p>
                        {getStatusBadge(user.status)}
                    </div>
                    <div>
                        <select
                            value={user.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            <option value="ACTIVE">활성화</option>
                            <option value="SUSPENDED">정지</option>
                            <option value="DELETED">삭제</option>
                        </select>
                    </div>
                </div>

                {/* 상세 정보 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                    {/* 왼쪽 컬럼 */}
                    <div>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                            기본 정보
                        </h4>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    회원 ID
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    {user.userId}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    이메일
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    {user.email}
                                </div>
                            </div>
                            {user.phone && (
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                        전화번호
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                        {user.phone}
                                    </div>
                                </div>
                            )}
                            {user.address && (
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                        주소
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                        {user.address}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 오른쪽 컬럼 */}
                    <div>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                            활동 정보
                        </h4>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    가입일
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    {formatDate(user.createdAt)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    최근 로그인
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    {formatDate(user.lastLoginAt)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    참여 모임 수
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    {user.meetingCount || 0}개
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    평점
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    ⭐ {user.rating ? user.rating.toFixed(1) : '0.0'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUserDetailPage;