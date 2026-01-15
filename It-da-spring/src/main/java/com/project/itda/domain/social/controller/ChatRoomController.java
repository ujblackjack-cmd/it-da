package com.project.itda.domain.social.controller;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.social.dto.response.ChatParticipantResponse;
import com.project.itda.domain.social.dto.response.ChatRoomResponse; // ✅ 추가
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.social.service.ChatRoomService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/social/chat")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;
    private final HttpSession httpSession;

    // ✅ 방 생성 로직도 DTO로 반환하면 프론트에서 다루기 더 쉽습니다.
    @PostMapping("/rooms")
    public ResponseEntity<ChatRoomResponse> createRoom(@RequestBody Map<String, String> params) {
        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).build();

        String roomName = params.get("roomName");

        ChatRoomResponse response = chatRoomService.createChatRoomWithResponse(roomName, user.getEmail());

        return ResponseEntity.ok(response);
    }

    // ✅ 핵심 수정 부분: List<ChatRoom> 대신 List<ChatRoomResponse> 반환
    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomResponse>> getRooms() {
        // chatRoomService에서 findAllRooms() 결과를 DTO 리스트로 변환해주는 메서드를 호출합니다.
        List<ChatRoomResponse> rooms = chatRoomService.findAllRoomsAsResponse();
        return ResponseEntity.ok(rooms);
    }
    @PostMapping("/rooms/{roomId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long roomId) {
        // 세션 유저 정보를 가져와서 해당 방의 마지막 읽은 시간 업데이트 로직
        return ResponseEntity.ok().build();
    }
    @GetMapping("/rooms/{roomId}/members")
    public ResponseEntity<List<ChatParticipantResponse>> getRoomMembers(@PathVariable Long roomId) {
        List<ChatParticipantResponse> members = chatRoomService.getParticipantList(roomId);
        return ResponseEntity.ok(members);
    }
}