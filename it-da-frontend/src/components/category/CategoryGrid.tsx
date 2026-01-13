import { useNavigate } from 'react-router-dom';
import './CategoryGrid.css';

interface Category {
  id: string;
  icon: string;
  name: string;
  count: number;
}

const categories: Category[] = [
  { id: 'sports', icon: '🏃', name: '스포츠', count: 142 },
  { id: 'food', icon: '🍴', name: '맛집', count: 98 },
  { id: 'cafe', icon: '☕', name: '카페', count: 76 },
  { id: 'culture', icon: '🎨', name: '문화예술', count: 64 },
  { id: 'study', icon: '📚', name: '스터디', count: 53 },
  { id: 'hobby', icon: '🎉', name: '취미활동', count: 87 },
  { id: 'social', icon: '💬', name: '소셜', count: 91 },
];

const CategoryGrid = () => {  // ✅ props 없음!
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/meetings?category=${categoryId}`);
  };

  return (
    <div className="category-grid">
      {categories.map((category) => (
        <div 
          key={category.id}
          className="category-card"
          onClick={() => handleCategoryClick(category.id)}
        >
          <div className="category-icon">{category.icon}</div>
          <div className="category-name">{category.name}</div>
          <div className="category-count">{category.count}개 모임</div>
        </div>
      ))}
    </div>
  );
};

export default CategoryGrid;