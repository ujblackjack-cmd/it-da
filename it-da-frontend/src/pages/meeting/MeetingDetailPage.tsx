import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import MeetingManageModal from "@/pages/meeting/MeetingManageModal";
import axios from "axios";
import "./MeetingDetailPage.css";
import ChatPreviewModal from "./ChatPreviewModal";
import api from "@/api/axios.config";
import { toast } from "react-hot-toast";

interface MeetingDetail {
  meetingId: number;
  chatRoomId?: number;
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
  const [isParticipating, setIsParticipating] = useState(false);
  const [participationStatus, setParticipationStatus] = useState<string | null>(
    null,
  );
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const API_ORIGIN = "http://localhost:8080";

  useEffect(() => {
      if (!meetingId || meetingId === "undefined") {
          console.warn("유효하지 않은 meetingId입니다.");
          setLoading(false);
          return;
      }

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
      const response = await api.get(`/meetings/${meetingId}`,
        { withCredentials: true },
      );
      console.log("✅ 모임 정보:", response.data);

        const meetingData = response.data;

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
        `http://localhost:8080/api/participations/my`,
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
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:8080/api/ai/recommendations/meetings`,
        {
          params: {
            user_id: user.userId,
            top_n: 20,
          },
          withCredentials: true,
        },
      );

      const recommendations = response.data.recommendations || [];
      const isRecommended = recommendations.some(
        (rec: any) => rec.meeting_id === parseInt(meetingId),
      );

      setIsSvdRecommended(isRecommended);
    } catch (err: any) {
      console.error("❌ SVD 추천 확인 실패:", err);
      setIsSvdRecommended(true);
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
          // 💡 1. axios.config.ts의 'api' 인스턴스를 사용하세요.
          await api.post("/participations", {
              meetingId: meeting?.meetingId,
              userId: user.userId,
          });

          // 💡 2. 로컬 상태 업데이트
          setIsParticipating(true);
          setParticipationStatus("PENDING");

          // 💡 3. 서버 데이터 다시 불러오기
          await fetchMeetingDetail();

          // 💡 4. 승인 대기 안내를 위한 미리보기 모달 오픈
          // 이 모달은 'participationStatus'가 "PENDING"일 때 승인 대기 메시지를 보여줍니다.
          setIsPreviewModalOpen(true);

          toast.success("참여 신청이 완료되었습니다! 🎉");
      } catch (err: any) {
          console.error("참여 신청 실패:", err);

          // 💡 5. 로그의 500 에러 원인별 상세 대응
          const errorMessage = err.response?.data?.message || err.response?.data || "";

          if (err.response?.status === 409 || errorMessage.includes("이미")) {
              alert("이미 참여 신청한 모임입니다.");
              checkParticipationStatus();
              return;
          }

          if (errorMessage.includes("주최자")) {
              alert("모임 주최자는 참여 신청을 할 수 없습니다.");
              return;
          }

          alert("참여 신청에 실패했습니다. 관리자에게 문의하세요.");
      }
  };

  const getParticipationButtonText = () => {
    if (meeting?.isFull) return "모집 마감";
    if (!isParticipating) return "✨ 참여 신청하기";

    switch (participationStatus) {
      case "PENDING":
        return "⏳ 승인 대기 중";
      case "APPROVED":
        return "✅ 참여 중";
      case "REJECTED":
        return "❌ 참여 거절됨";
      default:
        return "✨ 참여 신청하기";
    }
  };

  const isOrganizer = user?.userId === meeting?.organizerId;

  const isButtonDisabled = () => {
    return isOrganizer || meeting?.isFull || isParticipating;
  };

  const handleOrganizerAction = () => {
    setIsManageModalOpen(true);
  };

  const handleChatPreview = () => {
      const actualChatRoomId = meeting?.chatRoomId;
      if (isParticipating && participationStatus === "APPROVED") {
          if (actualChatRoomId) {
              navigate(`/chat/${actualChatRoomId}`);
          } else {
              toast.error("채팅방 정보를 찾을 수 없습니다.");
          }
      } else {
          setIsPreviewModalOpen(true);
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
            src={`${API_ORIGIN}${meeting.imageUrl}`}
            alt={meeting.title}
            className="hero-image"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              console.error("이미지 로드 실패:", meeting.imageUrl);
            }}
          />
        )}
        <div className="hero-content">
          <button className="back-btn" onClick={() => navigate("/")}>
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
                        onClick={() => {
                            // ✅ meetingId(101)가 아니라 meeting.chatRoomId(7)를 사용해야 합니다!
                            if (meeting?.chatRoomId) {
                                navigate(`/chat/${meeting.chatRoomId}`);
                            } else {
                                toast.error("채팅방 정보를 찾을 수 없습니다.");
                            }
                        }}
                    >
                        💬 톡방 입장
                    </button>
                    <button className="btn btn-primary" onClick={handleOrganizerAction}>
                        ⚙️ 모임 관리
                    </button>
                </>
            ) : (
                <>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            if (participationStatus === "APPROVED") {
                                // ✅ 여기도 마찬가지로 진짜 채팅방 ID(7)로 이동하게 수정
                                if (meeting?.chatRoomId) {
                                    navigate(`/chat/${meeting.chatRoomId}`);
                                } else {
                                    toast.error("채팅방 정보를 불러오는 중입니다.");
                                }
                            } else {
                                handleChatPreview();
                            }
                        }}
                    >
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
            if (meeting?.chatRoomId) {
                navigate(`/chat/${meeting.chatRoomId}`);
            } else {
                toast.error("채팅방 정보를 불러올 수 없습니다.");
            }
        }}
      />
    </div>
  );
};

export default MeetingDetailPage;
