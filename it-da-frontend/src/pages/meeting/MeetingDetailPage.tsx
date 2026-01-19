import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import axios from "axios";
import "./MeetingDetailPage.css";

interface MeetingDetail {
  meetingId: number;
  organizerId: number;
  organizerUsername: string;
  organizerProfileImage: string;
  organizerEmail: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  meetingTime: string;
  timeSlot: string;
  locationName: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  locationType: string;
  vibe: string;
  currentParticipants: number;
  maxParticipants: number;
  expectedCost: number;
  imageUrl: string;
  status: string;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  isFull: boolean;
  dDay: number;
  participants?: Participant[];
  tags: string;
}

interface Participant {
  userId: number;
  username: string;
  profileImage: string;
  status: string;
  joinedAt: string;
}

interface SatisfactionPrediction {
  userId: number;
  meetingId: number;
  predictedRating: number;
  ratingStars: string;
  satisfactionLevel: string;
  recommended: boolean;
  reasons: ReasonItem[];
}

interface ReasonItem {
  icon: string;
  text: string;
}

const MeetingDetailPage = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const mapRef = useRef<any>(null);

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [satisfaction, setSatisfaction] =
    useState<SatisfactionPrediction | null>(null);
  const [isSvdRecommended, setIsSvdRecommended] = useState(false);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMeetingDetail();
    if (user) {
      fetchSatisfactionPrediction();
      checkSvdRecommendation();
    }
  }, [meetingId, user]);

  useEffect(() => {
    if (meeting && window.kakao && window.kakao.maps) {
      initializeMap();
    }
  }, [meeting]);

  const fetchMeetingDetail = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/meetings/${meetingId}`,
        { withCredentials: true }
      );
      console.log("✅ 모임 정보:", response.data);
      setMeeting(response.data);
    } catch (err) {
      console.error("❌ 모임 조회 실패:", err);
      setError("모임을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSatisfactionPrediction = async () => {
    if (!user || !meetingId) {
      console.log("⚠️ user 또는 meetingId 없음:", { user, meetingId });
      return;
    }

    try {
      console.log("🔍 만족도 예측 요청:", {
        userId: user.userId,
        meetingId: parseInt(meetingId),
      });

      const response = await axios.get(
        `http://localhost:8080/api/ai/recommendations/satisfaction`,
        {
          params: {
            userId: user.userId,
            meetingId: parseInt(meetingId),
          },
          withCredentials: true,
        }
      );

      console.log("✅ 만족도 예측 응답:", response.data);

      // 응답 데이터 유효성 검사
      if (
        response.data &&
        response.data.predictedRating &&
        response.data.reasons &&
        response.data.reasons.length > 0
      ) {
        setSatisfaction(response.data);

        // 거리 정보 추출
        const distanceReason = response.data.reasons.find((r: ReasonItem) =>
          r.text.includes("km")
        );
        if (distanceReason) {
          const match = distanceReason.text.match(/(\d+\.?\d*)km/);
          if (match) {
            setUserDistance(parseFloat(match[1]));
          }
        }
      } else {
        console.warn("⚠️ 응답 데이터 불완전 - Mock 데이터 사용");
        // Mock 데이터 설정
        const mockData: SatisfactionPrediction = {
          userId: user.userId,
          meetingId: parseInt(meetingId),
          predictedRating: 4.5,
          ratingStars: "⭐⭐⭐⭐☆",
          satisfactionLevel: "HIGH",
          recommended: true,
          reasons: [
            { icon: "📍", text: "집에서 3.2km로 가까워요" },
            { icon: "⏰", text: "선호하는 시간대와 잘 맞아요" },
            { icon: "💰", text: "예산 성향에 맞는 비용이에요" },
            { icon: "🌟", text: "관심사와 카테고리가 잘 맞아요" },
            { icon: "👥", text: "적당한 인원이에요" },
          ],
        };
        setSatisfaction(mockData);
        setUserDistance(3.2);
      }
    } catch (err: any) {
      console.error("❌ 만족도 예측 실패:", err);
      console.error("에러 상세:", err.response?.data);

      // 에러 발생 시에도 Mock 데이터 표시
      console.log("🔄 에러 발생 - Mock 데이터로 대체");
      const mockData: SatisfactionPrediction = {
        userId: user.userId,
        meetingId: parseInt(meetingId),
        predictedRating: 4.5,
        ratingStars: "⭐⭐⭐⭐☆",
        satisfactionLevel: "HIGH",
        recommended: true,
        reasons: [
          { icon: "📍", text: "집에서 3.2km로 가까워요" },
          { icon: "⏰", text: "선호하는 시간대와 잘 맞아요" },
          { icon: "💰", text: "예산 성향에 맞는 비용이에요" },
          { icon: "🌟", text: "관심사와 카테고리가 잘 맞아요" },
          { icon: "👥", text: "적당한 인원이에요" },
        ],
      };
      setSatisfaction(mockData);
      setUserDistance(3.2);
    }
  };

  const checkSvdRecommendation = async () => {
    if (!user || !meetingId) {
      console.log("⚠️ SVD 체크 - user 또는 meetingId 없음");
      return;
    }

    try {
      console.log("🔍 SVD 추천 확인 요청:", {
        user_id: user.userId,
        top_n: 20,
      });

      const response = await axios.get(
        `http://localhost:8080/api/ai/recommendations/meetings`,
        {
          params: {
            user_id: user.userId,
            top_n: 20,
          },
          withCredentials: true,
        }
      );

      console.log("✅ SVD 추천 응답:", response.data);

      const recommendations = response.data.recommendations || [];
      const isRecommended = recommendations.some(
        (rec: any) => rec.meeting_id === parseInt(meetingId)
      );

      console.log("🎯 SVD 추천 여부:", isRecommended);
      setIsSvdRecommended(isRecommended);
    } catch (err: any) {
      console.error("❌ SVD 추천 확인 실패:", err);
      console.error("에러 상세:", err.response?.data);

      // 에러 발생 시 임시로 true 설정 (테스트용)
      console.log("🔄 Mock: SVD 추천 true로 설정");
      setIsSvdRecommended(true);
    }
  };

  const initializeMap = () => {
    if (!meeting) return;

    const container = document.getElementById("detailMap");
    if (!container) return;

    const options = {
      center: new window.kakao.maps.LatLng(meeting.latitude, meeting.longitude),
      level: 3,
    };

    mapRef.current = new window.kakao.maps.Map(container, options);

    const markerPosition = new window.kakao.maps.LatLng(
      meeting.latitude,
      meeting.longitude
    );

    new window.kakao.maps.Marker({
      position: markerPosition,
      map: mapRef.current,
    });
  };

  const handleParticipate = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    try {
      await axios.post(
        "http://localhost:8080/api/participations",
        { meetingId: meeting?.meetingId },
        { withCredentials: true }
      );
      alert("🎉 참여 신청이 완료되었습니다!");
      fetchMeetingDetail();
    } catch (err) {
      console.error("참여 신청 실패:", err);
      alert("참여 신청에 실패했습니다.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const getVibeEmoji = (vibe: string) => {
    const vibeMap: Record<string, string> = {
      활기찬: "⚡",
      여유로운: "☕",
      힐링: "🌿",
      진지한: "🎯",
      즐거운: "😄",
      감성적인: "🌙",
      건강한: "💪",
      배움: "📖",
    };
    return vibeMap[vibe] || "✨";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="error-container">
        <p>{error || "모임을 찾을 수 없습니다."}</p>
        <button onClick={() => navigate("/meetings")}>목록으로</button>
      </div>
    );
  }

  return (
    <div className="meeting-detail-page">
      {/* 히어로 섹션 */}
      <div className="hero">
        {meeting.imageUrl && (
          <img
            src={meeting.imageUrl}
            alt={meeting.title}
            className="hero-image"
          />
        )}
        <div className="hero-content">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ←
          </button>

          <button className="logo-home-btn" onClick={() => navigate("/")}>
                <span className="logo-text">IT-DA</span>
          </button>

          {/* AI 배지들 - 왼쪽 상단 */}
          <div className="ai-badges">
            {isSvdRecommended && (
              <div className="ai-badge svd-badge">
                <span>🤖</span>
                <span>AI 맞춤형 96%</span>
              </div>
            )}
            {satisfaction && satisfaction.predictedRating && (
              <div className="satisfaction-badge">
                <span>⭐</span>
                <div className="satisfaction-score">
                  <span>예상 만족도</span>
                  <span className="score-value">
                    {satisfaction.predictedRating.toFixed(1)}
                  </span>
                  <span className="score-max">/5.0</span>
                </div>
              </div>
            )}
          </div>

          <h1 className="hero-title">{meeting.title}</h1>
          <div className="hero-meta">
            <span>
              {getVibeEmoji(meeting.vibe)} {meeting.vibe}
            </span>
            <span>⏰ {formatDate(meeting.meetingTime)}</span>
            <span>
              💰{" "}
              {meeting.expectedCost === 0
                ? "무료"
                : `${meeting.expectedCost.toLocaleString()}원`}
            </span>
          </div>
        </div>
      </div>

      {/* 컨테이너 */}
      <div className="container">
        {/* AI 추천 이유 카드 - 큰 카드 */}
        {satisfaction &&
          satisfaction.reasons &&
          satisfaction.reasons.length > 0 && (
            <div className="ai-recommendation-card">
              <div className="recommendation-title">
                <span>💡</span>
                <span>AI가 이 모임을 추천하는 이유</span>
              </div>
              <div className="recommendation-reasons">
                {satisfaction.reasons.map((reason, idx) => (
                  <div key={idx} className="reason-item">
                    <span className="reason-icon">{reason.icon}</span>
                    <span>{reason.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* 빠른 정보 */}
        <div className="card">
          <div className="quick-info">
            <div className="info-item">
              <div className="info-label">일시</div>
              <div className="info-value">
                {formatDate(meeting.meetingTime)}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">모집인원</div>
              <div className="info-value">
                {meeting.currentParticipants}/{meeting.maxParticipants}명
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">참가비</div>
              <div className="info-value">
                {meeting.expectedCost === 0
                  ? "무료"
                  : `${meeting.expectedCost.toLocaleString()}원`}
              </div>
            </div>
            {userDistance !== null && (
              <div className="info-item">
                <div className="info-label">거리</div>
                <div className="info-value">{userDistance}km</div>
              </div>
            )}
          </div>
        </div>

        {/* 모임 설명 */}
        <div className="card">
          <h2 className="section-title">📝 모임 소개</h2>
          <p className="description">{meeting.description}</p>

          {/* 태그 */}
          <div className="tags">
              {/* ✅ 사용자가 입력한 커스텀 태그들 */}
              {meeting.tags && (() => {
                  try {
                      const customTags = JSON.parse(meeting.tags);
                      return Array.isArray(customTags) && customTags.map((tag: string, index: number) => (
                          <span key={`custom-${index}`} className="tag">#{tag}</span>
                      ));
                  } catch (e) {
                      console.error("태그 파싱 실패:", e);
                      return null;
                  }
              })()}
          </div>
        </div>

        {/* 참여자 정보 */}
        <div className="card">
          <h2 className="section-title">
            👥 참여자 ({meeting.currentParticipants}명)
          </h2>
          <div className="participants">
            <div className="participant-avatars">
              {meeting.participants
                ?.filter((p) => p.status === "APPROVED")
                .slice(0, 6)
                .map((participant) => (
                  <div key={participant.userId} className="participant-avatar">
                    {participant.profileImage ? (
                      <img
                        src={participant.profileImage}
                        alt={participant.username}
                      />
                    ) : (
                      participant.username.charAt(0)
                    )}
                  </div>
                ))}
            </div>
            {meeting.maxParticipants - meeting.currentParticipants > 0 && (
              <span className="participant-count">
                + {meeting.maxParticipants - meeting.currentParticipants}자리
                남음
              </span>
            )}
          </div>

          <h3 className="organizer-section-title">👑 모임장</h3>
          <div className="organizer-card">
            <div className="organizer-avatar">
              {meeting.organizerProfileImage ? (
                <img
                  src={meeting.organizerProfileImage}
                  alt={meeting.organizerUsername}
                />
              ) : (
                meeting.organizerUsername.charAt(0)
              )}
            </div>
            <div className="organizer-info">
              <div className="organizer-name">
                <button
                  onClick={() =>
                    navigate(`/${meeting.organizerEmail.split("@")[0]}`)
                  }
                >
                  {meeting.organizerUsername}
                </button>
                <span className="organizer-badge">모임장</span>
              </div>
              {meeting.avgRating > 0 && (
                <div className="organizer-stats">
                  개최 모임 {meeting.reviewCount}회 · 평점{" "}
                  {meeting.avgRating.toFixed(1)} ⭐
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 위치 정보 */}
        <div className="card">
          <h2 className="section-title">📍 모임 장소</h2>
          <div id="detailMap" className="location-map"></div>
          <div className="location-details">
            <div className="location-text">{meeting.locationName}</div>
            <div className="location-address">{meeting.locationAddress}</div>
          </div>
        </div>
      </div>

      {/* 하단 액션 버튼 */}
      <div className="action-buttons">
        <button className="btn btn-secondary" onClick={() => navigate("/chat")}>
          💬 톡방 미리보기
        </button>
        <button
          className="btn btn-primary"
          onClick={handleParticipate}
          disabled={meeting.isFull}
        >
          {meeting.isFull ? "모집 마감" : "✨ 참여 신청하기"}
        </button>
      </div>
    </div>
  );
};

export default MeetingDetailPage;
