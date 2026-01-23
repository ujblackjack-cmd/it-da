import React, { useEffect, useState } from 'react';
import { getDashboard } from '../../api/admin.api';
import type { DashboardResponse } from '../../types/admin.types';

const AdminDashboardPage: React.FC = () => {
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await getDashboard();
            setData(response);
        } catch (err: any) {
            console.error('대시보드 조회 실패:', err);
            setError('대시보드 데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '16rem' }}>
                <div style={{ fontSize: '1.25rem' }}>로딩 중...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.5rem' }}>
                {error || '데이터를 불러올 수 없습니다.'}
            </div>
        );
    }

    const { dashboard, recentUsers, recentMeetings } = data;

    const stats = [
        {
            label: '전체 회원',
            value: dashboard.totalUsersCount.toLocaleString(),
            change: dashboard.userGrowthRate,
            bgColor: '#3b82f6',
        },
        {
            label: '활성 모임',
            value: dashboard.activeMeetingsCount.toLocaleString(),
            change: dashboard.meetingGrowthRate,
            bgColor: '#10b981',
        },
        {
            label: '대기 신고',
            value: dashboard.pendingReportsCount.toLocaleString(),
            change: 0,
            bgColor: '#ef4444',
        },
        {
            label: '오늘 가입',
            value: dashboard.todayJoinedUsersCount.toLocaleString(),
            change: 0,
            bgColor: '#8b5cf6',
        },
        {
            label: '1:1 문의 대기',
            value: dashboard.pendingInquiriesCount.toLocaleString(),
            change: 0,
            bgColor: '#f59e0b',
        },
    ];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR');
    };

    return (
        <div>
            {/* 통계 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                {stats.map((stat, index) => (
                    <div key={index} style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        padding: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                    {stat.label}
                                </p>
                                <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>
                                    {stat.value}
                                </p>
                                {stat.change !== 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.25rem' }}>
                                        {stat.change > 0 ? (
                                            <>
                                                <span style={{ color: '#10b981', marginRight: '0.25rem' }}>↗</span>
                                                <p style={{ fontSize: '0.875rem', color: '#10b981' }}>
                                                    +{stat.change.toFixed(1)}% vs 지난주
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ color: '#ef4444', marginRight: '0.25rem' }}>↘</span>
                                                <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>
                                                    {stat.change.toFixed(1)}% vs 지난주
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div style={{
                                width: '3rem',
                                height: '3rem',
                                backgroundColor: stat.bgColor,
                                borderRadius: '0.5rem',
                                opacity: 0.2
                            }}></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 최근 활동 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* 최근 가입 회원 */}
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>최근 가입 회원</h3>
                    </div>
                    <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{ textAlign: 'left', fontSize: '0.875rem', color: '#6b7280' }}>
                                <th style={{ paddingBottom: '0.75rem' }}>이름</th>
                                <th style={{ paddingBottom: '0.75rem' }}>이메일</th>
                                <th style={{ paddingBottom: '0.75rem' }}>가입일</th>
                                <th style={{ paddingBottom: '0.75rem' }}>상태</th>
                            </tr>
                            </thead>
                            <tbody>
                            {recentUsers.map((user) => (
                                <tr key={user.userId} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '0.75rem 0' }}>{user.username}</td>
                                    <td style={{ padding: '0.75rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
                                        {user.email}
                                    </td>
                                    <td style={{ padding: '0.75rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td style={{ padding: '0.75rem 0' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                backgroundColor: '#d1fae5',
                                                color: '#065f46',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.75rem'
                                            }}>
                                                {user.status}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 최근 생성 모임 */}
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>최근 생성 모임</h3>
                    </div>
                    <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{ textAlign: 'left', fontSize: '0.875rem', color: '#6b7280' }}>
                                <th style={{ paddingBottom: '0.75rem' }}>모임명</th>
                                <th style={{ paddingBottom: '0.75rem' }}>카테고리</th>
                                <th style={{ paddingBottom: '0.75rem' }}>인원</th>
                                <th style={{ paddingBottom: '0.75rem' }}>생성일</th>
                            </tr>
                            </thead>
                            <tbody>
                            {recentMeetings.map((meeting) => (
                                <tr key={meeting.meetingId} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '0.75rem 0' }}>{meeting.title}</td>
                                    <td style={{ padding: '0.75rem 0' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                backgroundColor: '#dbeafe',
                                                color: '#1e40af',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.75rem'
                                            }}>
                                                {meeting.categoryName}
                                            </span>
                                    </td>
                                    <td style={{ padding: '0.75rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
                                        {meeting.currentMembers}명
                                    </td>
                                    <td style={{ padding: '0.75rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
                                        {formatDate(meeting.createdAt)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;