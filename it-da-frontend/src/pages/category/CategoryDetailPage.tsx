import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMeetingStore } from "@/stores/useMeetingStore";
import { Category, CategoryType } from "@/types/category.types";
import "./CategoryDetailPage.css";

// ✅ 카테고리 데이터
export const CATEGORY_DATA: Record<CategoryType, Omit<Category, "name">> = {
  스포츠: {
    icon: "🏃",
    description: "건강한 몸과 마음을 위한 다양한 운동 모임",
    subcategories: [
      {
        name: "러닝",
        icon: "🏃‍♂️",
        description: "함께 달리는 즐거움",
        meetings: 12,
        members: 340,
        popular: true,
      },
      {
        name: "축구",
        icon: "⚽",
        description: "팀워크를 기르는 축구",
        meetings: 8,
        members: 256,
      },
      {
        name: "배드민턴",
        icon: "🏸",
        description: "가벼운 운동의 정석",
        meetings: 10,
        members: 298,
      },
      {
        name: "등산",
        icon: "⛰️",
        description: "자연 속에서 호흡",
        meetings: 7,
        members: 215,
        popular: true,
      },
      {
        name: "요가",
        icon: "🧘",
        description: "몸과 마음의 균형",
        meetings: 6,
        members: 189,
      },
      {
        name: "사이클링",
        icon: "🚴",
        description: "바람을 가르며",
        meetings: 3,
        members: 97,
      },
      {
        name: "클라이밍",
        icon: "🧗",
        description: "도전하는 재미",
        meetings: 5,
        members: 145,
      },
    ],
    stats: { meetings: 47, members: "1.2K", rating: 4.8 },
  },
  맛집: {
    icon: "🍴",
    description: "미식가들의 즐거운 맛집 탐방 모임",
    subcategories: [
      {
        name: "한식",
        icon: "🍚",
        description: "우리의 맛, 한식",
        meetings: 9,
        members: 267,
        popular: true,
      },
      {
        name: "중식",
        icon: "🥟",
        description: "중국의 다양한 요리",
        meetings: 6,
        members: 178,
      },
      {
        name: "일식",
        icon: "🍣",
        description: "일본 정통 맛집",
        meetings: 8,
        members: 234,
      },
      {
        name: "양식",
        icon: "🍝",
        description: "이탈리안, 프렌치 등",
        meetings: 7,
        members: 198,
        popular: true,
      },
      {
        name: "이자카야",
        icon: "🍻",
        description: "일본식 선술집",
        meetings: 5,
        members: 156,
      },
      {
        name: "파인다이닝",
        icon: "🍷",
        description: "고급 레스토랑",
        meetings: 3,
        members: 89,
      },
    ],
    stats: { meetings: 38, members: "890", rating: 4.7 },
  },
  카페: {
    icon: "☕",
    description: "여유로운 분위기 속 카페 투어와 브런치",
    subcategories: [
      {
        name: "카페투어",
        icon: "☕",
        description: "핫플 카페 탐방",
        meetings: 15,
        members: 456,
        popular: true,
      },
      {
        name: "브런치",
        icon: "🥐",
        description: "맛있는 브런치",
        meetings: 12,
        members: 389,
      },
      {
        name: "디저트",
        icon: "🍰",
        description: "달콤한 디저트",
        meetings: 10,
        members: 312,
        popular: true,
      },
      {
        name: "베이커리",
        icon: "🥖",
        description: "빵 맛집 투어",
        meetings: 8,
        members: 245,
      },
      {
        name: "티하우스",
        icon: "🍵",
        description: "전통 차 문화",
        meetings: 7,
        members: 198,
      },
    ],
    stats: { meetings: 52, members: "1.5K", rating: 4.9 },
  },
  문화예술: {
    icon: "🎨",
    description: "감성 충전하는 전시회와 공연 모임",
    subcategories: [
      {
        name: "전시회",
        icon: "🖼️",
        description: "다양한 전시 관람",
        meetings: 9,
        members: 278,
        popular: true,
      },
      {
        name: "공연",
        icon: "🎭",
        description: "뮤지컬, 연극 등",
        meetings: 7,
        members: 234,
      },
      {
        name: "갤러리",
        icon: "🏛️",
        description: "갤러리 투어",
        meetings: 5,
        members: 156,
      },
      {
        name: "공방체험",
        icon: "🎨",
        description: "손으로 만드는 예술",
        meetings: 6,
        members: 189,
        popular: true,
      },
      {
        name: "사진촬영",
        icon: "📷",
        description: "사진 스팟 탐방",
        meetings: 3,
        members: 98,
      },
      {
        name: "버스킹",
        icon: "🎸",
        description: "거리 공연 즐기기",
        meetings: 1,
        members: 45,
      },
    ],
    stats: { meetings: 31, members: "720", rating: 4.6 },
  },
  스터디: {
    icon: "📚",
    description: "함께 성장하는 학습과 자기계발",
    subcategories: [
      {
        name: "영어회화",
        icon: "🗣️",
        description: "실전 영어 회화",
        meetings: 12,
        members: 367,
        popular: true,
      },
      {
        name: "독서토론",
        icon: "📖",
        description: "함께 읽고 토론",
        meetings: 9,
        members: 289,
      },
      {
        name: "코딩",
        icon: "💻",
        description: "프로그래밍 스터디",
        meetings: 8,
        members: 245,
        popular: true,
      },
      {
        name: "재테크",
        icon: "💰",
        description: "재테크 공부",
        meetings: 7,
        members: 213,
      },
      {
        name: "자격증",
        icon: "📜",
        description: "자격증 준비",
        meetings: 5,
        members: 178,
      },
      {
        name: "세미나",
        icon: "🎤",
        description: "지식 공유",
        meetings: 2,
        members: 67,
      },
    ],
    stats: { meetings: 43, members: "980", rating: 4.7 },
  },
  취미활동: {
    icon: "🎪",
    description: "창의적인 취미를 함께 즐기는 모임",
    subcategories: [
      {
        name: "그림",
        icon: "🎨",
        description: "드로잉, 페인팅",
        meetings: 8,
        members: 245,
        popular: true,
      },
      {
        name: "베이킹",
        icon: "🧁",
        description: "베이킹 클래스",
        meetings: 7,
        members: 223,
      },
      {
        name: "쿠킹",
        icon: "👨‍🍳",
        description: "요리 배우기",
        meetings: 6,
        members: 198,
        popular: true,
      },
      {
        name: "플라워",
        icon: "💐",
        description: "플라워 아트",
        meetings: 5,
        members: 167,
      },
      {
        name: "캘리그라피",
        icon: "✒️",
        description: "손글씨 예술",
        meetings: 6,
        members: 189,
      },
      {
        name: "댄스",
        icon: "💃",
        description: "춤으로 스트레스 해소",
        meetings: 4,
        members: 134,
      },
    ],
    stats: { meetings: 36, members: "840", rating: 4.8 },
  },
  소셜: {
    icon: "🎉",
    description: "즐거운 사람들과 신나는 활동 모임",
    subcategories: [
      {
        name: "보드게임",
        icon: "🎲",
        description: "보드게임 카페",
        meetings: 13,
        members: 398,
        popular: true,
      },
      {
        name: "방탈출",
        icon: "🔐",
        description: "미스터리 탈출",
        meetings: 11,
        members: 356,
      },
      {
        name: "볼링",
        icon: "🎳",
        description: "볼링 함께",
        meetings: 9,
        members: 289,
        popular: true,
      },
      {
        name: "당구",
        icon: "🎱",
        description: "당구 모임",
        meetings: 8,
        members: 256,
      },
      {
        name: "노래방",
        icon: "🎤",
        description: "노래방 파티",
        meetings: 10,
        members: 312,
      },
      {
        name: "와인바",
        icon: "🍷",
        description: "와인 시음",
        meetings: 4,
        members: 123,
      },
    ],
    stats: { meetings: 55, members: "1.8K", rating: 4.9 },
  },
};

