import React, { useState } from 'react';
import './ProfileEditModal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentUsername: string;
    onSave: (newUsername: string) => Promise<void>;
}

const ProfileEditModal: React.FC<Props> = ({ isOpen, onClose, currentUsername, onSave }) => {
    const [username, setUsername] = useState(currentUsername);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!username.trim()) {
            alert('이름을 입력해주세요.');
            return;
        }
        setLoading(true);
        try {
            await onSave(username);
            onClose();
        } catch (e) {
            alert('저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>프로필 수정</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <label className="input-label">이름</label>
                    <input
                        type="text"
                        className="input-field"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="이름을 입력하세요"
                    />
                </div>
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>취소</button>
                    <button className="btn-save" onClick={handleSave} disabled={loading}>
                        {loading ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditModal;