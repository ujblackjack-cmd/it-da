import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import toast from "react-hot-toast";
import "./SignupPage.css";

// ✅ Daum 우편번호 타입 정의
declare global {
  interface Window {
    daum: any;
  }
}

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuthStore();
  const [step, setStep] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    username: "",
    address: "",
    addressDetail: "",
    zipcode: "",
    nickname: "",
    phone: "",
  });

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

  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        const addr =
          data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

        setFormData({
          ...formData,
          zipcode: data.zonecode,
          address: addr,
          addressDetail: "",
        });

        toast.success("주소가 입력되었습니다!");
        document.getElementById("addressDetail")?.focus();
      },
    }).open();
  };

  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();

    if (
      !formData.email ||
      !formData.password ||
      !formData.username ||
      !formData.address
    ) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    setStep(2);
    setCurrentQuestion(0);
  };

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
      subtitle: "계획 vs 즉흥",
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
          desc: "모임을 이끌고\n분위기 주도",
        },
        {
          value: "FOLLOWER",
          emoji: "🙋",
          title: "참여형",
          desc: "편하게 참여하고\n즐기는 스타일",
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
        {
          value: "AFTERNOON",
          emoji: "☀️",
          title: "오후",
          desc: "12:00 - 18:00",
        },
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
    { value: "스포츠", emoji: "⚽", title: "스포츠" },
    { value: "맛집", emoji: "🍴", title: "맛집" },
    { value: "카페", emoji: "☕", title: "카페" },
    { value: "문화예술", emoji: "🎭", title: "문화예술" },
    { value: "스터디", emoji: "📚", title: "스터디" },
    { value: "취미활동", emoji: "🎉", title: "취미활동" },
    { value: "소셜", emoji: "💬", title: "소셜" },
    { value: "아웃도어", emoji: "⛰️", title: "아웃도어" },
    { value: "게임", emoji: "🎮", title: "게임" },
    { value: "음악", emoji: "🎵", title: "음악" },
    { value: "요리", emoji: "🍳", title: "요리" },
    { value: "사진", emoji: "📷", title: "사진" },
  ];

    const handleFinalSubmit = async () => {
        if (interests.length < 3) {
            toast.error("관심 분야를 최소 3개 선택해주세요!");
            return;
        }

        // ✅ address 조합
        const fullAddress = formData.addressDetail
            ? `${formData.address} ${formData.addressDetail}`.trim()
            : formData.address;

        // ✅ 올바른 구조로 데이터 구성
        const signupData = {
            email: formData.email,
            password: formData.password,
            username: formData.username,
            address: fullAddress,
            nickname: formData.nickname || undefined,
            phone: formData.phone || undefined,
            preferences: {
                energyType: preferences.energyType,
                purposeType: preferences.purposeType,
                frequencyType: preferences.frequencyType,
                locationType: preferences.locationType,
                budgetType: preferences.budgetType,
                leadershipType: preferences.leadershipType,
                timePreference: timePreferences[0] || "FLEXIBLE",
                interests: JSON.stringify(interests),
            },
        };

        console.log("=" .repeat(50));
        console.log("📝 SignupPage에서 생성한 데이터:");
        console.log(JSON.stringify(signupData, null, 2));
        console.log("=" .repeat(50));

        try {
            await signup(signupData);
            toast.success("회원가입 완료!");
            navigate("/login");
        } catch (error: any) {
            console.error("❌ 회원가입 오류:", error);
            console.error("❌ 에러 응답:", error.response?.data);
            toast.error(error.response?.data?.message || "회원가입에 실패했습니다.");
        }
    };

  const handleOptionClick = (key: string, value: string) => {
    setPreferences({ ...preferences, [key]: value });
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }, 300);
  };

  const handleTimeToggle = (value: string) => {
    if (timePreferences.includes(value)) {
      setTimePreferences(timePreferences.filter((t) => t !== value));
    } else {
      if (timePreferences.length < 2) {
        setTimePreferences([...timePreferences, value]);
      } else {
        toast.error("최대 2개까지 선택 가능합니다!");
      }
    }
  };

  const handleTimeNext = () => {
    if (timePreferences.length === 0) {
      toast.error("최소 1개의 시간대를 선택해주세요!");
      return;
    }
    setCurrentQuestion(currentQuestion + 1);
  };

  const handleInterestToggle = (value: string) => {
    if (interests.includes(value)) {
      setInterests(interests.filter((i) => i !== value));
    } else {
      setInterests([...interests, value]);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      setStep(1);
    }
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="signup-container">
      <div className="signup-modal">
        <div className="modal-header">
          <div className="logo">
            <span className="logo-icon">🍇</span>
            <h1 className="logo-text">취미메이트</h1>
          </div>
          <p className="header-subtitle">AI가 추천하는 완벽한 취미 매칭</p>
        </div>

        <div className="progress-container">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: step === 1 ? "0%" : `${progress}%` }}
            ></div>
          </div>
        </div>

        {step === 1 && (
          <div className="step-content">
            <form onSubmit={handleStep1Submit} className="basic-form">
              <input
                type="email"
                placeholder="이메일"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="form-input"
                required
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="form-input"
                required
              />
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={formData.passwordConfirm}
                onChange={(e) =>
                  setFormData({ ...formData, passwordConfirm: e.target.value })
                }
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="이름"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="form-input"
                required
              />

              <div className="address-group">
                <div className="address-row">
                  <input
                    type="text"
                    placeholder="우편번호"
                    value={formData.zipcode}
                    className="form-input zipcode-input"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    className="address-search-btn"
                  >
                    주소 검색
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="주소"
                  value={formData.address}
                  className="form-input"
                  readOnly
                  required
                />
                <input
                  id="addressDetail"
                  type="text"
                  placeholder="상세 주소 (선택)"
                  value={formData.addressDetail}
                  onChange={(e) =>
                    setFormData({ ...formData, addressDetail: e.target.value })
                  }
                  className="form-input"
                />
              </div>

              <input
                type="text"
                placeholder="닉네임 (선택)"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                className="form-input"
              />
              <input
                type="tel"
                placeholder="전화번호 (선택)"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="form-input"
              />
              <button type="submit" className="submit-btn">
                다음
              </button>
            </form>
            <p className="footer-text">
              이미 계정이 있으신가요? <a href="/login">로그인</a>
            </p>
          </div>
        )}

        {step === 2 && !currentQ.isTimePreference && !currentQ.isInterest && (
          <div className="step-content">
            <h2 className="question-title">{currentQ.title}</h2>
            <p className="question-subtitle">{currentQ.subtitle}</p>
            <div className="options-container">
              {currentQ.options?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`option-card ${
                    preferences[currentQ.key as keyof typeof preferences] ===
                    option.value
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleOptionClick(currentQ.key, option.value)}
                >
                  <div className="option-emoji">{option.emoji}</div>
                  <div className="option-title">{option.title}</div>
                  <div className="option-desc">{option.desc}</div>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="back-btn"
              onClick={handlePrevQuestion}
            >
              ← 이전
            </button>
          </div>
        )}

        {step === 2 && currentQ.isTimePreference && (
          <div className="step-content">
            <h2 className="question-title">{currentQ.title}</h2>
            <p className="question-subtitle">{currentQ.subtitle}</p>
            <div className="time-grid">
              {currentQ.options?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`time-card ${
                    timePreferences.includes(option.value) ? "selected" : ""
                  }`}
                  onClick={() => handleTimeToggle(option.value)}
                >
                  <div className="option-emoji">{option.emoji}</div>
                  <div className="option-title">{option.title}</div>
                  <div className="option-desc">{option.desc}</div>
                </button>
              ))}
            </div>
            <div className="button-group-vertical">
              <button
                type="button"
                className="back-btn"
                onClick={handlePrevQuestion}
              >
                ← 이전
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={handleTimeNext}
              >
                다음
              </button>
            </div>
          </div>
        )}

        {step === 2 && currentQ.isInterest && (
          <div className="step-content">
            <h2 className="question-title">{currentQ.title}</h2>
            <p className="question-subtitle">{currentQ.subtitle}</p>
            <div className="interests-grid">
              {interestOptions.map((interest) => (
                <button
                  key={interest.value}
                  type="button"
                  className={`interest-chip ${
                    interests.includes(interest.value) ? "selected" : ""
                  }`}
                  onClick={() => handleInterestToggle(interest.value)}
                >
                  <span className="interest-emoji">{interest.emoji}</span>
                  <span className="interest-title">{interest.title}</span>
                </button>
              ))}
            </div>
            <div className="final-buttons">
              <button
                type="button"
                className="back-btn"
                onClick={handlePrevQuestion}
              >
                ← 이전
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={handleFinalSubmit}
                disabled={isLoading || interests.length < 3}
              >
                {isLoading ? "가입 중..." : "회원가입 완료"}
              </button>
            </div>
            <p className="footer-text">
              이미 계정이 있으신가요? <a href="/login">로그인</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignupPage;
