import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeetingList, updateMeetingStatus } from '../../api/admin.api';
import type { MeetingListResponse } from '../../types/admin.types';

const AdminMeetingManagePage: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<MeetingListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(0);

    useEffect(() => {
        fetchMeetings();
    }, [page]);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const response = await getMeetingList(page, 10, search, category, status);
            setData(response);
        } catch (error) {
            console.error('모임 목록 조회 실패:', error);
            alert('모임 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(0);
        fetchMeetings();
    };

    const handleStatusChange = async (meetingId: number, newStatus: string) => {
        if (!confirm(`정말 모임 상태를 "${getStatusText(newStatus)}"로 변경하시겠습니까?`)) {
            return;
        }

        try {
            await updateMeetingStatus(meetingId, { status: newStatus as any });
            alert('모임 상태가 변경되었습니다.');
            fetchMeetings();
        } catch (error) {
            console.error('상태 변경 실패:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    const handleMeetingClick = (meetingId: number) => {
        navigate(`/admin/meetings/${meetingId}`);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR');
    };

    const getStatusBadge = (meetingStatus: string) => {
        const statusConfig: any = {
            RECRUITING: { bg: '#d1fae5', color: '#065f46', text: '모집중' },
            COMPLETED: { bg: '#dbeafe', color: '#1e40af', text: '완료' },
            CANCELLED: { bg: '#fee2e2', color: '#991b1b', text: '취소' },
            DELETED: { bg: '#e5e7eb', color: '#374151', text: '삭제' },
        };
        const config = statusConfig[meetingStatus] || statusConfig.RECRUITING;

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

    const getStatusText = (meetingStatus: string) => {
        const statusMap: any = {
            RECRUITING: '모집중',
            COMPLETED: '완료',
            CANCELLED: '취소',
            DELETED: '삭제',
        };
        return statusMap[meetingStatus] || meetingStatus;
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
                모임 관리
            </h2>

            {/* 검색 및 필터 영역 */}
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="모임명 검색"
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
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            minWidth: '120px'
                        }}
                    >
                        <option value="">전체 카테고리</option>
                        <option value="운동">운동</option>
                        <option value="맛집">맛집</option>
                        <option value="카페">카페</option>
                        <option value="문화/예술">문화/예술</option>
                        <option value="스터디">스터디</option>
                        <option value="친목">친목</option>
                    </select>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            minWidth: '120px'
                        }}
                    >
                        <option value="">전체 상태</option>
                        <option value="RECRUITING">모집중</option>
                        <option value="COMPLETED">완료</option>
                        <option value="CANCELLED">취소</option>
                        <option value="DELETED">삭제</option>
                    </select>
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

            {/* 모임 목록 */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                            전체 모임 ({data?.totalElements || 0}개)
                        </h3>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left', fontSize: '0.875rem', color: '#6b7280' }}>
                            <th style={{ padding: '1rem' }}>ID</th>
                            <th style={{ padding: '1rem' }}>모임명</th>
                            <th style={{ padding: '1rem' }}>카테고리</th>
                            <th style={{ padding: '1rem' }}>리더</th>
                            <th style={{ padding: '1rem' }}>인원</th>
                            <th style={{ padding: '1rem' }}>모임일시</th>
                            <th style={{ padding: '1rem' }}>장소</th>
                            <th style={{ padding: '1rem' }}>생성일</th>
                            <th style={{ padding: '1rem' }}>상태</th>
                            <th style={{ padding: '1rem' }}>관리</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data?.meetings.map((meeting) => (
                            <tr
                                key={meeting.meetingId}
                                onClick={() => handleMeetingClick(meeting.meetingId)}
                                style={{
                                    borderTop: '1px solid #e5e7eb',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <td style={{ padding: '1rem' }}>{meeting.meetingId}</td>
                                <td style={{ padding: '1rem', fontWeight: '500' }}>{meeting.title}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                    {meeting.categoryName} / {meeting.subcategoryName}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{meeting.leaderName}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                    {meeting.currentMembers} / {meeting.maxMembers}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {formatDate(meeting.meetingDate)}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{meeting.location}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {formatDate(meeting.createdAt)}
                                </td>
                                <td style={{ padding: '1rem' }}>{getStatusBadge(meeting.status)}</td>
                                <td style={{ padding: '1rem' }}>
                                    <select
                                        value={meeting.status}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(meeting.meetingId, e.target.value);
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
                                        <option value="RECRUITING">모집중</option>
                                        <option value="COMPLETED">완료</option>
                                        <option value="CANCELLED">취소</option>
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

export default AdminMeetingManagePage;