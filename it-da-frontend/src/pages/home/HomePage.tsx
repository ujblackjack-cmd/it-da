// src/pages/home/HomePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMeetingStore } from "@/stores/useMeetingStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useAuthStore } from "@/stores/useAuthStore";
import Header from "@/components/layout/Header";
import SearchSection from "@/components/common/SearchSection";
import RecentItems from "@/components/layout/RecentItems";
import AIRecommendCard from "@/components/ai/AiRecommendCard";
import ChatRoomGrid from "@/components/chat/ChatRoomGrid";
import CategoryGrid from "@/components/category/CategoryGrid";

import "./HomePage.css";
import { useMatchScores } from "@/hooks/ai/useMatchScore";

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    meetings = [],
    recentItems = [],
    aiRecommendation,
    fetchMeetings,
    fetchRecentItems,
    fetchAIRecommendation,
  } = useMeetingStore();

  const { fetchNotifications } = useNotificationStore();
  const [isRefreshingAI, setIsRefreshingAI] = useState(false);

  const aiOnlyIds = useMemo(() => {
    const aiId = aiRecommendation?.meetingId
      ? Number(aiRecommendation.meetingId)
      : null;
    return aiId ? [aiId] : [];
  }, [aiRecommendation?.meetingId]);

  const { matchMap, loading } = useMatchScores(user?.userId, aiOnlyIds);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchMeetings();

        // ✅ 최근 조회 모임 로드 (localStorage 기반)
        await fetchRecentItems(user?.userId);

        await fetchNotifications();

        if (user?.userId) {
          console.log("🎯 AI 추천 로드 시작:", user.userId);
          await fetchAIRecommendation(user.userId);
        }
      } catch (error) {
        console.error("❌ 데이터 로드 실패:", error);
      }
    };

    loadData();
  }, [user?.userId]);

  const handleAISearch = (query: string) => {
    if (!query.trim()) return;
    navigate(`/ai-matching?q=${encodeURIComponent(query)}`);
  };

  const handleRefreshAI = async () => {
    if (!user?.userId || isRefreshingAI) return;

    setIsRefreshingAI(true);
    try {
      console.log("🔄 AI 추천 새로고침:", user.userId);
      await fetchAIRecommendation(user.userId);
    } catch (error) {
      console.error("❌ AI 추천 새로고침 실패:", error);
    } finally {
      setIsRefreshingAI(false);
    }
  };

  // 디버깅용 로그
  console.log("🏠 HomePage 렌더링 - AI 추천:", aiRecommendation);
  console.log("📂 최근 본 모임:", recentItems);

  return (
    <div className="home-page">
      <Header />
      <div className="main-container">
        <SearchSection onSearch={handleAISearch} />

        {/* ✅ 최근 본 모임이 있으면 표시 */}
        {recentItems.length > 0 && <RecentItems items={recentItems} />}

        {/* ✅ 최근 본 모임이 없는 경우 */}
        {recentItems.length === 0 && (
          <div className="empty-recent-section">
            <p>🎯 아직 둘러본 모임이 없습니다</p>
            <button
              className="find-meeting-btn"
              onClick={() => navigate("/meetings")}
            >
              모임 찾아보기 →
            </button>
          </div>
        )}

        {/* AI 추천 */}
        {aiRecommendation && (
          <AIRecommendCard
            key={aiRecommendation.meetingId}
            meeting={aiRecommendation}
            matchPercentage={
              matchMap[Number(aiRecommendation.meetingId)]?.matchPercentage ?? 0
            }
            loading={loading}
            onRefresh={handleRefreshAI}
            isRefreshing={isRefreshingAI}
          />
        )}

        {/* AI 추천이 없을 때 - UI 개선! */}
        {!aiRecommendation && user?.userId && (
          <div className="ai-loading-section">
            <p>🤖 AI 추천을 불러오는 중이거나 추천 가능한 모임이 없습니다</p>
            <button onClick={handleRefreshAI} disabled={isRefreshingAI}>
              {isRefreshingAI ? "로딩 중..." : "🔄 다시 시도"}
            </button>
          </div>
        )}

        <section className="meeting-section">
          <div className="section-header">
            <h2 className="section-title">채팅방</h2>
            <button className="view-all" onClick={() => navigate("/meetings")}>
              전체보기 →
            </button>
          </div>
          <ChatRoomGrid meetings={meetings.slice(0, 6)} />
        </section>

        <section className="category-section">
          <div className="section-header">
            <h2 className="section-title">카테고리</h2>
            <button className="view-all" onClick={() => navigate("/category")}>
              전체보기 →
            </button>
          </div>
          <CategoryGrid />
        </section>
      </div>
    </div>
  );
};

export default HomePage;
