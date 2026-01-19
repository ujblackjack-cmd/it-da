import React from "react";
import "./UserSelectionModal.css";

interface UserCandidate {
  userId: number;
  username: string;
  email: string;
  profileImageUrl?: string;
  isPublic?: boolean;
}

interface UserSelectionModalProps {
  isOpen: boolean;
  candidates: UserCandidate[];
  onSelect: (userId: number) => void;
  onClose: () => void;
}

const UserSelectionModal: React.FC<UserSelectionModalProps> = ({
  isOpen,
  candidates,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  const getProfileImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `http://localhost:8080${url}`;
  };

  return (
    <div className="user-selection-modal-overlay" onClick={onClose}>
      <div
        className="user-selection-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>사용자 선택</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            동일한 이메일 앞부분을 가진 사용자가 여러 명 있습니다.
            <br />
            확인하려는 사용자를 선택해주세요.
          </p>

          <div className="candidates-list">
            {candidates.map((candidate) => {
              const imageUrl = getProfileImageUrl(candidate.profileImageUrl);

              return (
                <div
                  key={candidate.userId}
                  className="candidate-item"
                  onClick={() => onSelect(candidate.userId)}
                >
                  <div className="candidate-avatar">
                    {imageUrl ? (
                      <img src={imageUrl} alt={candidate.username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {candidate.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!candidate.isPublic && (
                      <span className="private-badge-small">🔒</span>
                    )}
                  </div>

                  <div className="candidate-info">
                    <div className="candidate-name">{candidate.username}</div>
                    <div className="candidate-email">{candidate.email}</div>
                  </div>

                  <div className="candidate-arrow">›</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSelectionModal;