const CategoryDetailPage = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  // ✅ Zustand store에서 데이터 가져오기
  const { meetings, isLoading, fetchMeetingsByCategory } = useMeetingStore();

  const categoryName = decodeURIComponent(category || "") as CategoryType;
  const categoryData = CATEGORY_DATA[categoryName];

  // ✅ 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (categoryName && categoryData) {
      console.log("🔄 카테고리 인기 모임 로드:", categoryName);
      fetchMeetingsByCategory(categoryName);
    }
  }, [categoryName, fetchMeetingsByCategory]);

  // ✅ 날짜 포맷팅 함수
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    return `${month}/${day} (${dayName})`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (!categoryData) {
    return (
      <div className="error-page">
        <h1>잘못된 카테고리입니다</h1>
        <button onClick={() => navigate("/category")}>카테고리 목록으로</button>
      </div>
    );
  }

  const handleSubcategoryClick = (subcategoryName: string) => {
    navigate(
      `/meetings?category=${encodeURIComponent(categoryName)}&subcategory=${encodeURIComponent(subcategoryName)}`
    );
  };

  const handleViewAllMeetings = () => {
    navigate(`/meetings?category=${encodeURIComponent(categoryName)}`);
  };

  // ✅ 인기 모임 상위 2개만 표시
  const popularMeetings = meetings.slice(0, 2);

  return (
    <div className="category-detail-page">
      <header className="header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate("/")}>
            IT-DA
          </div>
          <nav className="nav-menu">
            <a href="/meetings" className="nav-item">
              모임 찾기
            </a>
            <a href="/chat" className="nav-item">
              모임톡
            </a>
            <a href="/mypage" className="nav-item">
              마이페이지
            </a>
          </nav>
        </div>
      </header>

      <div className="main-container">
        <div className="category-header">
          <div className="breadcrumb">
            <a href="/">홈</a>
            <span>›</span>
            <a href="/category">카테고리</a>
            <span>›</span>
            <span>{categoryName}</span>
          </div>
          <div className="category-info">
            <div className="category-icon-large">{categoryData.icon}</div>
            <div className="category-details">
              <h1>{categoryName}</h1>
              <p className="category-description">{categoryData.description}</p>
              <div className="category-stats">
                <div className="stat-box">
                  <div className="stat-number">
                    {categoryData.stats.meetings}
                  </div>
                  <div className="stat-label">활성 모임</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">
                    {categoryData.stats.members}
                  </div>
                  <div className="stat-label">참여 멤버</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">{categoryData.stats.rating}</div>
                  <div className="stat-label">평균 평점</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="subcategory-section">
          <div className="section-header">
            <h2 className="section-title">세부 카테고리</h2>
            <button className="view-all-btn" onClick={handleViewAllMeetings}>
              {categoryName} 카테고리의 전체 모임 보기
            </button>
          </div>

          <div className="subcategory-grid">
            {categoryData.subcategories.map((sub, index) => (
              <div
                key={index}
                className="subcategory-card"
                onClick={() => handleSubcategoryClick(sub.name)}
              >
                {sub.popular && <div className="popular-badge">🔥 인기</div>}
                <div className="subcategory-header">
                  <div className="subcategory-icon">{sub.icon}</div>
                  <div className="subcategory-name">{sub.name}</div>
                </div>
                <div className="subcategory-description">{sub.description}</div>
                <div className="subcategory-stats">
                  <div className="subcategory-stat">
                    <div className="subcategory-stat-number">
                      {sub.meetings}
                    </div>
                    <div className="subcategory-stat-label">모임</div>
                  </div>
                  <div className="subcategory-stat">
                    <div className="subcategory-stat-number">{sub.members}</div>
                    <div className="subcategory-stat-label">멤버</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ 추천 모임 섹션 - 실제 데이터 사용 */}
        <div className="recommended-meetings">
          <div className="section-header">
            <h2 className="section-title">💡 이 카테고리의 인기 모임</h2>
          </div>

          {isLoading ? (
            <div className="loading-container">
              <div>로딩 중...</div>
            </div>
          ) : popularMeetings.length > 0 ? (
            <div className="recommended-meetings-container">
              {popularMeetings.map((meeting) => (
                <div
                  key={meeting.meetingId}
                  className="meeting-card"
                  onClick={() => navigate(`/meetings/${meeting.meetingId}`)}
                >
                  <div className="meeting-image">
                    {meeting.imageUrl ? (
                      <img
                        src={meeting.imageUrl}
                        alt={meeting.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      categoryData.icon
                    )}
                  </div>
                  <div className="meeting-info">
                    <div className="meeting-category">{meeting.category}</div>
                    <div className="meeting-title">{meeting.title}</div>
                    <div className="meeting-description">
                      {meeting.description.length > 50
                        ? meeting.description.substring(0, 50) + "..."
                        : meeting.description}
                    </div>
                    <div className="meeting-meta">
                      <div className="meeting-meta-item">
                        📍 {meeting.locationName}
                      </div>
                      <div className="meeting-meta-item">
                        ⏰ {formatDate(meeting.meetingTime)}{" "}
                        {formatTime(meeting.meetingTime)}
                      </div>
                      <div className="meeting-meta-item">
                        👥 {meeting.currentParticipants}/
                        {meeting.maxParticipants}명
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-container">
              <div>아직 등록된 모임이 없어요</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailPage;
