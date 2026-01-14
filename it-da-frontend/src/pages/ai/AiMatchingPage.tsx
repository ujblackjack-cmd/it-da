import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import "./AIMatchingPage.css";

interface KeyPoint {
  text: string;
}

interface Recommendation {
  meeting_id: number;
  title: string;
  category: string;
  subcategory: string;
  location_name: string;
  location_address: string;
  distance_km: number;
  meeting_time: string;
  expected_cost: number;
  current_participants: number;
  max_participants: number;
  match_score: number;
  predicted_rating: number;
  key_points: string[];
  reasoning: string;
  image_url?: string;
  organizer?: {
    name: string;
    rating: number;
    meetings: number;
  };
}

interface AISearchResult {
  user_prompt: string;
  parsed_query: any;
  total_candidates: number;
  recommendations: Recommendation[];
  fallback?: boolean;
}

const AIMatchingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // ✅ 디버깅 로그
  console.log("🔵 AIMatchingPage 렌더링");
  console.log("👤 useAuthStore user:", user);
  console.log("📦 전체 authStore:", useAuthStore.getState());
  console.log("🔍 searchParams q:", searchParams.get("q"));

  const [loading, setLoading] = useState(true);
  const [searchResult, setSearchResult] = useState<AISearchResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullReasoning, setShowFullReasoning] = useState(false);

  useEffect(() => {
    const query = searchParams.get("q");
    if (!query) {
      console.log("❌ 검색어 없음, 홈으로 리다이렉트");
      navigate("/");
      return;
    }

    console.log("✅ 검색 시작:", query);

    // ✅ user 체크 제거하고 일단 실행
    fetchAIRecommendations(query);
  }, [searchParams]); // user 의존성 제거

  const fetchAIRecommendations = async (userPrompt: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/ai/recommendations/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_prompt: userPrompt,
            user_id: user?.userId || 1, // ✅ user 없으면 기본값 1
            top_n: 5,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("AI 검색 실패");
      }

      const data: AISearchResult = await response.json();
      console.log("✅ AI 검색 결과:", data);
      setSearchResult(data);
    } catch (error) {
      console.error("❌ AI 검색 에러:", error);
      alert("AI 검색 중 오류가 발생했습니다.");
      // navigate('/'); // ✅ 에러 시 홈 이동도 제거
    } finally {
      setLoading(false);
    }
  };

  const switchMeeting = (index: number) => {
    setCurrentIndex(index);
    setShowFullReasoning(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const joinMeeting = async (meetingId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/meetings/${meetingId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("모임 참여 실패");
      }

      navigate(`/chatroom/${meetingId}`);
    } catch (error) {
      console.error("모임 참여 에러:", error);
      alert("모임 참여 신청에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay active">
        <div className="loading-spinner"></div>
        <div className="loading-text">AI가 최적의 모임을 찾고 있어요...</div>
        <div className="loading-subtext">잠시만 기다려주세요</div>
      </div>
    );
  }

  if (!searchResult || searchResult.recommendations.length === 0) {
    return (
      <div className="no-results">
        <h2>검색 결과가 없습니다</h2>
        <p>다른 키워드로 다시 검색해보세요.</p>
        <button onClick={() => navigate("/")}>메인으로 돌아가기</button>
      </div>
    );
  }

  const currentMeeting = searchResult.recommendations[currentIndex];

  return (
    <div className="ai-matching-page">
      {/* 헤더 */}
      <div className="header">
        <span className="back-button" onClick={() => navigate("/")}>
          ←
        </span>
        <h1>AI 추천 결과</h1>
      </div>

      {/* 성공 배너 */}
      <div className="success-banner">
        <h2>🎉 딱 맞는 모임을 찾았어요!</h2>
        <p>{searchResult.recommendations.length}개의 추천 모임</p>
      </div>

      {/* 사용자 요청 */}
      <div className="user-request">
        <h3>💬 당신의 요청</h3>
        <div className="request-bubble">{searchResult.user_prompt}</div>
      </div>

      {/* AI 분석 카드 */}
      <div className="ai-analysis">
        <div className="match-score">
          <div className="match-score-number">
            {currentMeeting.match_score}%
          </div>
          <div className="match-score-label">매칭률</div>
        </div>

        <h3>✨ 핵심 포인트</h3>
        <div className="key-points">
          {currentMeeting.key_points.map((point, idx) => (
            <div key={idx} className="point-item">
              {point}
            </div>
          ))}
        </div>
      </div>

      {/* 추천 모임 카드 */}
      <div className="recommended-meeting">
        {currentMeeting.image_url && (
          <img
            src={currentMeeting.image_url}
            alt={currentMeeting.title}
            className="meeting-image"
          />
        )}

        <div className="meeting-content">
          <h2 className="meeting-title">{currentMeeting.title}</h2>

          <div className="meeting-info">
            <div className="info-row">
              <span className="info-icon">📅</span>
              {new Date(currentMeeting.meeting_time).toLocaleString("ko-KR")}
            </div>
            <div className="info-row">
              <span className="info-icon">📍</span>
              {currentMeeting.location_name} (
              {currentMeeting.distance_km?.toFixed(1)}km)
            </div>
            <div className="info-row">
              <span className="info-icon">💰</span>
              {currentMeeting.expected_cost === 0
                ? "무료"
                : `${currentMeeting.expected_cost.toLocaleString()}원`}
            </div>
            <div className="info-row">
              <span className="info-icon">👥</span>
              현재 {currentMeeting.current_participants}명 참여 중 (최대{" "}
              {currentMeeting.max_participants}명)
            </div>
          </div>

          {/* GPT 추론 */}
          <div className="gpt-reasoning">
            <h4>🤖 AI가 추천한 이유</h4>
            <div
              className={`reasoning-text ${showFullReasoning ? "expanded" : ""}`}
            >
              {currentMeeting.reasoning}
            </div>
            <button
              className="toggle-reasoning"
              onClick={() => setShowFullReasoning(!showFullReasoning)}
            >
              {showFullReasoning ? "접기" : "더보기"}
            </button>
          </div>

          {/* 참여 버튼 */}
          <button
            className="join-button"
            onClick={() => joinMeeting(currentMeeting.meeting_id)}
          >
            이 모임 참여하기
          </button>
        </div>
      </div>

      {/* 다른 추천 모임 */}
      {searchResult.recommendations.length > 1 && (
        <div className="other-recommendations">
          <div className="section-header">
            <h3>다른 추천 모임</h3>
            <span className="card-count">
              {searchResult.recommendations.length - 1}개 더
            </span>
          </div>

          <div className="mini-cards">
            {searchResult.recommendations.map((meeting, idx) => {
              if (idx === currentIndex) return null;

              return (
                <div
                  key={meeting.meeting_id}
                  className="mini-meeting-card"
                  onClick={() => switchMeeting(idx)}
                >
                  {meeting.image_url && (
                    <img
                      src={meeting.image_url}
                      alt={meeting.title}
                      className="mini-card-image"
                    />
                  )}
                  <div className="mini-card-content">
                    <div className="mini-card-title">{meeting.title}</div>
                    <div className="mini-card-info">
                      <span>{meeting.location_name}</span>
                      <span>
                        ⏰{" "}
                        {new Date(meeting.meeting_time).toLocaleDateString(
                          "ko-KR"
                        )}
                      </span>
                    </div>
                    <div className="mini-card-badge">
                      매칭률 {meeting.match_score}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 프롬프팅 다시 하기 버튼 */}
      <div className="retry-section">
        <button className="retry-button" onClick={() => navigate("/")}>
          🔍 다시 검색하기
        </button>
      </div>
    </div>
  );
};

export default AIMatchingPage;
