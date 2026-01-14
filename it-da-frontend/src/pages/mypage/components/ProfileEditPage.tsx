import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '../../../api/client';
import './ProfileEditPage.css';

const INTERESTS = [
    '운동', '음악', '영화', '독서', '요리', '여행', '게임', '사진',
    '미술', '댄스', '등산', '캠핑', '낚시', '자전거', '러닝', '요가',
    '카페', '맛집', '패션', '뷰티', 'IT/개발', '투자', '언어', '봉사'
];

const REGIONS = [
    '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
    '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원도',
    '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도'
];

const DISTRICTS: { [key: string]: string[] } = {
    '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '경기도': ['수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '광명시', '김포시', '군포시', '광주시', '이천시', '양주시', '오산시', '구리시', '안성시', '포천시', '의왕시', '하남시', '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군'],
};

const MBTI_TYPES = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
];

const ProfileEditPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, setUser } = useAuthStore();
    const userId = user?.userId || 44;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [showRegionModal, setShowRegionModal] = useState(false);
    const [showMbtiModal, setShowMbtiModal] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState('');

    const [profileData, setProfileData] = useState({
        username: '',
        bio: '',
        gender: '',
        address: '',
        profileImageUrl: '',
        mbti: '',

    });
    const [previewImage, setPreviewImage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await apiClient.get(`/api/users/${userId}`);
                const data = response.data;
                setProfileData({
                    username: data.username || '',
                    bio: data.bio || '',
                    gender: data.gender || '',
                    address: data.address || '',
                    profileImageUrl: data.profileImageUrl || '',
                    mbti: data.mbti || '',
                });
                setPreviewImage(data.profileImageUrl || '');
            } catch (e) {
                console.error('프로필 조회 실패:', e);
            }
        };
        fetchProfile();
    }, [userId]);

    const handleImageClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setPreviewImage(reader.result as string);
        reader.readAsDataURL(file);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiClient.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setProfileData(prev => ({ ...prev, profileImageUrl: response.data.url }));
        } catch (error) {
            alert('이미지 업로드 실패');
        }
    };

    const handleChange = (field: string, value: string) => {
        setProfileData(prev => ({ ...prev, [field]: value }));
    };

    const handleRegionSelect = (region: string, district?: string) => {
        const fullAddress = district ? `${region} ${district}` : region;
        handleChange('address', fullAddress);
        setShowRegionModal(false);
        setSelectedRegion('');
    };

    const handleSave = async () => {
        if (!profileData.username.trim()) {
            alert('이름을 입력해주세요.');
            return;
        }
        setLoading(true);
        try {
            await apiClient.put(`/api/users/${userId}`, profileData);
            setUser({ ...user!, ...profileData });
            alert('프로필이 수정되었습니다!');
            navigate('/my-meetings');
        } catch (e) {
            alert('프로필 수정 실패');
        } finally {
            setLoading(false);
        }
    };

    const getImageSrc = (url: string) => {
        if (!url) return '';
        if (url.startsWith('data:') || url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    return (
        <div className="profile-edit-page">
            <header className="profile-edit-header">
                <button className="header-btn" onClick={() => navigate(-1)}>←</button>
                <h1>프로필 편집</h1>
                <button className="header-btn save" onClick={handleSave} disabled={loading}>
                    {loading ? '...' : '완료'}
                </button>
            </header>

            <div className="profile-image-section">
                <div className="profile-image-wrapper" onClick={handleImageClick}>
                    {previewImage ? (
                        <img src={getImageSrc(previewImage)} alt="프로필" className="profile-image" />
                    ) : (
                        <div className="profile-image-placeholder">👤</div>
                    )}
                    <div className="camera-icon">📷</div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>

            <div className="profile-form">
                <div className="form-row">
                    <label>이름</label>
                    <input type="text" value={profileData.username} onChange={(e) => handleChange('username', e.target.value)} placeholder="이름을 입력해 주세요" />
                </div>

                <div className="form-row">
                    <label>소개</label>
                    <textarea value={profileData.bio} onChange={(e) => handleChange('bio', e.target.value)} placeholder="소개를 입력해 주세요" maxLength={40} />
                    <span className="char-count">{profileData.bio.length} / 40 자</span>
                </div>

                <div className="form-row">
                    <label>MBTI</label>
                    <div className="select-box" onClick={() => setShowMbtiModal(true)}>
                        {profileData.mbti || 'MBTI를 선택해 주세요'}
                    </div>
                </div>

                <div className="divider"></div>

                <div className="form-row">
                    <label>지역</label>
                    <div className="select-box" onClick={() => setShowRegionModal(true)}>
                        {profileData.address || '지역을 선택해 주세요'}
                    </div>
                </div>

                <div className="form-row">
                    <label>성별</label>
                    <div className="gender-selector">
                        <button className={`gender-btn ${profileData.gender === 'M' ? 'active' : ''}`} onClick={() => handleChange('gender', 'M')}>남</button>
                        <button className={`gender-btn ${profileData.gender === 'F' ? 'active' : ''}`} onClick={() => handleChange('gender', 'F')}>여</button>
                    </div>
                </div>
            </div>

            {/* 지역 선택 모달 */}
            {showRegionModal && (
                <div className="modal-overlay" onClick={() => { setShowRegionModal(false); setSelectedRegion(''); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <button onClick={() => { setShowRegionModal(false); setSelectedRegion(''); }}>✕</button>
                            <h2>{selectedRegion || '내 지역'}</h2>
                            <span></span>
                        </div>
                        <p className="modal-desc">집, 직장 인근의 모임을 찾습니다.</p>
                        <div className="region-list">
                            {!selectedRegion ? (
                                REGIONS.map(r => (
                                    <div key={r} className="region-item" onClick={() => DISTRICTS[r] ? setSelectedRegion(r) : handleRegionSelect(r)}>
                                        {r} {DISTRICTS[r] && '›'}
                                    </div>
                                ))
                            ) : (
                                DISTRICTS[selectedRegion]?.map(d => (
                                    <div key={d} className="region-item" onClick={() => handleRegionSelect(selectedRegion, d)}>{d}</div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MBTI 선택 모달 */}
            {showMbtiModal && (
                <div className="modal-overlay" onClick={() => setShowMbtiModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <button onClick={() => setShowMbtiModal(false)}>✕</button>
                            <h2>MBTI 선택</h2>
                            <span></span>
                        </div>
                        <div className="mbti-grid">
                            {MBTI_TYPES.map(m => (
                                <button key={m} className={`mbti-btn ${profileData.mbti === m ? 'active' : ''}`} onClick={() => { handleChange('mbti', m); setShowMbtiModal(false); }}>{m}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileEditPage;