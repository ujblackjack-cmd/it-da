import React, { useState, useEffect } from "react";
import { userPreferenceAPI } from "@/api/userPreference.api";
import { UserPreferenceRequest } from "@/types/user.types";
import toast from "react-hot-toast";
import "./PreferenceEditModal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSaved?: () => void;
}

// ✅ 질문 구성 (SignupPage.tsx와 동일)
const questions = [
  {
    id: 1,
    title: "어떤 모임을 선호하시나요?",
    subtitle: "나의 에너지 유형",
    options: [
      {
        value: "EXTROVERT",
        emoji: "🎉",
        title: "외향적",
        desc: "많은 사람과\n활발하게 교류",
      },
      {
        value: "INTROVERT",
        emoji: "☕",
        title: "내향적",
        desc: "소수와\n깊은 대화",
      },
    ],
    key: "energyType",
  },
  {
    id: 2,
    title: "모임의 목적은?",
    subtitle: "관계 vs 활동",
    options: [
      {
        value: "RELATIONSHIP",
        emoji: "👫",
        title: "관계 중심",
        desc: "새로운 사람들과\n친해지는 게 목적",
      },
      {
        value: "TASK",
        emoji: "🎯",
        title: "활동 중심",
        desc: "함께 무언가를\n하는 게 목적",
      },
    ],
    key: "purposeType",
  },
  {
    id: 3,
    title: "모임 참여 스타일은?",
    subtitle: "정기 vs 즉흥",
    options: [
      {
        value: "REGULAR",
        emoji: "📅",
        title: "정기적",
        desc: "일정한 시간에\n꾸준히 참여",
      },
      {
        value: "SPONTANEOUS",
        emoji: "✨",
        title: "즉흥적",
        desc: "그때그때\n기분따라",
      },
    ],
    key: "frequencyType",
  },
  {
    id: 4,
    title: "선호하는 장소는?",
    subtitle: "실내 vs 실외",
    options: [
      {
        value: "INDOOR",
        emoji: "🏠",
        title: "실내",
        desc: "카페, 스터디룸\n편안한 공간",
      },
      {
        value: "OUTDOOR",
        emoji: "🌳",
        title: "실외",
        desc: "공원, 운동장\n야외 활동",
      },
    ],
    key: "locationType",
  },
  {
    id: 5,
    title: "비용에 대한 생각은?",
    subtitle: "가성비 vs 퀄리티",
    options: [
      {
        value: "VALUE",
        emoji: "💰",
        title: "가성비",
        desc: "합리적인 가격의\n알찬 모임",
      },
      {
        value: "QUALITY",
        emoji: "💎",
        title: "퀄리티",
        desc: "비용보다\n경험이 중요",
      },
    ],
    key: "budgetType",
  },
  {
    id: 6,
    title: "모임에서 나의 역할은?",
    subtitle: "주도 vs 참여",
    options: [
      {
        value: "LEADER",
        emoji: "👑",
        title: "주도형",
        desc: "모임을 이끄는 것을\n좋아해요",
      },
      {
        value: "FOLLOWER",
        emoji: "🙋",
        title: "참여형",
        desc: "편하게 참여하는\n것을 선호해요",
      },
    ],
    key: "leadershipType",
  },
  {
    id: 7,
    title: "선호하는 시간대는?",
    subtitle: "최대 2개 선택 가능",
    isTimePreference: true,
    options: [
      { value: "MORNING", emoji: "🌅", title: "오전", desc: "06:00 - 12:00" },
      { value: "AFTERNOON", emoji: "☀️", title: "오후", desc: "12:00 - 18:00" },
      { value: "EVENING", emoji: "🌆", title: "저녁", desc: "18:00 - 24:00" },
      {
        value: "FLEXIBLE",
        emoji: "⏰",
        title: "유연",
        desc: "시간 상관없어요",
      },
    ],
  },
  {
    id: 8,
    title: "관심 있는 분야를 선택해주세요",
    subtitle: "최소 3개 선택",
    isInterest: true,
  },
];

