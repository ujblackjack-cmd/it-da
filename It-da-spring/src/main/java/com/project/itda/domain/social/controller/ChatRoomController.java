package com.project.itda.domain.social.controller;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.social.dto.response.ChatParticipantResponse;
import com.project.itda.domain.social.dto.response.ChatRoomResponse; // ✅ 추가
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

        // 프론트엔드에서 보낸 다양한 정보 추출
        String roomName = (String) params.get("roomName");
        Object maxPartObj = params.get("maxParticipants");
        Integer maxParticipants = (maxPartObj instanceof Integer) ? (Integer) maxPartObj : 10;
        String description = (String) params.get("description");
        String location = (String) params.get("location");
        String category = (String) params.get("category");

        // ChatRoomService에 해당 정보들을 전달하여 생성 (Service 메서드 확장 필요)
        // 기존 createChatRoomWithResponse 메서드를 오버로딩하거나 파라미터를 추가하여 호출합니다.
        ChatRoomResponse response = chatRoomService.createChatRoomWithAllInfo(
                roomName, user.getEmail(), maxParticipants, description, location, category
        );

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
        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        if (user != null) {
            chatRoomService.updateLastReadAt(roomId, user.getEmail());
            return ResponseEntity.ok().build();
        }
        // 세션 유저 정보를 가져와서 해당 방의 마지막 읽은 시간 업데이트 로직
        return ResponseEntity.status(401).build();
    }
    @GetMapping("/rooms/{roomId}/members")
    public ResponseEntity<List<ChatParticipantResponse>> getRoomMembers(
            @PathVariable Long roomId,
            HttpSession httpSession // ✅ 세션 사용을 위해 추가
    ) {
        // 1. 현재 로그인한 유저 정보 가져오기
        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        Long currentUserId = (user != null) ? user.getUserId() : null;

        // 2. 서비스에 roomId와 내 ID를 같이 전달
        List<ChatParticipantResponse> members = chatRoomService.getParticipantList(roomId, currentUserId);

        return ResponseEntity.ok(members);
    }
    @GetMapping("/my-rooms")
    public ResponseEntity<List<ChatRoomResponse>> getMyRooms() {
        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).build();

        // 서비스에서 구현한 findMyRooms 호출
        List<ChatRoomResponse> myRooms = chatRoomService.findMyRooms(user.getEmail());
        return ResponseEntity.ok(myRooms);
    }
    @PutMapping("/rooms/{roomId}/notice")
    public ResponseEntity<Void> updateNotice(
            @PathVariable Long roomId,
            @RequestBody Map<String, String> request
    ) {
        String notice = request.get("notice");
        chatRoomService.updateNotice(roomId, notice);
        return ResponseEntity.ok().build();
    }
    @GetMapping("/users/search")
    public ResponseEntity<List<ChatParticipantResponse>> searchUsers(
            @RequestParam(value = "keyword", required = false) String keyword
    ) {
        // ✅ 1. 내 ID 가져오기 (팔로우 여부 확인용)
        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        Long currentUserId = (user != null) ? user.getUserId() : null;

        // ✅ 2. 서비스 호출 시 인자 2개 전달 (keyword, currentUserId)
        // 기존: chatRoomService.searchUsers(keyword);  <-- 에러 원인 (인자 1개)
        return ResponseEntity.ok(chatRoomService.searchUsers(keyword, currentUserId));
    }

    // ✅ [추가] 멤버 초대 API
    @PostMapping("/rooms/{roomId}/invite")
    public ResponseEntity<Void> inviteUser(
            @PathVariable Long roomId,
            @RequestBody Map<String, Long> request // { "userId": 123 }
    ) {
        Long targetUserId = request.get("userId");
        chatRoomService.inviteMember(roomId, targetUserId);
        return ResponseEntity.ok().build();
    }
}