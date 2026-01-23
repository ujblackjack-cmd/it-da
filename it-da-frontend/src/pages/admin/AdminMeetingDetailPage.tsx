import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMeetingDetail, updateMeetingStatus } from '../../api/admin.api';
import type { MeetingManageResponse } from '../../types/admin.types';

const AdminMeetingDetailPage: React.FC = () => {
    const { meetingId } = useParams<{ meetingId: string }>();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState<MeetingManageResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (meetingId) {
            fetchMeetingDetail();
        }
    }, [meetingId]);

    const fetchMeetingDetail = async () => {
        if (!meetingId) return;

        setLoading(true);
        try {
            const response = await getMeetingDetail(parseInt(meetingId));
            setMeeting(response);
        } catch (error) {
            console.error('모임 상세 조회 실패:', error);
            alert('모임 정보를 불러오는데 실패했습니다.');
            navigate('/admin/meetings');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (status: string) => {
        if (!meetingId || !confirm(`정말 모임 상태를 "${getStatusText(status)}"로 변경하시겠습니까?`)) {
            return;
        }

        try {
            await updateMeetingStatus(parseInt(meetingId), { status: status as any });
            alert('모임 상태가 변경되었습니다.');
            fetchMeetingDetail();
        } catch (error) {
            console.error('상태 변경 실패:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    const getStatusText = (status: string) => {
        const statusMap: any = {
            RECRUITING: '모집중',
            FULL: '모집완료',
            COMPLETED: '완료',
            CANCELLED: '취소',
            DELETED: '삭제',
        };
        return statusMap[status] || status;
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: any = {
            RECRUITING: { bg: '#d1fae5', color: '#065f46', text: '모집중' },
            FULL: { bg: '#dbeafe', color: '#1e40af', text: '모집완료' },
            COMPLETED: { bg: '#e0e7ff', color: '#4338ca', text: '완료' },
            CANCELLED: { bg: '#fee2e2', color: '#991b1b', text: '취소' },
            DELETED: { bg: '#e5e7eb', color: '#374151', text: '삭제' },
        };
        const config = statusConfig[status] || statusConfig.RECRUITING;

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
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatSimpleDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '16rem' }}>
                <div style={{ fontSize: '1.25rem' }}>로딩 중...</div>
            </div>
        );
    }

    if (!meeting) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '16rem' }}>
                <div style={{ fontSize: '1.25rem' }}>모임 정보를 찾을 수 없습니다.</div>
            </div>
        );
    }

    return (
        <div>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/admin/meetings')}
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
                    모임 상세 정보
                </h2>
            </div>

            {/* 모임 정보 카드 */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>

                {/* 모임 헤더 */}
                <div style={{
                    paddingBottom: '2rem',
                    borderBottom: '2px solid #e5e7eb',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                {meeting.title}
                            </h3>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#6b7280', marginBottom: '1rem' }}>
                                <span>{meeting.categoryName}</span>
                                <span>•</span>
                                <span>{meeting.subcategoryName}</span>
                            </div>
                            {getStatusBadge(meeting.status)}
                        </div>
                        <div>
                            <select
                                value={meeting.status}
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
                                <option value="RECRUITING">모집중</option>
                                <option value="FULL">모집완료</option>
                                <option value="COMPLETED">완료</option>
                                <option value="CANCELLED">취소</option>
                                <option value="DELETED">삭제</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 상세 정보 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                    {/* 왼쪽 컬럼 - 기본 정보 */}
                    <div>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                            기본 정보
                        </h4>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    모임 ID
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    {meeting.meetingId}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    리더
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    {meeting.leaderName}
                                    <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                                        ({meeting.leaderEmail})
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    모임 일시
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    📅 {formatDate(meeting.meetingDate)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    장소
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    📍 {meeting.location}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    참여 인원
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    👥 {meeting.currentMembers ?? 0} / {meeting.maxMembers ?? 0}명
                                </div>
                            </div>
                            {meeting.expectedCost != null && (
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                        예상 비용
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                        💰 {meeting.expectedCost?.toLocaleString() ?? '0'}원
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 오른쪽 컬럼 - 활동 정보 */}
                    <div>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                            활동 정보
                        </h4>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    생성일
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                    {formatSimpleDate(meeting.createdAt)}
                                </div>
                            </div>
                            {meeting.avgRating != null && (
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                        평균 평점
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                        ⭐ {meeting.avgRating?.toFixed(1)}
                                    </div>
                                </div>
                            )}
                            {meeting.reviewCount != null && (
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                        리뷰 수
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                                        💬 {meeting.reviewCount ?? 0}개
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminMeetingDetailPage;