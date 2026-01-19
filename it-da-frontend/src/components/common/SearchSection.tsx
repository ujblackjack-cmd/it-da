import { useState, FormEvent } from "react";
import "./SearchSection.css";

interface SearchSectionProps {
  onSearch: (query: string) => void;
}

const SearchSection = ({ onSearch }: SearchSectionProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleVoiceSearch = () => {
    alert("음성 검색 기능은 준비 중입니다!");
  };

  return (
    <div className="search-section">
      <div className="search-content">
        <h1 className="search-title"> IT - DA </h1>
        <p className="search-subtitle">
          당신의 취미를 찾아 드립니다
          <br />
          당신의 현재 상태를 알려주세요
        </p>

        <form className="search-bar" onSubmit={handleSubmit}>
          <input
            type="text"
            className="search-input"
            placeholder="지금 당신의 상태는 어떤가요?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="voice-btn"
            title="음성 검색"
            onClick={handleVoiceSearch}
          >
            🎤
          </button>
          <button type="submit" className="search-btn">
            검색
          </button>
        </form>
      </div>
    </div>
  );
};

export default SearchSection;
