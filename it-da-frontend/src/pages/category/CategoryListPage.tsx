// src/pages/category/CategoryListPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  categoryAPI,
  type CategoryDetailStats,
  type CategoryDetailStatsItem,
} from "@/api/category.api";
import { CategoryType } from "@/types/category.types.ts";
import "./CategoryListPage.css";

// ✅ 멤버 수 포맷팅 (1000 이상이면 K로 표시)
const formatMemberCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// ✅ 카테고리 기본 데이터 (아이콘, 설명, 서브카테고리만 - stats는 API에서!)
const CATEGORY_BASE_DATA: Record<
  CategoryType,
  { icon: string; description: string; subcategories: { name: string }[] }
> = {
  스포츠: {
    icon: "🏃",
    description: "건강한 몸과 마음을 위한\n다양한 운동 모임",
    subcategories: [
      { name: "러닝" },
      { name: "축구" },
      { name: "배드민턴" },
      { name: "등산" },
      { name: "요가" },
      { name: "사이클링" },
      { name: "클라이밍" },
    ],
  },
  맛집: {
    icon: "🍴",
    description: "미식가들의 즐거운\n맛집 탐방 모임",
    subcategories: [
      { name: "한식" },
      { name: "중식" },
      { name: "일식" },
      { name: "양식" },
      { name: "이자카야" },
      { name: "파인다이닝" },
    ],
  },
  카페: {
    icon: "☕",
    description: "여유로운 분위기 속\n카페 투어와 브런치",
    subcategories: [
      { name: "카페투어" },
      { name: "브런치" },
      { name: "디저트" },
      { name: "베이커리" },
      { name: "티하우스" },
    ],
  },
  문화예술: {
    icon: "🎨",
    description: "감성 충전하는\n전시회와 공연 모임",
    subcategories: [
      { name: "전시회" },
      { name: "공연" },
      { name: "갤러리" },
      { name: "공방체험" },
      { name: "사진촬영" },
      { name: "버스킹" },
    ],
  },
  스터디: {
    icon: "📚",
    description: "함께 성장하는\n학습과 자기계발",
    subcategories: [
      { name: "영어회화" },
      { name: "독서토론" },
      { name: "코딩" },
      { name: "재테크" },
      { name: "자격증" },
      { name: "세미나" },
    ],
  },
  취미활동: {
    icon: "🎪",
    description: "창의적인 취미를\n함께 즐기는 모임",
    subcategories: [
      { name: "그림" },
      { name: "베이킹" },
      { name: "쿠킹" },
      { name: "플라워" },
      { name: "캘리그라피" },
      { name: "댄스" },
    ],
  },
  소셜: {
    icon: "💬",
    description: "즐거운 사람들과\n신나는 활동 모임",
    subcategories: [
      { name: "보드게임" },
      { name: "방탈출" },
      { name: "볼링" },
      { name: "당구" },
      { name: "노래방" },
      { name: "와인바" },
    ],
  },
};

const CategoryListPage = () => {
  const navigate = useNavigate();

  // ✅ API에서 가져온 통계 데이터
  const [categoryStats, setCategoryStats] = useState<CategoryDetailStats>({});
  const [isLoading, setIsLoading] = useState(true);

  // ✅ 카테고리 통계 API 호출
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const stats = await categoryAPI.getCategoryDetailStats();
        console.log("📊 카테고리 전체 통계:", stats);
        setCategoryStats(stats);
      } catch (error) {
        console.error("❌ 카테고리 통계 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleCategoryClick = (categoryName: CategoryType) => {
    navigate(`/category/${encodeURIComponent(categoryName)}`);
  };

  const handleAllMeetingsClick = () => {
    navigate("/meetings");
  };

  // ✅ 카테고리별 stats 가져오기 (API 데이터 또는 기본값)
  const getStats = (categoryName: string) => {
    const stats = categoryStats[categoryName] as
      | CategoryDetailStatsItem
      | undefined;
    if (stats) {
      return {
        meetings: stats.meetings,
        members: formatMemberCount(stats.members),
      };
    }
    return { meetings: 0, members: "0" };
  };

  // ✅ 전체 통계 가져오기
  const getTotalStats = () => {
    const total = categoryStats.total as CategoryDetailStatsItem | undefined;
    if (total) {
      return {
        meetings: total.meetings,
        members: formatMemberCount(total.members),
      };
    }
    return { meetings: 0, members: "0" };
  };

  const totalStats = getTotalStats();

  return (
    <div className="category-list-page">
      {/* 헤더 */}
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

      {/* 메인 컨테이너 */}
      <div className="main-container">
        {/* 페이지 헤더 */}
        <div className="page-header">
          <div className="breadcrumb">
            <a href="/">홈</a>
            <span>›</span>
            <span>카테고리 전체보기</span>
          </div>
          <h1 className="page-title">모든 카테고리</h1>
          <p className="page-subtitle">
            관심있는 분야를 선택하고 새로운 모임을 찾아보세요
          </p>
        </div>

        {/* 카테고리 그리드 */}
        <div className="category-grid">
          {(
            Object.entries(CATEGORY_BASE_DATA) as [
              CategoryType,
              (typeof CATEGORY_BASE_DATA)[CategoryType],
            ][]
          ).map(([categoryName, categoryData]) => {
            const stats = getStats(categoryName);
            return (
              <div
                key={categoryName}
                className="category-card"
                onClick={() => handleCategoryClick(categoryName)}
              >
                <div className="category-icon">{categoryData.icon}</div>
                <div className="category-name">{categoryName}</div>
                <div className="category-description">
                  {categoryData.description.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i === 0 && <br />}
                    </span>
                  ))}
                </div>
                {/* ✅ 실제 DB 데이터로 통계 표시 */}
                <div className="category-stats">
                  <div className="stat-item">
                    <div className="stat-number">
                      {isLoading ? "..." : stats.meetings}
                    </div>
                    <div className="stat-label">모임</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">
                      {isLoading ? "..." : stats.members}
                    </div>
                    <div className="stat-label">멤버</div>
                  </div>
                </div>
                <div className="subcategory-preview">
                  {categoryData.subcategories.slice(0, 3).map((sub, i) => (
                    <span key={i} className="subcategory-tag">
                      {sub.name}
                    </span>
                  ))}
                  {categoryData.subcategories.length > 3 && (
                    <span className="subcategory-tag">
                      +{categoryData.subcategories.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* 전체 모임 카드 */}
          <div className="category-card" onClick={handleAllMeetingsClick}>
            <div className="category-icon">🌟</div>
            <div className="category-name">전체 모임</div>
            <div className="category-description">
              모든 카테고리의
              <br />
              모임을 한눈에
            </div>
            {/* ✅ 실제 전체 통계 */}
            <div className="category-stats">
              <div className="stat-item">
                <div className="stat-number">
                  {isLoading ? "..." : totalStats.meetings}
                </div>
                <div className="stat-label">전체 모임</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {isLoading ? "..." : totalStats.members}
                </div>
                <div className="stat-label">전체 멤버</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryListPage;
