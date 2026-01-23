package com.project.itda.domain.social.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ChatRoomListResponse {
    private List<ChatRoomResponse> myRooms;      // 내가 참여 중인 방
    private List<ChatRoomResponse> allRooms;     // 서버의 전체 방 (또는 추천 방)
}
