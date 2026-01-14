import { useEffect } from "react";
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

    useEffect(() => {
        fetchMeetings();
        fetchRecentItems();
        fetchNotifications();

        if (user?.userId) {
            fetchAIRecommendation(user.userId);
        }
    }, [user?.userId]);

    const handleAISearch = (query: string) => {
        console.log("🔍 AI 검색 실행:", query);

        if (!query.trim()) {
            console.log("❌ 검색어 없음");
            return;
        }

        const targetUrl = `/ai-matching?q=${encodeURIComponent(query)}`;
        console.log("🚀 이동할 경로:", targetUrl);
        window.location.href = targetUrl;
    };

    return (
        <div className="home-page">
            <Header />

            <div className="main-container">
                <SearchSection onSearch={handleAISearch} />

                {recentItems.length > 0 && <RecentItems items={recentItems} />}
                {aiRecommendation && <AIRecommendCard meeting={aiRecommendation} />}

                <section className="meeting-section">
                    <div className="section-header">
                        <h2 className="section-title">채팅방</h2>
                        {/* ✅ 모임 찾기 페이지로 이동 */}
                        <button className="view-all" onClick={() => navigate("/meetings")}>
                            전체보기 →
                        </button>
                    </div>
                    <ChatRoomGrid meetings={meetings.slice(0, 6)} />
                </section>

                <section className="category-section">
                    <div className="section-header">
                        <h2 className="section-title">카테고리</h2>
                        {/* ✅ 카테고리 페이지로 이동 */}
                        <button
                            className="view-all"
                            onClick={() => navigate("/categories")}
                        >
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
