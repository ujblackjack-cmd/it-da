import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserList, updateUserStatus, getUserDetail } from '../../api/admin.api';  // ✅ getUserDetail 추가
import type { UserListResponse, UserManageResponse } from '../../types/admin.types';

const UserManagePage: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<UserListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);


    useEffect(() => {
        fetchUsers();
    }, [page]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await getUserList(page, 10, search);
            setData(response);
        } catch (error) {
            console.error('회원 목록 조회 실패:', error);
            alert('회원 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(0);
        fetchUsers();
    };

    const handleStatusChange = async (userId: number, status: string) => {
        if (!confirm(`정말 회원 상태를 "${status}"로 변경하시겠습니까?`)) {
            return;
        }

        try {
            await updateUserStatus(userId, { status: status as any });
            alert('회원 상태가 변경되었습니다.');
            fetchUsers();
        } catch (error) {
            console.error('상태 변경 실패:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    const handleUserClick = (userId: number) => {
        navigate(`/admin/users/${userId}`);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR');
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
                padding: '0.25rem 0.5rem',
                backgroundColor: config.bg,
                color: config.color,
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: '500'
            }}>
                {config.text}
            </span>
        );
    };

    if (loading && !data) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '16rem' }}>
                <div style={{ fontSize: '1.25rem' }}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                회원 관리
            </h2>

            {/* 검색 영역 */}
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="이름 또는 이메일 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        style={{
                            flex: 1,
                            padding: '0.5rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem'
                        }}
                    />
                    <button
                        onClick={handleSearch}
                        style={{
                            padding: '0.5rem 1.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        검색
                    </button>
                </div>
            </div>

            {/* 회원 목록 */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                            전체 회원 ({data?.totalElements || 0}명)
                        </h3>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left', fontSize: '0.875rem', color: '#6b7280' }}>
                            <th style={{ padding: '1rem' }}>ID</th>
                            <th style={{ padding: '1rem' }}>이름</th>
                            <th style={{ padding: '1rem' }}>이메일</th>
                            <th style={{ padding: '1rem' }}>가입일</th>
                            <th style={{ padding: '1rem' }}>최근 로그인</th>
                            <th style={{ padding: '1rem' }}>모임수</th>
                            <th style={{ padding: '1rem' }}>평점</th>
                            <th style={{ padding: '1rem' }}>상태</th>
                            <th style={{ padding: '1rem' }}>관리</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data?.users.map((user) => (
                            <tr key={user.userId}
                                onClick={() => handleUserClick(user.userId)}
                                style={{ borderTop: '1px solid #e5e7eb',
                                         cursor: 'pointer',
                                         transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <td style={{ padding: '1rem' }}>{user.userId}</td>
                                <td style={{ padding: '1rem' }}>{user.username}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{user.email}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {formatDate(user.createdAt)}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {formatDate(user.lastLoginAt)}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{user.meetingCount || 0}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                    {user.rating ? user.rating.toFixed(1) : '-'}
                                </td>
                                <td style={{ padding: '1rem' }}>{getStatusBadge(user.status)}</td>
                                <td style={{ padding: '1rem' }}>
                                    <select
                                        value={user.status}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(user.userId, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="ACTIVE">활성</option>
                                        <option value="SUSPENDED">정지</option>
                                        <option value="DELETED">삭제</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.5rem'
                }}>
                    <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            backgroundColor: page === 0 ? '#f3f4f6' : 'white',
                            cursor: page === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        이전
                    </button>
                    <span style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                        {page + 1} / {data?.totalPages || 1}
                    </span>
                    <button
                        onClick={() => setPage(Math.min((data?.totalPages || 1) - 1, page + 1))}
                        disabled={page >= (data?.totalPages || 1) - 1}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            backgroundColor: page >= (data?.totalPages || 1) - 1 ? '#f3f4f6' : 'white',
                            cursor: page >= (data?.totalPages || 1) - 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        다음
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserManagePage;