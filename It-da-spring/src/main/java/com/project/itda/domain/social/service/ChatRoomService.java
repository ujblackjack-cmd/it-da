package com.project.itda.domain.social.service;

import com.project.itda.domain.social.dto.response.ChatParticipantResponse;
import com.project.itda.domain.social.dto.response.ChatRoomResponse; // ✅ 추가
import com.project.itda.domain.social.entity.ChatParticipant;
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.social.enums.ChatRole;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.repository.ChatRoomRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ChatRoomService {
    private final ChatRoomRepository chatRoomRepository;
    private final ChatParticipantRepository chatParticipantRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatRoom createChatRoom(String name) {
        ChatRoom chatRoom = ChatRoom.builder()
                .roomName(name)
                .isActive(true)
                .build();
        return chatRoomRepository.save(chatRoom);
    }

    // ✅ 방 생성 후 DTO로 즉시 변환하여 반환
    @Transactional
    public ChatRoomResponse createChatRoomWithResponse(String name, String email) {
        // 1. 방 생성자 정보 조회
        User creator = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 2. 채팅방 생성 및 저장
        ChatRoom chatRoom = ChatRoom.builder()
                .roomName(name)
                .isActive(true)
                .build();
        ChatRoom savedRoom = chatRoomRepository.save(chatRoom);

        // 3. ✅ 방 생성자를 'HOST' 역할로 참여자 테이블에 저장 (이게 없으면 목록이 빕니다)
        ChatParticipant participant = ChatParticipant.builder()
                .chatRoom(savedRoom)
                .user(creator)
                .role(ChatRole.ORGANIZER)
                .joinedAt(java.time.LocalDateTime.now())
                .build();
        chatParticipantRepository.save(participant);

        return convertToResponse(savedRoom);
    }

    // ✅ 모든 방을 DTO 리스트로 변환하여 반환 (순환 참조 방지 핵심)
    public List<ChatRoomResponse> findAllRoomsAsResponse() {
        return chatRoomRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // ✅ Entity -> DTO 변환 헬퍼 메서드
    private ChatRoomResponse convertToResponse(ChatRoom room) {
        return ChatRoomResponse.builder()
                .chatRoomId(room.getId())
                .roomName(room.getRoomName())
                .participantCount(room.getParticipants() != null ? room.getParticipants().size() : 0)
                .maxParticipants(10) // 기본값 설정 (추후 Meeting 연동 권장)
                .lastMessage("최근 메시지가 없습니다.") // 추후 Message 연동
                .category("일반") // 기본값 설정
                .build();
    }

    public List<ChatRoom> findAllRooms() {
        return chatRoomRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<ChatParticipantResponse> getParticipantList(Long roomId) {
        // 1. 방 조회
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));

        System.out.println("참여자 수: " + room.getParticipants().size());

        // 2. 참여자 엔티티 리스트를 DTO 리스트로 변환 (순환 참조 방지)
        return room.getParticipants().stream()
                .map(participant -> ChatParticipantResponse.builder()
                        .userId(participant.getUser().getUserId())
                        .username(participant.getUser().getUsername())
                        .nickname(participant.getUser().getNickname())
                        .email(participant.getUser().getEmail())
                        .profileImageUrl(participant.getUser().getProfileImageUrl())
                        .role(participant.getRole().name())
                        .build())
                .toList();
    }
}