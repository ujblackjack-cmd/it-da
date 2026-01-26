import React from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/useUIStore";
import ChatRoomListModal from "@/pages/chat/ChatRoomListModal";
import "./Header.css";

interface HeaderProps {
  showNav?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showNav = true }) => {
  const navigate = useNavigate();
  const { isChatListModalOpen, openChatListModal, closeChatListModal } =
    useUIStore();

  return (
    <>
      <header className="common-header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate("/")}>
            IT-DA
          </div>
          {showNav && (
            <nav className="nav-menu">
              <div className="nav-item" onClick={() => navigate("/meetings")}>
                모임 찾기
              </div>
              <div className="nav-item" onClick={openChatListModal}>
                모임톡
              </div>
              <div className="nav-item" onClick={() => navigate("/mypage")}>
                마이페이지
              </div>
            </nav>
          )}
        </div>
      </header>

      <ChatRoomListModal
        isOpen={isChatListModalOpen}
        onClose={closeChatListModal}
      />
    </>
  );
};

export default Header;
