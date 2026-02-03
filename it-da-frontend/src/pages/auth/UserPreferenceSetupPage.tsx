import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { userPreferenceAPI } from "@/api/userPreference.api";
import { UserPreferenceRequest } from "@/types/user.types";
import toast from "react-hot-toast";
import "@/pages/auth/SignupPage.css"; // 기존 스타일 재사용

// ✅ 질문 구성 (SignupPage.tsx 로직 재사용)
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
        desc: "모임을 이끄는 것을 좋아해요",
      },
      {
        value: "FOLLOWER",
        emoji: "🙋",
        title: "참여형",
        desc: "편하게 참여하는 것을 선호해요",
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

const UserPreferenceSetupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleOptionClick = (key: string, value: string) => {
    setPreferences({ ...preferences, [key]: value });
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    }
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

  const handleFinalSubmit = async () => {
    if (!user?.userId) {
      toast.error("로그인 정보를 찾을 수 없습니다.");
      return;
    }

    if (interests.length < 3) {
      toast.error("관심 분야를 최소 3개 선택해주세요!");
      return;
    }

    setIsLoading(true);

    const requestData: UserPreferenceRequest = {
      energyType: preferences.energyType, // ✅
      purposeType: preferences.purposeType, // ✅
      frequencyType: preferences.frequencyType, // ✅
      locationType: preferences.locationType, // ✅
      budgetType: preferences.budgetType, // ✅
      leadershipType: preferences.leadershipType, // ✅
      timePreference: timePreferences.join(","), // ✅
      interests: interests.join(","), // ✅
    };
    try {
      await userPreferenceAPI.createUserPreference(user.userId, requestData);
      toast.success("성향 설정이 완료되었습니다!");
      navigate("/");
    } catch (error) {
      console.error("저장 실패:", error);
      toast.error("정보 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="signup-container">
      <div className="signup-modal">
        <div className="modal-header">
          <h1 className="logo-text">성향 설정</h1>
          <p className="header-subtitle">
            맞춤 추천을 위해 몇 가지만 여쭤볼게요!
          </p>
        </div>

        <div className="progress-container">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* 밸런스 게임 질문 렌더링 */}
        {!currentQ.isTimePreference && !currentQ.isInterest && (
          <div className="step-content">
            <h2 className="question-title">{currentQ.title}</h2>
            <p className="question-subtitle">{currentQ.subtitle}</p>
            <div className="options-container">
              {currentQ.options?.map((option) => (
                <button
                  key={option.value}
                  className={`option-card ${preferences[currentQ.key as keyof typeof preferences] === option.value ? "selected" : ""}`}
                  onClick={() =>
                    handleOptionClick(currentQ.key as string, option.value)
                  }
                >
                  <div className="option-emoji">{option.emoji}</div>
                  <div className="option-title">{option.title}</div>
                  <div className="option-desc">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 시간대 선택 */}
        {currentQ.isTimePreference && (
          <div className="step-content">
            <h2 className="question-title">{currentQ.title}</h2>
            <p className="question-subtitle">{currentQ.subtitle}</p>
            <div className="time-grid">
              {currentQ.options?.map((option) => (
                <button
                  key={option.value}
                  className={`time-card ${timePreferences.includes(option.value) ? "selected" : ""}`}
                  onClick={() => handleTimeToggle(option.value)}
                >
                  <div className="option-emoji">{option.emoji}</div>
                  <div className="option-title">{option.title}</div>
                  <div className="option-desc">{option.desc}</div>
                </button>
              ))}
            </div>
            <button
              className="submit-btn"
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
            >
              다음
            </button>
          </div>
        )}

        {/* 관심사 선택 및 최종 제출 */}
        {currentQ.isInterest && (
          <div className="step-content">
            <h2 className="question-title">{currentQ.title}</h2>
            <p className="question-subtitle">{currentQ.subtitle}</p>
            <div className="interests-grid">
              {interestOptions.map((interest) => (
                <button
                  key={interest.value}
                  className={`interest-chip ${interests.includes(interest.value) ? "selected" : ""}`}
                  onClick={() => handleInterestToggle(interest.value)}
                >
                  <span className="interest-emoji">{interest.emoji}</span>
                  <span className="interest-title">{interest.title}</span>
                </button>
              ))}
            </div>
            <button
              className="submit-btn"
              onClick={handleFinalSubmit}
              disabled={isLoading || interests.length < 3}
            >
              {isLoading ? "저장 중..." : "설정 완료"}
            </button>
          </div>
        )}

        {currentQuestion > 0 && (
          <button
            className="back-btn"
            style={{ marginTop: "1rem" }}
            onClick={() => setCurrentQuestion(currentQuestion - 1)}
          >
            ← 이전으로
          </button>
        )}
      </div>
    </div>
  );
};

export default UserPreferenceSetupPage;
