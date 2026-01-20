import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./MyPage.css";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useNavigate } from "react-router-dom";
import mypageApi, {
  MyMeeting,
  MyReview,
  PendingReview,
} from "../../api/mypage.api";
import followApi from "../../api/follow.api";
import userSettingApi from "../../api/userSetting.api";
import type { FollowUser } from "../../types/follow.types";
import ProfileSection from "./components/ProfileSection";
import PendingReviews from "./components/PendingReviews";
import MyReviews from "./components/MyReviews";
import MyMeetingsPage from "./components/MyMeetingsPage";
import ReviewModal from "./components/ReviewModal";
import NotificationDropdown from "./components/NotificationDropdown";
import FollowModal from "./components/FollowModal";
import ArchiveTab from "./components/ArchiveTab";
import StatsTab from "./components/StatsTab";
import SettingsTab from "./components/SettingsTab";
import ProfileEditModal from "./components/ProfileEditModal";
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

  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MyMeeting[]>([]);
  const [completedMeetings, setCompletedMeetings] = useState<MyMeeting[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMeetingId, setModalMeetingId] = useState<number | null>(null);
  const [modalMeetingTitle, setModalMeetingTitle] = useState("");
  const [modalMeetingDateText, setModalMeetingDateText] = useState("");

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { unreadCount } = useNotificationStore();

  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState("");
  const [followUsers, setFollowUsers] = useState<FollowUser[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  const [notifyFollowMeeting, setNotifyFollowMeeting] = useState(true);
  const [notifyFollowReview, setNotifyFollowReview] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  const badges = [
    {
      id: 1,
      icon: "🌟",
      name: "첫 모임",
      description: "첫 모임 참여 완료",
      isUnlocked: true,
    },
    {
      id: 2,
      icon: "🔥",
      name: "열정러",
      description: "10회 모임 참여",
      isUnlocked: true,
    },
    {
      id: 3,
      icon: "🏅",
      name: "마스터",
      description: "50회 모임 참여",
      isUnlocked: false,
    },
  ];

  const activities = [
    {
      id: 1,
      date: "2026.01.02",
      title: "새해 첫 모임 신청!",
      description: "한강 선셋 피크닉 모임에 참여했어요",
      icon: "🎉",
    },
  ];

  const stats = useMemo(() => {
    const totalMeetings = completedMeetings.length + upcomingMeetings.length;
    const avgRating =
      myReviews.length > 0
        ? (
            myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
            myReviews.length
          ).toFixed(1)
        : "0.0";
    return [
      { icon: "📅", value: totalMeetings, label: "총 참여 모임" },
      { icon: "⭐", value: avgRating, label: "평균 평점" },
    ];
  }, [completedMeetings.length, upcomingMeetings.length, myReviews]);



// ✅ 수정 (이 부분만 추가!)
    const handleProfileUpdate = useCallback(
        (update: ProfileUpdate) => {
            console.log("📊 마이페이지 프로필 업데이트 수신:", update);

            if (update.type === "PROFILE_UPDATE") {
                setFollowerCount(update.newFollowerCount);
            }

            if (update.type === "PROFILE_FOLLOWING_UPDATE") {
                setFollowingCount(update.newFollowerCount);
            }

            // ✅ 추가: 내 프로필 정보 업데이트
            if (update.type === "PROFILE_INFO_UPDATE" && update.userId === currentUserId) {
                const currentUser = useAuthStore.getState().user;
                if (currentUser) {
                    useAuthStore.getState().setUser({
                        ...currentUser,
                        username: update.username ?? currentUser.username,
                        profileImageUrl: update.profileImageUrl ?? currentUser.profileImageUrl,
                        bio: update.bio ?? currentUser.bio,
                        mbti: update.mbti ?? currentUser.mbti,
                        address: update.address ?? currentUser.address,
                    });
                }
                // isPublic 업데이트
                if (update.isPublic !== undefined) {
                    setIsPublic(update.isPublic);
                }
            }
        },
        [followerCount, followingCount, currentUserId]
    );

  // ✅ 프로필 웹소켓 연결 (내 프로필 구독)
  useProfileWebSocket({
    profileUserId: currentUserId,
    onProfileUpdate: handleProfileUpdate,
  });

  const fetchAll = useCallback(async () => {
    if (!currentUserId) return;

    setLoading(true);
    setError(null);
    try {
      const [pending, reviews, upcoming, completed] = await Promise.all([
        mypageApi.getPendingReviews(currentUserId, currentUserId),
        mypageApi.getMyReviews(currentUserId, currentUserId),
        mypageApi.getUpcomingMeetings(currentUserId, currentUserId),
        mypageApi.getCompletedMeetings(currentUserId, currentUserId),
      ]);
      setPendingReviews(pending);
      setMyReviews(reviews);
      setUpcomingMeetings(upcoming);
      setCompletedMeetings(completed);
    } catch (e) {
      console.error(e);
      setError("마이페이지 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

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
    } catch (e) {
      console.error("팔로우 수 조회 실패:", e);
    }
  }, [currentUserId]);

  const fetchSettings = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const settings = await userSettingApi.getSetting(currentUserId);
      setNotifyFollowMeeting(settings.followMeetingNotification);
      setNotifyFollowReview(settings.followReviewNotification);
    } catch (e) {
      console.error("설정 조회 실패:", e);
    }
  }, [currentUserId]);

  const fetchUserProfile = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const response = await apiClient.get(`/api/users/${currentUserId}`);
      setIsPublic(response.data.isPublic ?? true);
    } catch (e) {
      console.error(e);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      fetchAll();
      fetchFollowCounts();
      fetchSettings();
      fetchUserProfile();
    }
  }, [
    currentUserId,
    fetchAll,
    fetchFollowCounts,
    fetchSettings,
    fetchUserProfile,
  ]);

  const handleToggleFollow = async () => {
    // 마이페이지에서는 사용 안 함
  };

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
    } catch (e) {
      console.error("목록 조회 에러:", e);
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
          u.userId === targetUserId ? { ...u, isFollowing: !u.isFollowing } : u
        )
      );

      // 내 팔로잉 수 다시 가져오기 (직접 업데이트 하는게 더 빠름)
      // await fetchFollowCounts();
    } catch (e: any) {
      console.error("팔로우 처리 에러:", e);
      if (e.message?.includes("이미 팔로우")) {
        setFollowUsers((prev) =>
          prev.map((u) =>
            u.userId === targetUserId ? { ...u, isFollowing: true } : u
          )
        );
      } else {
        alert(e.message || "팔로우 처리에 실패했습니다.");
      }
    }
  };

  const handleUserClick = async (userId: number) => {
    setIsFollowModalOpen(false);

    if (userId === currentUserId) {
      return;
    }

    navigate(
      `/${
        followUsers
          .map((u) => u)
          .find((u) => u.userId === userId)
          ?.email.split("@")[0]
      }`
    );
  };

  const handleToggleFollowMeeting = async () => {
    if (!currentUserId) return;

    try {
      await userSettingApi.updateSetting(currentUserId, {
        followMeetingNotification: !notifyFollowMeeting,
      });
      setNotifyFollowMeeting(!notifyFollowMeeting);
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
        } catch (e) {
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

  const profile = useMemo(() => {
    const average =
      myReviews.length > 0
        ? myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          myReviews.length
        : 0;
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
        meetingCount: upcomingMeetings.length + completedMeetings.length,
        badgeCount: 8,
        averageRating: average || 0,
      },
    };
  }, [
    user,
    myReviews,
    upcomingMeetings.length,
    completedMeetings.length,
    followingCount,
    followerCount,
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
                      {/* ✅ 왼쪽: 뒤로가기 + 마이페이지 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <button
                              className="mypage-back-btn"
                              type="button"
                              onClick={() => navigate('/')}  // ✅ 메인페이지로!
                          >
                              ←
                          </button>
                          <h1 className="mypage-header-title">마이페이지</h1>
                      </div>

                      {/* ✅ 중앙: IT-DA 로고 */}
                      <div style={{
                          position: 'absolute',
                          left: '50%',
                          transform: 'translateX(-50%)'
                      }}>
                          <h1
                              onClick={() => navigate("/meetings")}
                              style={{
                                  fontSize: '1.3rem',
                                  fontWeight: '800',
                                  margin: 0,
                                  cursor: 'pointer',
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text',
                                  letterSpacing: '1px'
                              }}
                          >
                              IT-DA
                          </h1>
                      </div>

                      {/* ✅ 오른쪽: 알림 + 설정 */}
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
                  onWriteReview={(id, title, date) => {
                    setModalMeetingId(id);
                    setModalMeetingTitle(title);
                    setModalMeetingDateText(`${date} 참여`);
                    setIsModalOpen(true);
                  }}
                />
                <MyReviews data={myReviews} />
                <MyMeetingsPage
                  upcoming={upcomingMeetings}
                  completed={completedMeetings}
                  onOpenChat={(id) => alert(`톡방 이동 ${id}`)}
                  onOpenReview={(id) => alert(`리뷰 보기 ${id}`)}
                />
              </>
            )}
            {activeTab === "archive" && (
              <ArchiveTab badges={badges} activities={activities} />
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
          fetchAll();
          fetchFollowCounts();
        }}
      />

      <NotificationDropdown
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
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
    </div>
  );
};

export default MyPage;
