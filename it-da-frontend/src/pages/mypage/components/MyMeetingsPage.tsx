import React from "react";
import "./MyMeetings.css";
import { MyMeeting } from "../../../api/mypage.api";

interface Props {
  upcoming: MyMeeting[];
  completed: MyMeeting[];
  onOpenChat?: (chatRoomId: number) => void;
  // ✅ meetingTitle 추가
  onOpenReview?: (meetingId: number, meetingTitle: string) => void;
}

const calcDDay = (dateTime: string) => {
  const target = new Date(dateTime).getTime();
  const now = new Date().getTime();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (isNaN(diff)) return null;
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-DAY";
  return `D+${Math.abs(diff)}`;
};

const formatDateTime = (dateTime: string) => {
  const d = new Date(dateTime);
  if (isNaN(d.getTime())) return dateTime;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
};

const MyMeetingsPage: React.FC<Props> = ({
  upcoming,
  completed,
  onOpenChat,
  onOpenReview,
}) => {
  return (
    <div className="my-meetings">
      <h3 className="meetings-title">💚 진행 예정 모임</h3>

      {upcoming.length === 0 ? (
        <div className="empty-block">예정된 모임이 없습니다.</div>
      ) : (
        <div className="meeting-grid">
          {upcoming.map((m) => {
            const dday = calcDDay(m.dateTime);
            return (
              <div key={m.meetingId} className="meeting-card">
                <div className="meeting-image">
                  <div className="meeting-status status-upcoming">
                    {dday ?? m.statusText}
                  </div>
                </div>

                <div className="meeting-content">
                  <h4 className="meeting-title">{m.meetingTitle}</h4>
                  <p className="meeting-date">{formatDateTime(m.dateTime)}</p>

                  <div className="meeting-footer">
                    <span className="meeting-location">📍 {m.location}</span>
                    <button
                      className="meeting-btn"
                      type="button"
                      onClick={() => {
                        if (m.chatRoomId) {
                          onOpenChat?.(m.chatRoomId);
                        } else {
                          console.error(
                            "❌ 이 모임의 chatRoomId가 없습니다:",
                            m,
                          );
                        }
                      }}
                    >
                      톡방
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="meetings-title completed-title">✅ 완료된 모임</h3>

      {completed.length === 0 ? (
        <div className="empty-block">완료된 모임이 없습니다.</div>
      ) : (
        <div className="meeting-grid">
          {completed.map((m) => (
            <div key={m.meetingId} className="meeting-card">
              <div className="meeting-image">
                <div className="meeting-status status-completed">
                  {m.statusText || "완료"}
                </div>
              </div>

              <div className="meeting-content">
                <h4 className="meeting-title">{m.meetingTitle}</h4>
                <p className="meeting-date">{formatDateTime(m.dateTime)}</p>

                <div className="meeting-footer">
                  <div className="meeting-rating">
                    ⭐ {Number(m.averageRating || 0).toFixed(1)}
                  </div>
                  <button
                    className="meeting-btn"
                    type="button"
                    // ✅ meetingTitle 추가 전달
                    onClick={() => onOpenReview?.(m.meetingId, m.meetingTitle)}
                  >
                    {m.hasMyReview ? "리뷰 보기" : "리뷰 쓰기"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyMeetingsPage;
