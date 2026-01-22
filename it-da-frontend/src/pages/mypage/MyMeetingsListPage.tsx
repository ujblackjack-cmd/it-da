import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore.ts";
import mypageApi, { MyMeeting } from "@/api/mypage.api.ts";
import Header from "@/components/layout/Header.tsx";
// ✅ 모달 import 추가
import MeetingReviewsModal from "@/pages/mypage/components/MeetingReviewsModal";
import ReviewModal from "@/pages/mypage/components/ReviewModal";
import "./MyMeetingsListPage.css";

const MyMeetingsListPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [upcomingMeetings, setUpcomingMeetings] = useState<MyMeeting[]>([]);
    const [completedMeetings, setCompletedMeetings] = useState<MyMeeting[]>([]);

    // ✅ 리뷰 보기 모달 상태
    const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
    const [reviewMeetingId, setReviewMeetingId] = useState<number | null>(null);
    const [reviewMeetingTitle, setReviewMeetingTitle] = useState("");

    // ✅ 리뷰 쓰기 모달 상태
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [writeMeetingId, setWriteMeetingId] = useState<number | null>(null);
    const [writeMeetingTitle, setWriteMeetingTitle] = useState("");
    const [writeMeetingDateText, setWriteMeetingDateText] = useState("");

    // ✅ 모임 데이터 로드
    const fetchMeetings = useCallback(async () => {
        if (!user?.userId) return;

        setLoading(true);
        try {
            const [upcoming, completed] = await Promise.all([
                mypageApi.getUpcomingMeetings(user.userId, user.userId),
                mypageApi.getCompletedMeetings(user.userId, user.userId),
            ]);
            setUpcomingMeetings(upcoming);
            setCompletedMeetings(completed);
            console.log("✅ 모임 데이터 로드 완료:", { upcoming, completed });
        } catch (error) {
            console.error("모임 조회 실패:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.userId]);

    useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    // ✅ 날짜 포맷
    const formatDate = (dateTime: string) => {
        const d = new Date(dateTime);
        if (isNaN(d.getTime())) return dateTime;
        const month = d.getMonth() + 1;
        const date = d.getDate();
        const hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const day = dayNames[d.getDay()];
        return `${month}월 ${date}일 (${day}) ${hours}:${minutes}`;
    };

    // ✅ D-Day 계산
    const getDday = (dateTime: string) => {
        const target = new Date(dateTime).getTime();
        const now = new Date().getTime();
        const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
        if (isNaN(diff)) return null;
        if (diff > 0) return `D-${diff}`;
        if (diff === 0) return 'D-DAY';
        return null;
    };

    // ✅ 리뷰 버튼 클릭 핸들러
    const handleReviewClick = (meeting: MyMeeting) => {
        if (meeting.hasMyReview) {
            // 리뷰가 있으면 → 리뷰 목록 모달 열기
            setReviewMeetingId(meeting.meetingId);
            setReviewMeetingTitle(meeting.meetingTitle);
            setIsReviewsModalOpen(true);
        } else {
            // 리뷰가 없으면 → 리뷰 작성 모달 열기
            setWriteMeetingId(meeting.meetingId);
            setWriteMeetingTitle(meeting.meetingTitle);
            setWriteMeetingDateText(`${formatDate(meeting.dateTime)} 참여`);
            setIsWriteModalOpen(true);
        }
    };

    // 로그인 안된 경우
    if (!user) {
        return (
            <div className="my-meetings-list-page">
                <Header />
                <div className="mml-container">
                    <div className="mml-login-required">
                        <span className="mml-emoji">🔐</span>
                        <h2>로그인이 필요합니다</h2>
                        <p>내 모임을 확인하려면 로그인해주세요</p>
                        <button onClick={() => navigate("/login")} className="mml-login-btn">
                            로그인하기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="my-meetings-list-page">
            <Header />

            <div className="mml-container">
                {/* ✅ 헤더 */}
                <div className="mml-page-header">
                    <h1>📅 내 모임</h1>
                    <p>참여 중인 모임과 완료된 모임을 확인하세요</p>
                </div>

                {loading ? (
                    <div className="mml-loading">
                        <div className="mml-spinner"></div>
                        <p>모임을 불러오는 중...</p>
                    </div>
                ) : (
                    <>
                        {/* ✅ 진행 예정 모임 */}
                        <section className="mml-section">
                            <div className="mml-section-header">
                                <h2>💚 진행 예정 모임</h2>
                                <span className="mml-count">{upcomingMeetings.length}개</span>
                            </div>

                            {upcomingMeetings.length === 0 ? (
                                <div className="mml-empty-section">
                                    <span className="mml-emoji">📭</span>
                                    <p>예정된 모임이 없습니다</p>
                                    <button onClick={() => navigate("/meetings")} className="mml-find-btn">
                                        모임 찾아보기 →
                                    </button>
                                </div>
                            ) : (
                                <div className="mml-grid">
                                    {upcomingMeetings.map((meeting) => {
                                        const dday = getDday(meeting.dateTime);
                                        return (
                                            <div
                                                key={meeting.meetingId}
                                                className="mml-card"
                                                onClick={() => navigate(`/meetings/${meeting.meetingId}`)}
                                            >
                                                <div className="mml-card-image">
                                                    <div className="mml-placeholder">
                                                        <span>📅</span>
                                                    </div>
                                                    {dday && <span className="mml-dday">{dday}</span>}
                                                </div>
                                                <div className="mml-card-content">
                                                    <h3 className="mml-title">{meeting.meetingTitle}</h3>
                                                    <p className="mml-info">
                                                        <span className="mml-icon">🕐</span>
                                                        {formatDate(meeting.dateTime)}
                                                    </p>
                                                    <p className="mml-info">
                                                        <span className="mml-icon">📍</span>
                                                        {meeting.location}
                                                    </p>
                                                    <div className="mml-card-actions">
                                                        <button
                                                            className="mml-btn chat"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/chat/${meeting.meetingId}`);
                                                            }}
                                                        >
                                                            💬 톡방 입장
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* ✅ 완료된 모임 */}
                        <section className="mml-section">
                            <div className="mml-section-header">
                                <h2>✅ 완료된 모임</h2>
                                <span className="mml-count completed">{completedMeetings.length}개</span>
                            </div>

                            {completedMeetings.length === 0 ? (
                                <div className="mml-empty-section">
                                    <span className="mml-emoji">📭</span>
                                    <p>완료된 모임이 없습니다</p>
                                </div>
                            ) : (
                                <div className="mml-grid">
                                    {completedMeetings.map((meeting) => (
                                        <div
                                            key={meeting.meetingId}
                                            className="mml-card completed"
                                            onClick={() => navigate(`/meetings/${meeting.meetingId}`)}
                                        >
                                            <div className="mml-card-image">
                                                <div className="mml-placeholder completed">
                                                    <span>✅</span>
                                                </div>
                                                <span className="mml-badge completed">완료</span>
                                            </div>
                                            <div className="mml-card-content">
                                                <h3 className="mml-title">{meeting.meetingTitle}</h3>
                                                <p className="mml-info">
                                                    <span className="mml-icon">🕐</span>
                                                    {formatDate(meeting.dateTime)}
                                                </p>
                                                {/* ✅ 평균 평점 표시 */}
                                                <div className="mml-rating">
                                                    <span className="mml-stars">
                                                        {'★'.repeat(Math.floor(meeting.averageRating || 0))}
                                                        {'☆'.repeat(5 - Math.floor(meeting.averageRating || 0))}
                                                    </span>
                                                    <span className="mml-score">
                                                        {(meeting.averageRating || 0).toFixed(1)}
                                                    </span>
                                                </div>
                                                <div className="mml-card-actions">
                                                    {/* ✅ 리뷰 버튼 → 모달로 열기! */}
                                                    <button
                                                        className="mml-btn review"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleReviewClick(meeting);
                                                        }}
                                                    >
                                                        📝 {meeting.hasMyReview ? '리뷰 보기' : '리뷰 쓰기'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            {/* ✅ 리뷰 보기 모달 (4번째 사진처럼!) */}
            <MeetingReviewsModal
                isOpen={isReviewsModalOpen}
                onClose={() => setIsReviewsModalOpen(false)}
                meetingId={reviewMeetingId}
                meetingTitle={reviewMeetingTitle}
            />

            {/* ✅ 리뷰 쓰기 모달 */}
            <ReviewModal
                isOpen={isWriteModalOpen}
                onClose={() => setIsWriteModalOpen(false)}
                userId={user.userId}
                currentUserId={user.userId}
                meetingId={writeMeetingId}
                meetingTitle={writeMeetingTitle}
                meetingDateText={writeMeetingDateText}
                onSubmitted={() => {
                    void fetchMeetings();
                }}
            />
        </div>
    );
};

export default MyMeetingsListPage;
