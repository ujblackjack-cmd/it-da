import { useState, FormEvent, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import "./SearchSection.css";

interface SearchSectionProps {
    onSearch: (query: string) => void;
}

const SearchSection = ({ onSearch }: SearchSectionProps) => {
    const [query, setQuery] = useState("");
    const { text, setText, isListening, isSupported, startListening } = useSpeechRecognition();

    // 음성 인식 결과 → 검색창에 반영
    useEffect(() => {
        if (text) {
            setQuery(text);
            setText('');
        }
    }, [text, setText]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    const handleVoiceSearch = () => {
        if (!isSupported) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }
        startListening();
    };

    return (
        <div className="search-section">
            <div className="search-content">
                <h1 className="search-title">IT - DA</h1>
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
                        className={`voice-btn ${isListening ? 'listening' : ''}`}
                        title="음성 검색"
                        onClick={handleVoiceSearch}
                        disabled={isListening}
                    >
                        {isListening ? '🔴' : '🎤'}
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