const interestOptions = [
  {
    value: "스포츠",
    emoji: "⚽",
    title: "스포츠·액티비티",
    desc: "러닝, 축구, 등산 등",
  },
  { value: "맛집", emoji: "🍴", title: "맛집", desc: "한식, 일식, 양식 등" },
  { value: "카페", emoji: "☕", title: "카페", desc: "브런치, 디저트 등" },
  {
    value: "문화예술",
    emoji: "🎭",
    title: "문화·예술",
    desc: "전시, 공연, 사진 등",
  },
  {
    value: "스터디",
    emoji: "📚",
    title: "스터디·세미나",
    desc: "영어, 코딩, 독서 등",
  },
  {
    value: "취미활동",
    emoji: "🎉",
    title: "취미·여가",
    desc: "요리, 베이킹, 댄스 등",
  },
  {
    value: "소셜",
    emoji: "💬",
    title: "친목·네트워킹",
    desc: "보드게임, 볼링 등",
  },
];

const PreferenceEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userId,
  onSaved,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [preferences, setPreferences] = useState({
    energyType: "",
    purposeType: "",
    frequencyType: "",
    locationType: "",
    budgetType: "",
    leadershipType: "",
  });

  const [timePreferences, setTimePreferences] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  // ✅ 모달 열릴 때 기존 선호도 불러오기
  useEffect(() => {
    if (isOpen && userId) {
      fetchPreference();
    }
  }, [isOpen, userId]);

  const fetchPreference = async () => {
    setIsFetching(true);
    try {
      const data = await userPreferenceAPI.getUserPreference(userId);

      setPreferences({
        energyType: data.energyType || "",
        purposeType: data.purposeType || "",
        frequencyType: data.frequencyType || "",
        locationType: data.locationType || "",
        budgetType: data.budgetType || "",
        leadershipType: data.leadershipType || "",
      });

      // timePreference 파싱 (쉼표로 구분된 문자열)
      if (data.timePreference) {
        setTimePreferences(data.timePreference.split(",").filter(Boolean));
      }

      // interests 파싱 (JSON 문자열 또는 쉼표 구분)
      if (data.interests) {
        try {
          const parsed = JSON.parse(data.interests);
          setInterests(Array.isArray(parsed) ? parsed : []);
        } catch {
          // JSON 파싱 실패 시 쉼표로 분리
          setInterests(data.interests.split(",").filter(Boolean));
        }
      }

      setCurrentQuestion(0);
    } catch (error) {
      console.error("선호도 불러오기 실패:", error);
      // 선호도가 없는 경우 초기 상태 유지
      setPreferences({
        energyType: "",
        purposeType: "",
        frequencyType: "",
        locationType: "",
        budgetType: "",
        leadershipType: "",
      });
      setTimePreferences([]);
      setInterests([]);
    } finally {
      setIsFetching(false);
    }
  };

  const handleOptionClick = (key: string, value: string) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const handleTimeToggle = (value: string) => {
    if (timePreferences.includes(value)) {
      setTimePreferences(timePreferences.filter((t) => t !== value));
    } else if (timePreferences.length < 2) {
      setTimePreferences([...timePreferences, value]);
    } else {
      toast.error("최대 2개까지 선택 가능합니다!");
    }
  };

  const handleInterestToggle = (value: string) => {
    if (interests.includes(value)) {
      setInterests(interests.filter((i) => i !== value));
    } else {
      setInterests([...interests, value]);
    }
  };

  const handleNext = () => {
    const currentQ = questions[currentQuestion];

    // 현재 질문 유효성 검사
    if (!currentQ.isTimePreference && !currentQ.isInterest) {
      const key = currentQ.key as keyof typeof preferences;
      if (!preferences[key]) {
        toast.error("선택해주세요!");
        return;
      }
    }

    if (currentQ.isTimePreference && timePreferences.length === 0) {
      toast.error("최소 1개의 시간대를 선택해주세요!");
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSave = async () => {
    if (interests.length < 3) {
      toast.error("관심 분야를 최소 3개 선택해주세요!");
      return;
    }

    setIsLoading(true);

    const requestData: UserPreferenceRequest = {
      energyType: preferences.energyType,
      purposeType: preferences.purposeType,
      frequencyType: preferences.frequencyType,
      locationType: preferences.locationType,
      budgetType: preferences.budgetType,
      leadershipType: preferences.leadershipType,
      timePreference: timePreferences.join(","),
      interests: JSON.stringify(interests),
    };

    try {
      await userPreferenceAPI.createUserPreference(userId, requestData);
      toast.success("선호도가 수정되었습니다!");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("저장 실패:", error);
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentQuestion(0);
    onClose();
  };

  if (!isOpen) return null;

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="pref-modal-overlay" onClick={handleClose}>
      <div
        className="pref-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="pref-modal-header">
          <button className="pref-modal-close" onClick={handleClose}>
            ✕
          </button>
          <div className="pref-modal-logo">
            <span className="pref-logo-icon">🎯</span>
            <h2 className="pref-logo-text">나의 선호도</h2>
          </div>
          <p className="pref-header-subtitle">AI 맞춤 추천을 위한 성향 설정</p>
        </div>

        {/* 진행 바 */}
        <div className="pref-progress-container">
          <div className="pref-progress-bar">
            <div
              className="pref-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="pref-progress-text">
            {currentQuestion + 1} / {questions.length}
          </span>
        </div>

        {/* 로딩 상태 */}
        {isFetching ? (
          <div className="pref-loading">
            <div className="pref-spinner"></div>
            <p>선호도 불러오는 중...</p>
          </div>
        ) : (
          <div className="pref-modal-content">
            {/* 밸런스 게임 질문 */}
            {!currentQ.isTimePreference && !currentQ.isInterest && (
              <div className="pref-question-section">
                <h3 className="pref-question-title">{currentQ.title}</h3>
                <p className="pref-question-subtitle">{currentQ.subtitle}</p>

                <div className="pref-options-grid">
                  {currentQ.options?.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`pref-option-card ${
                        preferences[
                          currentQ.key as keyof typeof preferences
                        ] === option.value
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleOptionClick(currentQ.key, option.value)
                      }
                    >
                      <div className="pref-option-emoji">{option.emoji}</div>
                      <div className="pref-option-title">{option.title}</div>
                      <div className="pref-option-desc">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 시간대 선택 */}
            {currentQ.isTimePreference && (
              <div className="pref-question-section">
                <h3 className="pref-question-title">{currentQ.title}</h3>
                <p className="pref-question-subtitle">{currentQ.subtitle}</p>

                <div className="pref-time-grid">
                  {currentQ.options?.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`pref-time-card ${
                        timePreferences.includes(option.value) ? "selected" : ""
                      }`}
                      onClick={() => handleTimeToggle(option.value)}
                    >
                      <div className="pref-option-emoji">{option.emoji}</div>
                      <div className="pref-option-title">{option.title}</div>
                      <div className="pref-option-desc">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 관심사 선택 */}
            {currentQ.isInterest && (
              <div className="pref-question-section">
                <h3 className="pref-question-title">{currentQ.title}</h3>
                <p className="pref-question-subtitle">{currentQ.subtitle}</p>

                <div className="pref-interests-grid">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest.value}
                      type="button"
                      className={`pref-interest-chip ${
                        interests.includes(interest.value) ? "selected" : ""
                      }`}
                      onClick={() => handleInterestToggle(interest.value)}
                    >
                      <span className="pref-interest-emoji">
                        {interest.emoji}
                      </span>
                      <span className="pref-interest-title">
                        {interest.title}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pref-selected-count">
                  선택된 관심사: <strong>{interests.length}</strong>개
                  {interests.length < 3 && (
                    <span className="pref-count-warning"> (최소 3개)</span>
                  )}
                </div>
              </div>
            )}

            {/* 버튼 그룹 */}
            <div className="pref-button-group">
              {currentQuestion > 0 && (
                <button
                  type="button"
                  className="pref-btn pref-btn-back"
                  onClick={handlePrev}
                >
                  ← 이전
                </button>
              )}

              {currentQuestion < questions.length - 1 ? (
                <button
                  type="button"
                  className="pref-btn pref-btn-next"
                  onClick={handleNext}
                >
                  다음 →
                </button>
              ) : (
                <button
                  type="button"
                  className="pref-btn pref-btn-save"
                  onClick={handleSave}
                  disabled={isLoading || interests.length < 3}
                >
                  {isLoading ? "저장 중..." : "✓ 저장하기"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreferenceEditModal;
