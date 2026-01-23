import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/api/axios.config"
import "./MeetingCreatePage.css";
import toast from "react-hot-toast";

declare global {
  interface Window {
    kakao: any;
  }
}

interface VibeOption {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

const MeetingCreatePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    subcategory: "",
    description: "",
    meetingDate: "",
    meetingTime: "",
    detailAddress: "",
    maxParticipants: 10,
    deadline: "",
    cost: 0,
    supplies: "",
  });

  const [selectedVibe, setSelectedVibe] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationData>({
    name: "",
    latitude: 37.5665,
    longitude: 126.978,
    address: "",
  });
  const [locationSearchInput, setLocationSearchInput] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [showLocationResults, setShowLocationResults] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // ✅ 임시저장 불러왔는지 여부
  const [draftLoaded, setDraftLoaded] = useState(false);

  // 카테고리 옵션
  const categories = [
    { value: "", label: "카테고리를 선택하세요" },
    { value: "스포츠", label: "🏃 스포츠·액티비티" },
    { value: "맛집", label: "🍽️ 맛집·카페" },
    { value: "문화예술", label: "🎨 문화·예술" },
    { value: "스터디", label: "📚 스터디·세미나" },
    { value: "취미활동", label: "🎸 취미·여가" },
    { value: "소셜", label: "🎉 친목·네트워킹" },
  ];

  const subcategoryMap: Record<string, string[]> = {
    스포츠: [
      "러닝",
      "축구",
      "배드민턴",
      "등산",
      "요가",
      "사이클링",
      "클라이밍",
    ],
    맛집: ["한식", "중식", "일식", "양식", "이자카야", "파인다이닝"],
    카페: ["카페투어", "브런치", "디저트", "베이커리", "티하우스"],
    문화예술: ["전시회", "공연", "갤러리", "공방체험", "사진촬영", "버스킹"],
    스터디: ["영어회화", "독서토론", "코딩", "재테크", "자격증", "세미나"],
    취미활동: ["그림", "베이킹", "쿠킹", "플라워", "캘리그라피", "댄스"],
    소셜: ["보드게임", "방탈출", "볼링", "당구", "노래방", "와인바"],
  };

  // 분위기 옵션
  const vibeOptions: VibeOption[] = [
    { id: "활기찬", icon: "⚡", name: "활기찬", desc: "에너지 넘치는" },
    { id: "여유로운", icon: "☕", name: "여유로운", desc: "편안하고 느긋한" },
    { id: "힐링", icon: "🌿", name: "힐링", desc: "치유와 휴식" },
    { id: "진지한", icon: "🎯", name: "진지한", desc: "집중하는" },
    { id: "즐거운", icon: "😄", name: "즐거운", desc: "재미있고 유쾌한" },
    { id: "감성적인", icon: "🌙", name: "감성적인", desc: "감성적인 분위기" },
    { id: "건강한", icon: "💪", name: "건강한", desc: "활동적이고 건강한" },
    { id: "배움", icon: "📖", name: "배움", desc: "성장과 학습" },
  ];

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const minDate = `${yyyy}-${mm}-${dd}`;

  const now = new Date();
  const minTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const isToday = formData.meetingDate === minDate;

  // ✅ 임시저장 불러오기 (페이지 로드 시)
  useEffect(() => {
    const savedDraft = localStorage.getItem("meetingDraft");

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        console.log("📂 임시저장 데이터 발견:", draft);

        // 임시저장 데이터가 있으면 사용자에게 확인
        const useDraft = window.confirm(
          "💾 임시저장된 모임이 있습니다.\n이어서 작성하시겠습니까?",
        );

        if (useDraft) {
          // 폼 데이터 복원
          setFormData({
            title: draft.title || "",
            category: draft.category || "",
            subcategory: draft.subcategory || "",
            description: draft.description || "",
            meetingDate: draft.meetingDate || "",
            meetingTime: draft.meetingTime || "",
            detailAddress: draft.detailAddress || "",
            maxParticipants: draft.maxParticipants || 10,
            deadline: draft.deadline || "",
            cost: draft.cost || 0,
            supplies: draft.supplies || "",
          });

          // 분위기 복원
          if (draft.selectedVibe) {
            setSelectedVibe(draft.selectedVibe);
          }

          // 장소 복원
          if (draft.selectedLocation) {
            setSelectedLocation(draft.selectedLocation);
          }

          // 태그 복원
          if (draft.tags && Array.isArray(draft.tags)) {
            setTags(draft.tags);
          }

          console.log("✅ 임시저장 데이터 복원 완료!");
          setDraftLoaded(true);
        } else {
          // 사용 안 하면 삭제
          localStorage.removeItem("meetingDraft");
          console.log("🗑️ 임시저장 데이터 삭제됨");
        }
      } catch (error) {
        console.error("❌ 임시저장 데이터 파싱 실패:", error);
        localStorage.removeItem("meetingDraft");
      }
    }
  }, []);

  // ✅ 장소 복원 후 지도 업데이트
  useEffect(() => {
    if (
      draftLoaded &&
      selectedLocation.latitude &&
      selectedLocation.longitude &&
      mapRef.current
    ) {
      const coords = new window.kakao.maps.LatLng(
        selectedLocation.latitude,
        selectedLocation.longitude,
      );

      mapRef.current.setCenter(coords);

      if (markerRef.current) {
        markerRef.current.setMap(null);
      }

      markerRef.current = new window.kakao.maps.Marker({
        position: coords,
        map: mapRef.current,
      });

      console.log("🗺️ 지도 위치 복원 완료");
    }
  }, [draftLoaded, selectedLocation]);

  // 카카오맵 초기화
  useEffect(() => {
    console.log("🗺️ 카카오맵 스크립트 로딩 시작");

    const mapScript = document.createElement("script");
    const apiKey = import.meta.env.VITE_KAKAO_MAP_KEY || "16531d4c245afb546a5c2abcd7da82a4";
    mapScript.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    mapScript.async = true;

    mapScript.onload = () => {
      console.log("✅ 카카오맵 스크립트 로드 완료");
      window.kakao.maps.load(() => {
        console.log("✅ 카카오맵 라이브러리 로드 완료");
        const container = document.getElementById("map");
        console.log("🗺️ 지도 컨테이너:", container);

        if (container) {
          // ✅ 임시저장된 위치가 있으면 그 위치로, 없으면 기본 위치
          const initialLat = selectedLocation.latitude || 37.5665;
          const initialLng = selectedLocation.longitude || 126.978;

          const options = {
            center: new window.kakao.maps.LatLng(initialLat, initialLng),
            level: 3,
          };
          mapRef.current = new window.kakao.maps.Map(container, options);
          console.log("✅ 지도 생성 완료");

          markerRef.current = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(initialLat, initialLng),
            map: mapRef.current,
          });
          console.log("✅ 마커 생성 완료");
        } else {
          console.error("❌ 지도 컨테이너를 찾을 수 없습니다!");
        }
      });
    };

    mapScript.onerror = (error) => {
      console.error("❌ 카카오맵 스크립트 로드 실패:", error);
      console.error("API Key:", apiKey);
    };

    const addrScript = document.createElement("script");
    addrScript.src =
      "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    addrScript.async = true;

    addrScript.onload = () => {
      console.log("✅ Daum 주소 스크립트 로드 완료");
    };

    addrScript.onerror = () => {
      console.error("❌ Daum 주소 스크립트 로드 실패");
    };

    document.head.appendChild(mapScript);
    document.head.appendChild(addrScript);

    return () => {
      if (document.head.contains(mapScript)) {
        document.head.removeChild(mapScript);
      }
      if (document.head.contains(addrScript)) {
        document.head.removeChild(addrScript);
      }
    };
  }, []);

  // 입력 핸들러
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "category") {
        return { ...prev, category: value, subcategory: "" };
      }

      if (name === "cost") {
        const numValue = value === "" ? 0 : parseInt(value);
        return { ...prev, cost: Math.max(0, numValue || 0) };
      }

      return { ...prev, [name]: value };
    });
  };

  // 분위기 선택
  const handleVibeSelect = (vibeId: string) => {
    setSelectedVibe(vibeId);
  };

  // Daum 주소 검색 API 팝업
    const handleLocationSearch = () => {
        new (window as any).daum.Postcode({
            oncomplete: function (data: any) {
                const fullAddress = data.address;
                const roadAddress = data.roadAddress;
                const selectedAddr = roadAddress || fullAddress;

                // 💡 Geocoder를 사용하기 전에 라이브러리가 로드되었는지 확실히 확인합니다.
                window.kakao.maps.load(() => {
                    if (!window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
                        console.error("❌ 카카오맵 서비스 라이브러리가 로드되지 않았습니다.");
                        return;
                    }

                    const geocoder = new window.kakao.maps.services.Geocoder();

                    geocoder.addressSearch(selectedAddr, function (result: any, status: any) {
                        if (status === window.kakao.maps.services.Status.OK) {
                            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

                            setSelectedLocation({
                                name: data.buildingName || selectedAddr,
                                address: selectedAddr,
                                latitude: parseFloat(result[0].y),
                                longitude: parseFloat(result[0].x),
                            });

                            if (mapRef.current) {
                                mapRef.current.setCenter(coords);
                                if (markerRef.current) markerRef.current.setMap(null);
                                markerRef.current = new window.kakao.maps.Marker({
                                    position: coords,
                                    map: mapRef.current,
                                });
                            }
                        }
                    });
                });
            },
        }).open();
    };

  // 태그 추가
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (tags.length >= 10) {
        alert("태그는 최대 10개까지 추가할 수 있습니다.");
        return;
      }
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // 태그 삭제
  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // 이미지 업로드
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("파일 크기는 10MB 이하만 가능합니다.");
        return;
      }
      setUploadedImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ 임시저장 (개선)
  const handleSaveDraft = () => {
    const draft = {
      ...formData,
      selectedVibe,
      selectedLocation,
      tags,
    };
    localStorage.setItem("meetingDraft", JSON.stringify(draft));
    console.log("💾 임시저장 완료:", draft);
    alert(
      "💾 임시저장되었습니다!\n다음에 모임 만들기에 들어오면 이어서 작성할 수 있어요.",
    );
  };

  // ✅ 임시저장 삭제
  const handleClearDraft = () => {
    if (window.confirm("임시저장된 내용을 삭제하시겠습니까?")) {
      localStorage.removeItem("meetingDraft");
      setFormData({
        title: "",
        category: "",
        subcategory: "",
        description: "",
        meetingDate: "",
        meetingTime: "",
        detailAddress: "",
        maxParticipants: 10,
        deadline: "",
        cost: 0,
        supplies: "",
      });
      setSelectedVibe("");
      setSelectedLocation({
        name: "",
        latitude: 37.5665,
        longitude: 126.978,
        address: "",
      });
      setTags([]);
      alert("🗑️ 임시저장이 삭제되었습니다.");
    }
  };

  // 제출
  const handleSubmit = async () => {
    if (!formData.title) {
      alert("모임 제목을 입력해주세요!");
      return;
    }
    if (!formData.category) {
      alert("카테고리를 선택해주세요!");
      return;
    }
    if (!formData.subcategory) {
      alert("서브카테고리를 선택해주세요!");
      return;
    }
    if (!selectedVibe) {
      alert("모임 분위기를 선택해주세요!");
      return;
    }
    if (!formData.meetingDate || !formData.meetingTime) {
      alert("모임 날짜와 시간을 입력해주세요!");
      return;
    }
    if (!selectedLocation.name) {
      alert("모임 장소를 선택해주세요!");
      return;
    }

    setLoading(true);

    try {
      const hour = parseInt(formData.meetingTime.split(":")[0]);
      let timeSlot = "EVENING";
      if (hour >= 6 && hour < 12) timeSlot = "MORNING";
      else if (hour >= 12 && hour < 18) timeSlot = "AFTERNOON";
      else if (hour >= 18 && hour < 24) timeSlot = "EVENING";
      else timeSlot = "NIGHT";

      const requestData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory,
        meetingTime: `${formData.meetingDate}T${formData.meetingTime}:00`,
        locationName: selectedLocation.name,
        locationAddress: formData.detailAddress
          ? `${selectedLocation.address} (${formData.detailAddress})`
          : selectedLocation.address,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        maxParticipants: formData.maxParticipants,
        expectedCost: formData.cost,
        locationType: "OUTDOOR",
        vibe: selectedVibe,
        timeSlot: timeSlot,
        tags: JSON.stringify(tags),
      };

        const response = await api.post("/meetings", requestData);

      // ✅ 모임 생성 성공 시 임시저장 삭제!
      localStorage.removeItem("meetingDraft");
      console.log("🗑️ 모임 생성 완료 → 임시저장 삭제");

      const { chatRoomId } = response.data;
        toast.success("🎉 모임이 생성되었습니다!");

        // 성공 페이지로 제목과 생성된 톡방 ID를 넘겨줍니다.
        navigate(`/social/chat/success?title=${encodeURIComponent(formData.title)}&roomId=${chatRoomId}`);

    } catch (error: any) {
        console.error("모임 생성 실패:", error);

        if (error.response?.status === 401) {
            alert("세션이 만료되었습니다. 다시 로그인해주세요.");
            navigate("/login");
        } else {
            alert("모임 생성에 실패했습니다. 입력 정보를 확인해주세요.");
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="meeting-create-page">
      {/* 헤더 */}
      <header className="header">
        <div className="header-wrapper">
          <div className="header-content">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                onClick={() => navigate(-1)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                  padding: "0.5rem",
                  minWidth: "40px",
                }}
              >
                ←
              </button>
              <h1
                style={{
                  fontSize: "1.15rem",
                  fontWeight: "700",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                모임 만들기
              </h1>
            </div>

            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <h1
                onClick={() => navigate("/meetings")}
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "800",
                  margin: 0,
                  cursor: "pointer",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                IT-DA
              </h1>
            </div>

            {/* ✅ 임시저장 버튼들 */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleSaveDraft}
                style={{
                  padding: "0.55rem 1.1rem",
                  background: "white",
                  border: "1.5px solid #dadce0",
                  borderRadius: "8px",
                  fontWeight: "500",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                💾 임시저장
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨테이너 */}
      <div className="container" style={{ maxWidth: "1400px", width: "50%" }}>
        {/* 기본 정보 */}
        <section className="form-section">
          <h2 className="section-title">📝 기본 정보</h2>

          <div className="form-group">
            <label className="form-label">
              모임 제목 <span className="required">*</span>
            </label>
            <input
              type="text"
              name="title"
              className="form-input"
              placeholder="예: 한강 선셋 러닝 🌅"
              value={formData.title}
              onChange={handleChange}
            />
            <p className="helper-text">30자 이내로 간결하게 작성해주세요</p>
          </div>

          <div className="form-group">
            <label className="form-label">
              카테고리 / 서브카테고리 <span className="required">*</span>
            </label>

            <div className="category-grid">
              <select
                name="category"
                className="form-select"
                value={formData.category}
                onChange={handleChange}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                name="subcategory"
                className="form-select"
                value={formData.subcategory}
                onChange={handleChange}
                disabled={!formData.category}
              >
                <option value="">
                  {formData.category
                    ? "서브카테고리를 선택하세요"
                    : "카테고리를 먼저 선택하세요"}
                </option>
                {(subcategoryMap[formData.category] ?? []).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <p className="helper-text">
              카테고리를 선택하면 세부 항목이 자동으로 바뀝니다
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">모임 소개</label>
            <textarea
              name="description"
              className="form-textarea"
              placeholder="어떤 모임인지 자세히 설명해주세요&#10;&#10;예시:&#10;- 모임의 목적&#10;- 어떤 사람들이 오면 좋을지&#10;- 특별히 준비해야 할 것"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">모임 대표 이미지</label>
            <div className="image-upload-wrapper">
              <input
                type="file"
                id="imageUpload"
                className="image-input"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageUpload}
              />
              <label htmlFor="imageUpload" className="image-upload-label">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="미리보기" />
                  </div>
                ) : (
                  <div className="image-upload-placeholder">
                    <div className="upload-icon">📷</div>
                    <p className="upload-text">클릭해서 이미지 업로드</p>
                    <p className="upload-hint">JPG, PNG 파일 (최대 10MB)</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </section>

        {/* 일시 및 장소 */}
        <section className="form-section">
          <h2 className="section-title">📍 일시 및 장소</h2>

          <div className="form-group">
            <label className="form-label">
              모임 날짜 및 시간 <span className="required">*</span>
            </label>
            <div className="datetime-grid">
              <input
                type="date"
                name="meetingDate"
                className="form-input"
                value={formData.meetingDate}
                min={minDate}
                onChange={handleChange}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "0.5rem",
                }}
              >
                {/* 오전/오후 */}
                <select
                  className="form-select"
                  value={
                    formData.meetingTime
                      ? parseInt(formData.meetingTime.split(":")[0]) < 12
                        ? "AM"
                        : "PM"
                      : ""
                  }
                  onChange={(e) => {
                    const currentTime = formData.meetingTime || "00:00";
                    const [oldHour, minute] = currentTime.split(":");
                    let hour = parseInt(oldHour);

                    if (e.target.value === "PM" && hour < 12) {
                      hour += 12;
                    } else if (e.target.value === "AM" && hour >= 12) {
                      hour -= 12;
                    }

                    setFormData((prev) => ({
                      ...prev,
                      meetingTime: `${String(hour).padStart(2, "0")}:${minute}`,
                    }));
                  }}
                >
                  <option value="" disabled hidden>
                    오전 오후
                  </option>
                  <option value="AM">오전</option>
                  <option value="PM">오후</option>
                </select>

                {/* 시 */}
                <select
                  className="form-select"
                  value={
                    formData.meetingTime
                      ? String(
                          parseInt(formData.meetingTime.split(":")[0]) % 12 ||
                            12,
                        )
                      : ""
                  }
                  onChange={(e) => {
                    const currentTime = formData.meetingTime || "00:00";
                    const [oldHour, minute] = currentTime.split(":");
                    const isPM = parseInt(oldHour) >= 12;
                    let hour = parseInt(e.target.value);

                    if (isPM && hour !== 12) hour += 12;
                    if (!isPM && hour === 12) hour = 0;

                    setFormData((prev) => ({
                      ...prev,
                      meetingTime: `${String(hour).padStart(2, "0")}:${minute}`,
                    }));
                  }}
                >
                  <option value="" disabled hidden>
                    시
                  </option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}시
                    </option>
                  ))}
                </select>

                {/* 분 (10분 단위) */}
                <select
                  className="form-select"
                  value={
                    formData.meetingTime
                      ? formData.meetingTime.split(":")[1]
                      : ""
                  }
                  onChange={(e) => {
                    const currentTime = formData.meetingTime || "00:00";
                    const hour = currentTime.split(":")[0];

                    setFormData((prev) => ({
                      ...prev,
                      meetingTime: `${hour}:${e.target.value}`,
                    }));
                  }}
                >
                  <option value="" disabled hidden>
                    분
                  </option>
                  <option value="00">00분</option>
                  <option value="10">10분</option>
                  <option value="20">20분</option>
                  <option value="30">30분</option>
                  <option value="40">40분</option>
                  <option value="50">50분</option>
                </select>
              </div>
            </div>
            <p className="helper-text">
              모임을 진행할 날짜와 시작 시간을 선택해주세요
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              모임 장소 <span className="required">*</span>
            </label>
            <div className="location-search">
              <button
                type="button"
                className="address-search-btn"
                onClick={handleLocationSearch}
              >
                📍 주소 검색
              </button>

              {selectedLocation.address && (
                <div className="selected-location">
                  <div className="selected-badge">
                    <strong>✅ {selectedLocation.name}</strong>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        marginTop: "0.3rem",
                        opacity: 0.9,
                      }}
                    >
                      {selectedLocation.address}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">상세 주소 / 만날 장소</label>
            <input
              type="text"
              name="detailAddress"
              className="form-input"
              placeholder="예: 물빛광장 분수대 앞"
              value={formData.detailAddress}
              onChange={handleChange}
            />
            <p className="helper-text">구체적인 만남 장소를 입력해주세요</p>
          </div>
        </section>

        {/* 카카오 지도 - 별도 섹션 */}
        <section className="form-section">
          <h2 className="section-title">🗺️ 지도</h2>
          <div id="map" className="map-container"></div>
        </section>

        {/* 모임 분위기 */}
        <section className="form-section">
          <h2 className="section-title">
            ✨ 모임 분위기 <span className="required">*</span>
          </h2>
          <p className="helper-text" style={{ marginBottom: "1rem" }}>
            이 모임의 전체적인 분위기를 선택해주세요
          </p>

          <div className="vibe-options">
            {vibeOptions.map((vibe) => (
              <div
                key={vibe.id}
                className={`vibe-option ${selectedVibe === vibe.id ? "selected" : ""}`}
                onClick={() => handleVibeSelect(vibe.id)}
              >
                <div className="vibe-icon">{vibe.icon}</div>
                <div className="vibe-name">{vibe.name}</div>
                <div className="vibe-desc">{vibe.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 참여 설정 */}
        <section className="form-section">
          <h2 className="section-title">👥 참여 설정</h2>

          <div className="form-group">
            <label className="form-label">
              최대 인원 <span className="required">*</span>
            </label>
            <div className="slider-container">
              <input
                type="range"
                name="maxParticipants"
                className="slider"
                min="2"
                max="50"
                value={formData.maxParticipants}
                onChange={handleChange}
              />
              <span className="slider-value">{formData.maxParticipants}명</span>
            </div>
            <p className="helper-text">최소 2명 ~ 최대 50명까지 설정 가능</p>
          </div>

          <div className="form-group">
            <label className="form-label">모집 마감일</label>
            <input
              type="date"
              name="deadline"
              className="form-input"
              value={formData.deadline}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* 추가 정보 */}
        <section className="form-section">
          <h2 className="section-title">➕ 추가 정보</h2>

          <div className="form-group">
            <label className="form-label">예상 비용 (1인 기준)</label>
            <input
              type="number"
              name="cost"
              className="form-input"
              placeholder="0"
              min="0"
              value={formData.cost}
              onChange={handleChange}
            />
            <p className="helper-text">
              참가비, 재료비 등 예상되는 비용을 입력해주세요 (무료면 0)
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">태그</label>
            <div
              className="tag-container"
              onClick={() => document.getElementById("tagInput")?.focus()}
            >
              {tags.map((tag, index) => (
                <div key={index} className="tag-item">
                  #{tag}
                  <span
                    className="tag-remove"
                    onClick={() => handleRemoveTag(index)}
                  >
                    ×
                  </span>
                </div>
              ))}
              <input
                id="tagInput"
                type="text"
                className="tag-input"
                placeholder="태그 입력 후 Enter (최대 10개)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
            </div>
            <p className="helper-text">
              모임을 잘 나타내는 태그를 추가해주세요
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">준비물</label>
            <textarea
              name="supplies"
              className="form-textarea"
              placeholder="예: 운동화, 물, 간단한 간식"
              value={formData.supplies}
              onChange={handleChange}
            />
          </div>
        </section>
      </div>

      {/* 하단 고정 완료 버튼 */}
      <div className="submit-footer">
        <div className="submit-container">
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "⏳ 생성 중..." : "🎉 모임 만들기 완료!"}
          </button>
          <p className="submit-helper">
            모임을 만들면 자동으로 톡방이 생성됩니다
          </p>
        </div>
      </div>
    </div>
  );
};

export default MeetingCreatePage;
