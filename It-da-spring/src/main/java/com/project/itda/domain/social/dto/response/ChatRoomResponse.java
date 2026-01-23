package com.project.itda.domain.social.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class ChatRoomResponse {
    private Long chatRoomId;      // 채팅방 ID
    private String roomName;       // 채팅방 이름
    private int participantCount;  // 현재 참여 인원 수
    private int maxParticipants;   // [추가] 최대 인원 (예: 2/10명 표시용)
    private String lastMessage;    // 마지막 메시지 내용
    private LocalDateTime lastMessageTime; // [추가] 마지막 메시지 시간 (목록 정렬용)
    private String category;       // [추가] 카테고리 (스포츠, 맛집 등 - 배지 표시용)
    private String imageUrl;       // [추가] 채팅방 대표 이미지 URL
    private String locationName;   // [추가] 장소명 (예: "강남역 스터디룸")


}