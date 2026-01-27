// src/components/category/CategoryGrid.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryAPI, type CategoryDetailStats, type CategoryDetailStatsItem } from '@/api/category.api';
import './CategoryGrid.css';

interface Category {
    id: string;
    icon: string;
    name: string;
    count: number;
}

interface CategoryGridProps {
    limit?: number;
    showAllCard?: boolean;
}

// ✅ 기본 카테고리 정보 (아이콘만)
const DEFAULT_CATEGORIES: Omit<Category, 'count'>[] = [
    { id: 'sports', icon: '🏃', name: '스포츠' },
    { id: 'food', icon: '🍴', name: '맛집' },
    { id: 'cafe', icon: '☕', name: '카페' },
    { id: 'culture', icon: '🎨', name: '문화예술' },
    { id: 'study', icon: '📚', name: '스터디' },
    { id: 'hobby', icon: '🎪', name: '취미활동' },
    { id: 'social', icon: '💬', name: '소셜' },
];

const CategoryGrid = ({ limit, showAllCard = true }: CategoryGridProps = {}) => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    // ✅ API에서 카테고리별 상세 통계 가져오기
    useEffect(() => {
        const fetchCategoryStats = async () => {
            try {
                setIsLoading(true);
                const stats: CategoryDetailStats = await categoryAPI.getCategoryDetailStats();

                console.log('📊 카테고리 상세 통계:', stats);

                // 카테고리 데이터에 실제 count 매핑
                const categoriesWithCount: Category[] = DEFAULT_CATEGORIES.map(cat => {
                    const catStats = stats[cat.name] as CategoryDetailStatsItem | undefined;
                    return {
                        ...cat,
                        count: catStats?.meetings || 0,
                    };
                });

                // 모임 수 기준 내림차순 정렬
                categoriesWithCount.sort((a, b) => b.count - a.count);

                setCategories(categoriesWithCount);

                // total 통계
                const totalStats = stats.total as CategoryDetailStatsItem | undefined;
                setTotalCount(totalStats?.meetings || 0);

            } catch (error) {
                console.error('❌ 카테고리 통계 로드 실패:', error);
                setCategories(DEFAULT_CATEGORIES.map(cat => ({ ...cat, count: 0 })));
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategoryStats();
    }, []);

    // limit이 있으면 상위 N개만
    const displayCategories = limit ? categories.slice(0, limit) : categories;

    const handleCategoryClick = (categoryName: string) => {
        navigate(`/category/${encodeURIComponent(categoryName)}`);
    };

    const handleAllMeetingsClick = () => {
        navigate('/category');
    };

    // ✅ 로딩 중 스켈레톤 UI
    if (isLoading) {
        return (
            <div className="category-grid">
                {[...Array(7)].map((_, index) => (
                    <div key={index} className="category-card category-skeleton">
                        <div className="skeleton-icon"></div>
                        <div className="skeleton-text"></div>
                        <div className="skeleton-count"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="category-grid">
            {displayCategories.map((category) => (
                <div
                    key={category.name}
                    className="category-card"
                    onClick={() => handleCategoryClick(category.name)}
                >
                    <div className="category-icon">{category.icon}</div>
                    <div className="category-name">{category.name}</div>
                    <div className="category-count">{category.count}개 모임</div>
                </div>
            ))}

            {showAllCard && (
                <div
                    key="전체 모임"
                    className="category-card category-card-all"
                    onClick={handleAllMeetingsClick}
                >
                    <div className="category-icon">🌟</div>
                    <div className="category-name">전체 모임</div>
                    <div className="category-count">{totalCount}개 모임</div>
                </div>
            )}
        </div>
    );
};

export default CategoryGrid;
