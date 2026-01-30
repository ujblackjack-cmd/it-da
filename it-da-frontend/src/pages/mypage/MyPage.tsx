import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./MyPage.css";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useNavigate } from "react-router-dom";
import mypageApi, {
  MyMeeting,
  MyReview,
  PendingReview,
  OrganizedMeeting,
} from "../../api/mypage.api";
import followApi from "../../api/follow.api";
import userSettingApi from "../../api/userSetting.api";
import activityApi, { Activity } from "../../api/activity.api"; // ⭐ 추가!
import type { FollowUser } from "../../types/follow.types";
import ProfileSection from "./components/ProfileSection";
import PendingReviews from "./components/PendingReviews";
import MyReviews from "./components/MyReviews";
import MyMeetingsPage from "./components/MyMeetingsPage";
import ReviewModal from "./components/ReviewModal";
import NotificationDropdown from "./components/NotificationDropdown";
import FollowModal from "./components/FollowModal";
import StatsTab from "./components/StatsTab";
import SettingsTab from "./components/SettingsTab";
import ProfileEditModal from "./components/ProfileEditModal";
import MeetingReviewsModal from "./components/MeetingReviewsModal";
import MyReviewsModal from "./components/MyReviewsModal";
import PreferenceEditModal from "./components/PreferenceEditModal";
// ✅ 배지 관련 import
import BadgeCatalogModal from "@/components/badge/BadgeCatalogModal";
import BadgeToast from "@/components/badge/BadgeToast";
import { useBadges } from "@/hooks/badge/useBadges";
import { useBadgeWebSocket } from "@/hooks/badge/UseBadgeWebSocket";
import {
  useProfileWebSocket,
  ProfileUpdate,
} from "../../hooks/auth/useProfileWebSocket";
import apiClient from "../../api/client";

type TabKey = "meetings" | "archive" | "stats" | "settings";

