import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import MeetingManageModal from "@/pages/meeting/MeetingManageModal";
import axios from "axios";
import "./MeetingDetailPage.css";
import ChatPreviewModal from "./ChatPreviewModal";

interface MeetingDetail {
  meetingId: number;
  chatRoomId: number;
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

  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [satisfaction, setSatisfaction] =
    useState<SatisfactionPrediction | null>(null);
  const [isSvdRecommended, setIsSvdRecommended] = useState(false);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isParticipating, setIsParticipating] = useState(false);
  const [participationStatus, setParticipationStatus] = useState<string | null>(
    null,
  );
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const API_ORIGIN = "http://localhost:8080";

  // ✅ 최근 조회 모임 localStorage에 저장하는 함수
  const saveToRecentViewed = (meetingData: MeetingDetail) => {
    try {
      const STORAGE_KEY = "recentViewedMeetings";
      const MAX_ITEMS = 10;

      // 기존 데이터 가져오기
      const existing = localStorage.getItem(STORAGE_KEY);
      let recentList: any[] = existing ? JSON.parse(existing) : [];

      // 새 아이템 생성
      const newItem = {
        id: meetingData.meetingId,
        meetingId: meetingData.meetingId,
        chatRoomId: meetingData.chatRoomId,
        title: meetingData.title,
        category: meetingData.category,
        imageUrl: meetingData.imageUrl,
        icon: getCategoryIcon(meetingData.category),
        time: new Date().toISOString(),
        type: "meeting" as const,
      };

      // 중복 제거 (같은 meetingId가 있으면 제거)
      recentList = recentList.filter(
        (item) => item.meetingId !== meetingData.meetingId,
      );

      // 맨 앞에 추가
      recentList.unshift(newItem);

      // 최대 개수 제한
      if (recentList.length > MAX_ITEMS) {
        recentList = recentList.slice(0, MAX_ITEMS);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentList));
      console.log("✅ 최근 조회 모임 저장:", newItem.title);
    } catch (error) {
      console.error("❌ 최근 조회 저장 실패:", error);
    }
  };

  // ✅ 카테고리별 아이콘
  const getCategoryIcon = (category: string): string => {
    const iconMap: Record<string, string> = {
      스포츠: "🏃",
      맛집: "🍽️",
      문화예술: "🎨",
      스터디: "📚",
      취미활동: "🎸",
      소셜: "🎉",
    };
    return iconMap[category] || "📅";
  };

  useEffect(() => {
    fetchMeetingDetail();
    if (user) {
      fetchSatisfactionPrediction();
      checkSvdRecommendation();
      checkParticipationStatus();
    }
  }, [meetingId, user]);

  useEffect(() => {
    if (meeting) {
      console.log("🖼️ 모임 이미지 URL:", meeting.imageUrl);
      console.log("🖼️ 전체 URL:", `http://localhost:8080${meeting.imageUrl}`);
    }
  }, [meeting]);

  useEffect(() => {
    if (meeting && window.kakao && window.kakao.maps) {
      initializeMap();
    }
  }, [meeting]);

    const fetchMeetingDetail = async () => {
        try {
            const response = await axios.get(
                `http://localhost:8080/api/meetings/${meetingId}`,
                { withCredentials: true },
            );
            console.log("✅ 모임 정보:", response.data);

            let meetingData = response.data;

            // [수정 1] 참여자 정보가 없으면 먼저 가져옵니다. (순서를 위로 올림)
            if (!meetingData.participants || meetingData.participants.length === 0) {
                try {
                    const participantsRes = await axios.get(
                        `http://localhost:8080/api/participations/meeting/${meetingId}`,
                        { withCredentials: true },
                    );

                    console.log("✅ 참여자 API 응답:", participantsRes.data);

                    let participantsList = [];
                    if (Array.isArray(participantsRes.data)) {
                        participantsList = participantsRes.data;
                    } else if (participantsRes.data.participants) {
                        participantsList = participantsRes.data.participants;
                    }

                    // 주의: 여기서 APPROVED만 필터링하면 PENDING 상태인 본인을 찾지 못할 수 있습니다.
                    // UI 표시용으로는 APPROVED만 필요할 수 있으나, 본인 확인용으로는 전체가 필요할 수 있습니다.
                    // 일단 기존 로직(APPROVED만 필터)을 유지합니다.
                    meetingData.participants = participantsList
                        .filter((p: any) => p.status === "APPROVED")
                        .map((p: any) => ({
                            userId: p.userId,
                            username: p.username,
                            profileImage: p.profileImage,
                            status: p.status,
                            joinedAt: p.createdAt || p.joinedAt,
                        }));

                    console.log("✅ 변환된 참여자:", meetingData.participants);
                } catch (participantsErr) {
                    console.error("❌ 참여자 조회 실패:", participantsErr);
                    meetingData.participants = [];
                }
            }

            // [수정 2] 데이터가 준비된 후 내 참여 상태를 확인합니다. (순서를 아래로 내림)
            if (meetingData.participants && user?.userId) {
                const myInfo = meetingData.participants.find((p: any) => p.userId === user.userId);

                if (myInfo) {
                    // 내 정보가 발견되면 상태 업데이트
                    if (myInfo.status === "APPROVED") {
                        setIsParticipating(true);
                        setParticipationStatus("APPROVED");
                        console.log("✅ 상세 정보 내에서 내 참여 확인됨 (APPROVED):", myInfo);
                    } else if (myInfo.status === "PENDING") {
                        setIsParticipating(true);
                        setParticipationStatus("PENDING");
                        console.log("✅ 상세 정보 내에서 내 참여 확인됨 (PENDING):", myInfo);
                    }
                } else {
                    // [수정 3] 참여자가 아니거나 목록에 없으면 상태 초기화 (중요)
                    setIsParticipating(false);
                    setParticipationStatus(null);
                }
            }

            // ✅ 최근 조회 모임 localStorage에 저장
            saveToRecentViewed(meetingData);

            setMeeting(meetingData);
        } catch (err) {
            console.error("❌ 모임 조회 실패:", err);
            setError("모임을 불러올 수 없습니다.");
        } finally {
            setLoading(false);
        }
    };

  const checkParticipationStatus = async () => {
    if (!user || !meetingId) return;

    try {
      const response = await axios.get(
          `/api/meetings/${meetingId}`,
        { withCredentials: true },
      );

      const participation = response.data.find(
        (p: any) => p.meetingId === parseInt(meetingId),
      );

      if (participation) {
        setIsParticipating(true);
        setParticipationStatus(participation.status);
        console.log("✅ 참여 상태:", participation.status);
      }
    } catch (err) {
      console.error("❌ 참여 상태 확인 실패:", err);
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
        },
      );

      console.log("✅ 만족도 예측 응답:", response.data);

      if (
        response.data &&
        response.data.predictedRating &&
        response.data.reasons &&
        response.data.reasons.length > 0
      ) {
        setSatisfaction(response.data);

        const distanceReason = response.data.reasons.find((r: ReasonItem) =>
          r.text.includes("km"),
        );
        if (distanceReason) {
          const match = distanceReason.text.match(/(\d+\.?\d*)km/);
          if (match) {
            setUserDistance(parseFloat(match[1]));
          }
        }
      } else {
        console.warn("⚠️ 응답 데이터 불완전 - Mock 데이터 사용");
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
      setIsSvdRecommended(false);
      setMatchPercent(null);
      return;
    }

    const targetId = Number(meetingId);
    if (Number.isNaN(targetId)) {
      console.log("⚠️ meetingId 파싱 실패:", meetingId);
      setIsSvdRecommended(false);
      setMatchPercent(null);
      return;
    }

    try {
      const response = await axios.get(
        "http://localhost:8080/api/ai/recommendations/meetings",
        {
          params: {
            user_id: user.userId, // 백엔드가 이걸로 받는다고 했으니 유지
            top_n: 20,
          },
          withCredentials: true,
        },
      );

      const recommendations = response.data?.recommendations ?? [];
      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        setIsSvdRecommended(false);
        setMatchPercent(null);
        return;
      }

      console.group("🧠 SVD Top20 디버깅");
      console.log(
        "📋 SVD 추천 meetingIds:",
        recommendations.map((r: any) => r.meetingId),
      );
      console.log("🎯 현재 상세 meetingId:", targetId);

      // ✅ meetingId 키 대응 (필요하면 meeting_id도 같이 대비)
      const rank = recommendations.findIndex((rec: any) => {
        const id = Number(rec?.meetingId ?? rec?.meeting_id ?? rec?.id);
        return id === targetId;
      });

      console.log("📊 SVD rank (없으면 -1):", rank);
      console.log("✅ Top20 포함 여부:", rank !== -1);
      console.groupEnd();

      const isRecommended = rank !== -1;
      setIsSvdRecommended(isRecommended);

      // ✅ 순위 기반 matchPercent (1등=100, 꼴찌=0)
      if (isRecommended) {
        const n = recommendations.length;
        const percent = n <= 1 ? 100 : Math.round(100 * (1 - rank / (n - 1)));
        setMatchPercent(percent);
      } else {
        setMatchPercent(null);
      }
    } catch (err: any) {
      console.error("❌ SVD 추천 확인 실패:", err);
      // ❌ 여기서 true로 하면 “항상 추천”처럼 보여서 위험
      setIsSvdRecommended(false);
      setMatchPercent(null);
    }
  };

  const initializeMap = () => {
    if (!meeting) return;

    const container = document.getElementById("detailMap");
    if (!container) return;

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        const options = {
          center: new window.kakao.maps.LatLng(
            meeting.latitude,
            meeting.longitude,
          ),
          level: 3,
        };

        mapRef.current = new window.kakao.maps.Map(container, options);

        const markerPosition = new window.kakao.maps.LatLng(
          meeting.latitude,
          meeting.longitude,
        );

        new window.kakao.maps.Marker({
          position: markerPosition,
          map: mapRef.current,
        });
      });
    }
  };

  // ✅ 수정된 handleParticipate 함수 - 에러 핸들링 개선
  const handleParticipate = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    // 주최자 체크
    if (user.userId === meeting?.organizerId) {
      alert("모임 주최자는 참여 신청을 할 수 없습니다.");
      return;
    }

    try {
      await axios.post(
        "http://localhost:8080/api/participations",
        {
          meetingId: meeting?.meetingId,
          userId: user.userId, // ✅ 여기 추가!
        },
        { withCredentials: true },
      );

      setIsParticipating(true);
      setParticipationStatus("PENDING");
      await fetchMeetingDetail();
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      console.error("참여 신청 실패:", err);

      // 에러 메시지 안전하게 추출
      const errorMessage =
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message || err.response?.data?.error || "";

      console.log("🔍 에러 메시지:", errorMessage);

      // 주최자 에러
      if (errorMessage.includes("주최자")) {
        alert("모임 주최자는 참여 신청을 할 수 없습니다.");
        return;
      }

      // ✅ 중복 신청 에러 - 다양한 키워드 체크
      if (
        errorMessage.includes("이미") ||
        errorMessage.includes("신청") ||
        errorMessage.includes("참여")
      ) {
        alert("이미 참여 신청한 모임입니다.");
        checkParticipationStatus();
        return;
      }

      // 409 Conflict
      if (err.response?.status === 409) {
        alert("이미 참여 신청한 모임입니다.");
        checkParticipationStatus();
        return;
      }

      // ✅ 500 에러인데 위에서 안 걸렸으면 중복 신청으로 간주
      if (err.response?.status === 500) {
        alert("이미 참여 신청한 모임입니다.");
        checkParticipationStatus();
        return;
      }

      alert("참여 신청에 실패했습니다.");
    }
  };

  const getParticipationButtonText = () => {
      if (meeting?.status === 'COMPLETED') return "🏁 완료된 모임";

      if (meeting?.isFull) return "모집 마감";
      if (!isParticipating) return "✨ 참여 신청하기";

      switch (participationStatus) {
          case "PENDING":
              return "⏳ 승인 대기 중";
          case "APPROVED":
              return "✅ 참여 중";
          case "REJECTED":
              return "❌ 참여 거절됨";
          case "COMPLETED":
              return "🏁 참여 완료";
          default:
              return "✨ 참여 신청하기";
      }
  };

  const isOrganizer = user?.userId === meeting?.organizerId;

  const isButtonDisabled = () => {
      return (
          isOrganizer ||
          meeting?.isFull ||
          isParticipating ||
          meeting?.status === 'COMPLETED'
      );
  };

  const handleOrganizerAction = () => {
    setIsManageModalOpen(true);
  };

  const handleChatPreview = () => {
    if (isParticipating && participationStatus === "APPROVED") {
      navigate(`/chat/${meeting?.chatRoomId}`);
    } else {
      alert("참여 승인 후 톡방에 입장할 수 있습니다.");
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

  // ✅ 뒤로가기 핸들러 - 이전 페이지로 돌아가기
  const handleGoBack = () => {
    navigate(-1); // 브라우저 히스토리 기반 뒤로가기
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
              src={
                  meeting.imageUrl.startsWith("http")
                      ? meeting.imageUrl // 절대 경로인 경우 그대로 사용
                      : `${API_ORIGIN}${meeting.imageUrl}` // 상대 경로인 경우에만 도메인 결합
              }
            alt={meeting.title}
            className="hero-image"
            onError={(e) => {
              e.currentTarget.src = "/icons/icon-192x192.png";
              e.currentTarget.style.display = "none";
              console.error("이미지 로드 실패:", meeting.imageUrl);
            }}
          />
        )}
        <div className="hero-content">
          {/* ✅ 수정: navigate("/") → navigate(-1) */}
          <button className="back-btn" onClick={handleGoBack}>
            ←
          </button>

          <button className="logo-home-btn" onClick={() => navigate("/")}>
            <span className="logo-text">IT-DA</span>
          </button>

          {/* AI 배지들 - 왼쪽 상단 */}
          <div className="ai-badges">
            <div className="ai-badge svd-badge">
              <span>🤖</span>
              <span>
                {isSvdRecommended && matchPercent !== null
                  ? `AI 추천 적합도 ${matchPercent}%`
                  : satisfaction?.predictedRating >= 4.2
                    ? "AI 분석 결과 높은 적합도"
                    : "AI 분석 완료"}
              </span>
            </div>
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
        {/* AI 추천 이유 카드 */}
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

          <div className="tags">
            {meeting.tags &&
              (() => {
                try {
                  const customTags = JSON.parse(meeting.tags);
                  return (
                    Array.isArray(customTags) &&
                    customTags.map((tag: string, index: number) => (
                      <span key={`custom-${index}`} className="tag">
                        #{tag}
                      </span>
                    ))
                  );
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
              {(() => {
                console.log("=== 참여자 렌더링 디버깅 ===");
                console.log("meeting.participants:", meeting.participants);

                if (!meeting.participants) {
                  console.log("participants가 undefined/null");
                  return (
                    <div style={{ padding: "1rem", color: "#999" }}>
                      참여자 정보 없음
                    </div>
                  );
                }

                if (!Array.isArray(meeting.participants)) {
                  console.log("participants가 배열이 아님");
                  return (
                    <div style={{ padding: "1rem", color: "#999" }}>
                      참여자 데이터 형식 오류
                    </div>
                  );
                }

                console.log(
                  "전체 participants 수:",
                  meeting.participants.length,
                );

                const approvedParticipants = meeting.participants.filter(
                  (p) => {
                    console.log("필터링 중:", p, "status:", p.status);
                    return p.status === "APPROVED";
                  },
                );

                console.log(
                  "APPROVED participants 수:",
                  approvedParticipants.length,
                );

                if (approvedParticipants.length === 0) {
                  return (
                    <div style={{ padding: "1rem", color: "#999" }}>
                      승인된 참여자가 없습니다.
                    </div>
                  );
                }

                return approvedParticipants.slice(0, 6).map((participant) => {
                  console.log("렌더링:", participant.username);
                  return (
                    <div
                      key={participant.userId}
                      className="participant-avatar"
                      style={{ marginRight: "0.5rem" }}
                    >
                      {participant.profileImage ? (
                        <img
                          src={participant.profileImage}
                          alt={participant.username}
                        />
                      ) : (
                        <span
                          style={{ fontSize: "1.2rem", fontWeight: "bold" }}
                        >
                          {participant.username.charAt(0)}
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
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
              <div className="organizer-name-row">
                <button
                  className="organizer-username"
                  onClick={() =>
                    navigate(`/${meeting.organizerEmail.split("@")[0]}`)
                  }
                >
                  {meeting.organizerUsername}
                </button>
                <span className="organizer-badge">모임장</span>
              </div>
              <div className="organizer-id">
                @{meeting.organizerEmail.split("@")[0]}
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
        {isOrganizer ? (
          <>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/chat/${meeting?.chatRoomId}`)}
            >
              💬 톡방 입장
            </button>
            <button className="btn btn-primary" onClick={handleOrganizerAction}>
              ⚙️ 모임 관리
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={handleChatPreview}>
              💬 톡방 {participationStatus === "APPROVED" ? "입장" : "미리보기"}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleParticipate}
              disabled={isButtonDisabled()}
            >
              {getParticipationButtonText()}
            </button>
          </>
        )}
      </div>

      {/* 모임 관리 모달 */}
      <MeetingManageModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        meetingId={meetingId!}
        meetingTitle={meeting?.title || ""}
        onUpdate={fetchMeetingDetail}
      />

      {/* ChatPreview 모달 */}
      <ChatPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        meetingId={meetingId!}
        participationStatus={participationStatus}
        onEnterChat={() => {
          setIsPreviewModalOpen(false);
          navigate(`/chat/${meeting?.chatRoomId}`);
        }}
      />
    </div>
  );
};

export default MeetingDetailPage;