const MyPage: React.FC = () => {
  const { user } = useAuthStore();
  const currentUserId = user?.userId;
  const isMyPage = true;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("meetings");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [isPreferenceModalOpen, setIsPreferenceModalOpen] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [ongoingMeetings, setOngoingMeetings] = useState<MyMeeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MyMeeting[]>([]);
  const [completedMeetings, setCompletedMeetings] = useState<MyMeeting[]>([]);
  const [organizedMeetings, setOrganizedMeetings] = useState<
    OrganizedMeeting[]
  >([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMeetingId, setModalMeetingId] = useState<number | null>(null);
  const [modalMeetingTitle, setModalMeetingTitle] = useState("");
  const [modalMeetingDateText, setModalMeetingDateText] = useState("");

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { unreadCount } = useNotificationStore();

  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState("");
  const [followUsers, setFollowUsers] = useState<FollowUser[]>([]);
  const [isFollowing] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  const [participationCount, setParticipationCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  const [notifyFollowMeeting, setNotifyFollowMeeting] = useState(true);
  const [notifyFollowReview, setNotifyFollowReview] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  const [isMeetingReviewsOpen, setIsMeetingReviewsOpen] = useState(false);
  const [reviewMeetingId, setReviewMeetingId] = useState<number | null>(null);
  const [reviewMeetingTitle, setReviewMeetingTitle] = useState("");

  const [isMyReviewsModalOpen, setIsMyReviewsModalOpen] = useState(false);

  // ✅ 배지 도감 모달 state
  const [badgeCatalogOpen, setBadgeCatalogOpen] = useState(false);

  // ✅ 실제 배지 데이터 조회
  const { data: badgesData, isLoading: badgesLoading } = useBadges();

  // ✅ 배지 WebSocket (실시간 알림)
  const { toast: badgeToast, hideToast: hideBadgeToast } = useBadgeWebSocket({
    userId: currentUserId,
    enabled: !!currentUserId,
  });

  // ✅ 획득한 배지만 필터링
  const unlockedBadges = useMemo(() => {
    if (!badgesData) return [];
    return badgesData.filter((b) => b.unlocked);
  }, [badgesData]);

  // ✅ 배지 카운트
  const badgeCount = unlockedBadges.length;

  // ⭐ 활동 기록 실데이터
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // ⭐ 활동 기록 조회
  const fetchActivities = useCallback(async () => {
    if (!currentUserId) return;
    setActivitiesLoading(true);
    try {
      const data = await activityApi.getActivities(currentUserId, 20);
      setActivities(data);
    } catch (err) {
      console.error("활동 기록 조회 실패:", err);
    } finally {
      setActivitiesLoading(false);
    }
  }, [currentUserId]);

  const stats = useMemo(() => {
    const totalMeetings =
      participationCount > 0
        ? participationCount
        : completedMeetings.length +
          upcomingMeetings.length +
          ongoingMeetings.length;

    const avgRating =
      averageRating > 0
        ? averageRating.toFixed(1)
        : myReviews.length > 0
          ? (
              myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
              myReviews.length
            ).toFixed(1)
          : "0.0";

    return [
      { icon: "📅", value: totalMeetings, label: "총 참여 모임" },
      { icon: "⭐", value: avgRating, label: "평균 평점" },
    ];
  }, [
    completedMeetings.length,
    upcomingMeetings.length,
    ongoingMeetings.length,
    myReviews,
    participationCount,
    averageRating,
  ]);

  const fetchAll = useCallback(async () => {
    if (!currentUserId) return;

    setLoading(true);
    setError(null);
    try {
      const [pending, reviews, ongoing, upcoming, completed, organized] =
        await Promise.all([
          mypageApi.getPendingReviews(currentUserId, currentUserId),
          mypageApi.getMyReviews(currentUserId, currentUserId),
          mypageApi.getOngoingMeetings(currentUserId, currentUserId),
          mypageApi.getUpcomingMeetings(currentUserId, currentUserId),
          mypageApi.getCompletedMeetings(currentUserId, currentUserId),
          mypageApi.getOrganizedMeetings(currentUserId),
        ]);
      setPendingReviews(pending);
      setMyReviews(reviews);
      setOngoingMeetings(ongoing);
      setUpcomingMeetings(upcoming);
      setCompletedMeetings(completed);
      setOrganizedMeetings(organized);

      setParticipationCount(
        ongoing.length + upcoming.length + completed.length,
      );

      if (reviews.length > 0) {
        const avg =
          reviews.reduce(
            (sum: number, r: MyReview) => sum + (r.rating || 0),
            0,
          ) / reviews.length;
        setAverageRating(avg);
      }
    } catch (err) {
      console.error("마이페이지 정보 로드 실패:", err);
      setError("마이페이지 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const handleProfileUpdate = useCallback(
    (update: ProfileUpdate) => {
      console.log("📊 마이페이지 프로필 업데이트 수신:", update);

      if (update.type === "PROFILE_UPDATE") {
        if (update.newFollowerCount !== undefined) {
          setFollowerCount(update.newFollowerCount);
        }
        if (
          update.field === "participationCount" &&
          update.value !== undefined
        ) {
          setParticipationCount(update.value as number);
        }
        if (update.field === "averageRating" && update.value !== undefined) {
          setAverageRating(update.value as number);
        }
      }

      if (update.type === "PROFILE_FOLLOWING_UPDATE") {
        setFollowingCount(update.newFollowerCount);
      }

      if (update.type === "PARTICIPATION_APPROVED") {
        console.log("🎉 참여 승인됨! 모임 리스트 새로고침:", update);
        if (update.participationCount !== undefined) {
          setParticipationCount(update.participationCount as number);
        }
        void fetchAll();
        void fetchActivities(); // ⭐ 활동 기록도 새로고침
      }

      if (update.type === "MEETING_COMPLETED") {
        console.log("🏁 모임 완료됨! 모임 리스트 새로고침:", update);
        void fetchAll();
        void fetchActivities(); // ⭐ 활동 기록도 새로고침
      }

      if (update.type === "MEETING_UPDATED") {
        console.log("🖼️ 모임 정보 변경됨! 모임 리스트 새로고침:", update);
        void fetchAll();
      }

      if (update.type === "REVIEW_CREATED") {
        void fetchAll();
        void fetchActivities(); // ⭐ 활동 기록도 새로고침
      }

      if (
        update.type === "PROFILE_INFO_UPDATE" &&
        update.userId === currentUserId
      ) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setUser({
            ...currentUser,
            username: update.username ?? currentUser.username,
            profileImageUrl:
              update.profileImageUrl ?? currentUser.profileImageUrl,
            bio: update.bio ?? currentUser.bio,
            mbti: update.mbti ?? currentUser.mbti,
            address: update.address ?? currentUser.address,
          });
        }
        if (update.isPublic !== undefined) {
          setIsPublic(update.isPublic);
        }
      }
    },
    [currentUserId, fetchAll, fetchActivities],
  );

  useProfileWebSocket({
    profileUserId: currentUserId,
    onProfileUpdate: handleProfileUpdate,
  });

  const fetchFollowCounts = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [following, followers] = await Promise.all([
        followApi
          .getFollowing(currentUserId, currentUserId)
          .then((list) => list.length),
        followApi
          .getFollowers(currentUserId, currentUserId)
          .then((list) => list.length),
      ]);
      setFollowingCount(following);
      setFollowerCount(followers);
    } catch (err) {
      console.error("팔로우 수 조회 실패:", err);
    }
  }, [currentUserId]);

  const fetchSettings = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const settings = await userSettingApi.getSetting(currentUserId);
      setNotifyFollowMeeting(settings.followMeetingNotification ?? true);
      setNotifyFollowReview(settings.followReviewNotification ?? true);
    } catch (err) {
      console.error("설정 조회 실패:", err);
    }
  }, [currentUserId]);

  const fetchUserProfile = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const response = await apiClient.get(`/api/users/${currentUserId}`);
      setIsPublic(response.data.isPublic ?? true);
    } catch (err) {
      console.error("유저 프로필 조회 실패:", err);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      void fetchAll();
      void fetchFollowCounts();
      void fetchSettings();
      void fetchUserProfile();
      void fetchActivities(); // ⭐ 활동 기록 조회
    }
  }, [
    currentUserId,
    fetchAll,
    fetchFollowCounts,
    fetchSettings,
    fetchUserProfile,
    fetchActivities,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUserId) {
        console.log("🔄 마이페이지 자동 새로고침");
        fetchAll();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUserId, fetchAll]);

  const handleToggleFollow = async () => {};

  const handleShowFollowList = async (type: "following" | "follower") => {
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }
    setFollowLoading(true);
    setFollowModalTitle(type === "following" ? "팔로잉" : "팔로워");
    setIsFollowModalOpen(true);
    try {
      const users =
        type === "following"
          ? await followApi.getFollowing(currentUserId, currentUserId)
          : await followApi.getFollowers(currentUserId, currentUserId);
      setFollowUsers(users);
    } catch (err) {
      console.error("목록 조회 에러:", err);
      setFollowUsers([]);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleFollowUser = async (targetUserId: number) => {
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }
    const targetUser = followUsers.find((u) => u.userId === targetUserId);
    if (!targetUser) return;
    try {
      if (targetUser.isFollowing) {
        await followApi.unfollow(currentUserId, targetUserId);
      } else {
        await followApi.follow(currentUserId, targetUserId);
      }
      setFollowUsers((prev) =>
        prev.map((u) =>
          u.userId === targetUserId ? { ...u, isFollowing: !u.isFollowing } : u,
        ),
      );
    } catch (err: unknown) {
      console.error("팔로우 처리 에러:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("이미 팔로우")) {
        setFollowUsers((prev) =>
          prev.map((u) =>
            u.userId === targetUserId ? { ...u, isFollowing: true } : u,
          ),
        );
      } else {
        alert(errorMessage || "팔로우 처리에 실패했습니다.");
      }
    }
  };

  const handleUserClick = (userId: number) => {
    setIsFollowModalOpen(false);
    if (userId === currentUserId) return;
    navigate(
      `/${followUsers.find((u) => u.userId === userId)?.email.split("@")[0]}`,
    );
  };

  const handleToggleFollowMeeting = async () => {
    if (!currentUserId) return;
    try {
      await userSettingApi.updateSetting(currentUserId, {
        followMeetingNotification: !notifyFollowMeeting,
      });
      setNotifyFollowMeeting(!notifyFollowMeeting);
    } catch {
      alert("설정 저장에 실패했습니다.");
    }
  };

  const handleToggleFollowReview = async () => {
    if (!currentUserId) return;
    try {
      await userSettingApi.updateSetting(currentUserId, {
        followReviewNotification: !notifyFollowReview,
      });
      setNotifyFollowReview(!notifyFollowReview);
    } catch {
      alert("설정 저장에 실패했습니다.");
    }
  };

  const handleTogglePublic = async () => {
    if (!currentUserId) return;
    try {
      await apiClient.put(`/api/users/${currentUserId}`, {
        isPublic: !isPublic,
      });
      setIsPublic(!isPublic);
    } catch {
      alert("설정 변경 실패");
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUserId) return;
    if (
      confirm("정말 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")
    ) {
      if (
        confirm("삭제된 데이터는 복구할 수 없습니다. 정말 삭제하시겠습니까?")
      ) {
        try {
          await apiClient.delete(`/api/users/${currentUserId}`);
          localStorage.clear();
          alert("계정이 삭제되었습니다.");
          window.location.href = "/";
        } catch {
          alert("계정 삭제 실패");
        }
      }
    }
  };

  const handleLogout = () => {
    if (confirm("정말 로그아웃 하시겠습니까?")) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  const handleProfileSave = async (newUsername: string) => {
    if (!currentUserId) return;
    await apiClient.put(`/api/users/${currentUserId}`, {
      username: newUsername,
    });
    window.location.reload();
  };

  const handleOpenMeetingReviews = (
    meetingId: number,
    meetingTitle: string,
  ) => {
    setReviewMeetingId(meetingId);
    setReviewMeetingTitle(meetingTitle);
    setIsMeetingReviewsOpen(true);
  };

  const handleOpenMyReviews = () => {
    setIsMyReviewsModalOpen(true);
  };

  const handleManageMeeting = (meetingId: number) => {
    navigate(`/meetings/${meetingId}`);
  };

  const profile = useMemo(() => {
    const average =
      averageRating > 0
        ? averageRating
        : myReviews.length > 0
          ? myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
            myReviews.length
          : 0;

    const meetingCount =
      participationCount > 0
        ? participationCount
        : upcomingMeetings.length +
          completedMeetings.length +
          ongoingMeetings.length;

    return {
      username: user?.username || "사용자",
      email: user?.email || "",
      avatarEmoji: "👨‍💻",
      profileImageUrl: user?.profileImageUrl || "",
      bio: user?.bio || "",
      mbti: user?.mbti || "",
      address: user?.address || "",
      interests: user?.interests || "",
      stats: {
        followingCount,
        followerCount,
        meetingCount,
        badgeCount,
        averageRating: average || 0,
      },
    };
  }, [
    user,
    myReviews,
    upcomingMeetings.length,
    completedMeetings.length,
    ongoingMeetings.length,
    followingCount,
    followerCount,
    participationCount,
    averageRating,
    badgeCount,
  ]);

  if (!currentUserId) {
    return (
      <div className="mypage-root">
        <div className="mypage-state">
          <p>로그인이 필요합니다.</p>
          <button onClick={() => navigate("/login")}>로그인하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mypage-root">
      <header className="mypage-header">
        <div className="mypage-header-wrapper">
          <div className="mypage-header-content">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                className="mypage-back-btn"
                type="button"
                onClick={() => navigate("/")}
              >
                ←
              </button>
              <h1 className="mypage-header-title">마이페이지</h1>
            </div>
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <h1
                onClick={() => navigate("/meetings")}
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "800",
                  margin: 0,
                  cursor: "pointer",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "1px",
                }}
              >
                IT-DA
              </h1>
            </div>
            <div className="mypage-header-actions">
              <button
                className="mypage-icon-btn"
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="mypage-badge">{unreadCount}</span>
                )}
              </button>
              <button
                className="mypage-icon-btn"
                type="button"
                onClick={() => setActiveTab("settings")}
              >
                ⚙️
              </button>
                <NotificationDropdown
                    isOpen={isNotificationOpen}
                    onClose={() => setIsNotificationOpen(false)}
                />
            </div>
          </div>
        </div>
      </header>

      <ProfileSection
        username={profile.username}
        email={profile.email}
        avatarEmoji={profile.avatarEmoji}
        profileImageUrl={profile.profileImageUrl}
        bio={profile.bio}
        mbti={profile.mbti}
        address={profile.address}
        interests={profile.interests}
        stats={profile.stats}
        isMyPage={isMyPage}
        isFollowing={isFollowing}
        onToggleFollow={handleToggleFollow}
        onClickFollowing={() => handleShowFollowList("following")}
        onClickFollower={() => handleShowFollowList("follower")}
      />

      <main className="mypage-container">
        <div className="mypage-tabs">
          <button
            className={`mypage-tab ${activeTab === "meetings" ? "active" : ""}`}
            onClick={() => setActiveTab("meetings")}
          >
            📅 참여 모임
          </button>
          <button
            className={`mypage-tab ${activeTab === "archive" ? "active" : ""}`}
            onClick={() => setActiveTab("archive")}
          >
            🏆 취미 아카이브
          </button>
          <button
            className={`mypage-tab ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            📊 활동 통계
          </button>
          <button
            className={`mypage-tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            ⚙️ 설정
          </button>
        </div>

        {loading && <div className="mypage-state">불러오는 중...</div>}
        {error && <div className="mypage-state error">{error}</div>}

        {!loading && !error && (
          <>
            {activeTab === "meetings" && (
              <>
                <PendingReviews
                  data={pendingReviews}
                  onWriteReview={(id: number, title: string, date: string) => {
                    setModalMeetingId(id);
                    setModalMeetingTitle(title);
                    setModalMeetingDateText(`${date} 참여`);
                    setIsModalOpen(true);
                  }}
                />
                <MyReviews data={myReviews} onOpenModal={handleOpenMyReviews} />
                <MyMeetingsPage
                  ongoing={ongoingMeetings}
                  upcoming={upcomingMeetings}
                  completed={completedMeetings}
                  organized={organizedMeetings}
                  onOpenChat={(chatRoomId) => navigate(`/chat/${chatRoomId}`)}
                  onOpenReview={handleOpenMeetingReviews}
                  onManageMeeting={handleManageMeeting}
                />
              </>
            )}

            {/* ✅ 취미 아카이브 탭 - 배지 섹션 */}
            {activeTab === "archive" && (
              <div className="archive-content">
                {/* 🏆 획득한 배지 섹션 */}
                <section className="archive-section">
                  <div className="archive-section-header">
                    <h3 className="archive-section-title">🏆 획득한 배지</h3>
                    <button
                      type="button"
                      className="badge-catalog-btn"
                      onClick={() => setBadgeCatalogOpen(true)}
                    >
                      📖 배지 도감 보기
                    </button>
                  </div>

                  <div className="badge-preview-grid">
                    {badgesLoading ? (
                      <div className="badge-preview-empty">
                        <span>배지 불러오는 중...</span>
                      </div>
                    ) : unlockedBadges.length === 0 ? (
                      <div className="badge-preview-empty">
                        <span>아직 획득한 배지가 없어요</span>
                      </div>
                    ) : (
                      <>
                        {unlockedBadges.slice(0, 6).map((badge) => (
                          <div
                            key={badge.badgeId}
                            className="badge-preview-item"
                            onClick={() => setBadgeCatalogOpen(true)}
                          >
                            <div className="badge-preview-icon">
                              {badge.icon || "🏅"}
                            </div>
                            <div className="badge-preview-name">
                              {badge.badgeName}
                            </div>
                          </div>
                        ))}
                        {unlockedBadges.length > 6 && (
                          <button
                            type="button"
                            className="badge-preview-more"
                            onClick={() => setBadgeCatalogOpen(true)}
                          >
                            +{unlockedBadges.length - 6}개 더보기
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </section>

                {/* 📝 활동 기록 섹션 - ⭐ 실데이터 연동 */}
                <section className="archive-section">
                  <h3 className="archive-section-title">📝 활동 기록</h3>
                  <div className="activity-list">
                    {activitiesLoading ? (
                      <div className="activity-empty">
                        <span>활동 기록 불러오는 중...</span>
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="activity-empty">
                        <span>아직 활동 내역이 없어요</span>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div
                          key={`${activity.type}-${activity.id}`}
                          className="activity-item"
                        >
                          <div className="activity-icon">{activity.icon}</div>
                          <div className="activity-content">
                            <div className="activity-title">
                              {activity.title}
                            </div>
                            <div className="activity-desc">
                              {activity.description}
                            </div>
                            <div className="activity-date">{activity.date}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "stats" && <StatsTab stats={stats} />}
            {activeTab === "settings" && (
              <SettingsTab
                onProfileEdit={() => navigate("/profile/edit")}
                onLogout={handleLogout}
                notifyFollowMeeting={notifyFollowMeeting}
                notifyFollowReview={notifyFollowReview}
                onToggleFollowMeeting={handleToggleFollowMeeting}
                onToggleFollowReview={handleToggleFollowReview}
                isPublic={isPublic}
                onTogglePublic={handleTogglePublic}
                onDeleteAccount={handleDeleteAccount}
                onPreferenceEdit={() => setIsPreferenceModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={currentUserId}
        currentUserId={currentUserId}
        meetingId={modalMeetingId}
        meetingTitle={modalMeetingTitle}
        meetingDateText={modalMeetingDateText}
        onSubmitted={() => {
          void fetchAll();
          void fetchFollowCounts();
          void fetchActivities(); // ⭐ 리뷰 작성 후 활동 기록 새로고침
        }}
      />
      <PreferenceEditModal
        isOpen={isPreferenceModalOpen}
        onClose={() => setIsPreferenceModalOpen(false)}
        userId={currentUserId}
      />
      <MeetingReviewsModal
        isOpen={isMeetingReviewsOpen}
        onClose={() => setIsMeetingReviewsOpen(false)}
        meetingId={reviewMeetingId}
        meetingTitle={reviewMeetingTitle}
      />

      <MyReviewsModal
        isOpen={isMyReviewsModalOpen}
        onClose={() => setIsMyReviewsModalOpen(false)}
        reviews={myReviews}
      />


      <ProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
        currentUsername={profile.username}
        onSave={handleProfileSave}
      />

      <FollowModal
        isOpen={isFollowModalOpen}
        title={followModalTitle}
        users={followUsers}
        loading={followLoading}
        currentUserId={currentUserId}
        onClose={() => setIsFollowModalOpen(false)}
        onToggleFollow={handleToggleFollowUser}
        onUserClick={handleUserClick}
      />

      {/* ✅ 배지 도감 모달 */}
      <BadgeCatalogModal
        open={badgeCatalogOpen}
        onClose={() => setBadgeCatalogOpen(false)}
      />

      {/* ✅ 배지 획득 토스트 알림 */}
      {badgeToast.visible && badgeToast.badge && (
        <BadgeToast
          visible={badgeToast.visible}
          badgeName={badgeToast.badge.badgeName}
          badgeIcon={badgeToast.badge.badgeIcon}
          badgeGrade={badgeToast.badge.badgeGrade}
          badgeDescription={badgeToast.badge.badgeDescription}
          onClose={hideBadgeToast}
        />
      )}
    </div>
  );
};

export default MyPage;
