package com.project.itda.domain.social.service;

import com.project.itda.domain.social.dto.response.ChatParticipantResponse;
import com.project.itda.domain.social.dto.response.ChatRoomResponse; // ✅ 추가
import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.entity.ChatParticipant;
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.social.enums.ChatRole;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.repository.ChatRoomRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class ChatRoomService {
    private final ChatRoomRepository chatRoomRepository;
    private final ChatParticipantRepository chatParticipantRepository;
    private final UserRepository userRepository;

    // ✅ [추가] 실시간 접속자 관리: Map<방ID, Set<접속중인 유저이메일>>
    // ConcurrentHashMap을 사용하여 멀티스레드 환경에서도 안전하게 관리합니다.
    private final Map<Long, Set<String>> connectedUsers = new ConcurrentHashMap<>();

    // ✅ [추가] 현재 방에 접속 중인 인원수 반환 메서드 (StompController에서 호출)
    public int getConnectedCount(Long roomId) {
        return connectedUsers.getOrDefault(roomId, new HashSet<>()).size();
    }

    // ✅ [추가] 유저가 방에 입장했을 때 호출 (Read 신호 시)
    public void userJoined(Long roomId, String email) {
        connectedUsers.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(email);
        log.info("채팅방 입장 - 유저: {}, 방: {}, 현재 접속자: {}명", email, roomId, getConnectedCount(roomId));
    }

    // ✅ [추가] 유저가 방에서 나갔을 때 호출 (Disconnect 시)
    public void userLeft(Long roomId, String email) {
        if (connectedUsers.containsKey(roomId)) {
            connectedUsers.get(roomId).remove(email);
            // 방에 아무도 없으면 메모리 절약을 위해 해당 방 키 삭제
            if (connectedUsers.get(roomId).isEmpty()) {
                connectedUsers.remove(roomId);
            }
        }
        log.info("채팅방 퇴장 - 유저: {}, 방: {}, 현재 접속자: {}명", email, roomId, getConnectedCount(roomId));
    }

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
                .map(room -> {
                    // 마지막 메시지가 없을 경우를 대비한 안전한 처리
                    ChatMessage lastMsg = room.getMessages().isEmpty() ? null :
                            room.getMessages().get(room.getMessages().size() - 1);

                    return ChatRoomResponse.builder()
                            .chatRoomId(room.getId())
                            .roomName(room.getRoomName())
                            .participantCount(room.getParticipants().size())
                            .maxParticipants(room.getMaxParticipants())
                            .category(room.getCategory())
                            // 마지막 메시지가 없으면 기본 문구 출력 (Null 방지)
                            .lastMessage(lastMsg != null ? lastMsg.getContent() : "대화 내용이 없습니다.")
                            .lastMessageTime(lastMsg != null ? lastMsg.getCreatedAt() : LocalDateTime.now())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ✅ Entity -> DTO 변환 헬퍼 메서드
    private ChatRoomResponse convertToResponse(ChatRoom room) {
        int count = (room.getParticipants() != null) ? room.getParticipants().size() : 0;
        // 마지막 메시지 추출 (메시지 리스트가 비어있을 경우 대비)
        List<ChatMessage> msgs = room.getMessages();
        ChatMessage lastMsg = (msgs != null && !msgs.isEmpty())
                ? msgs.get(msgs.size() - 1) : null;


        return ChatRoomResponse.builder()
                .chatRoomId(room.getId())
                .roomName(room.getRoomName())
                .participantCount(room.getParticipants() != null ? room.getParticipants().size() : 0)
                .maxParticipants(room.getMaxParticipants())
                .category(room.getCategory() != null ? room.getCategory() : "일반")
                .lastMessage(lastMsg != null ? lastMsg.getContent() : "아직 대화가 없습니다.")
                .lastMessageTime(lastMsg != null ? lastMsg.getCreatedAt() : LocalDateTime.now())
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

    @Transactional
    public void updateLastReadAt(Long roomId, String email) {
        // 1. 참여자 조회
        Optional<ChatParticipant> participantOpt = chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, email);

        if (participantOpt.isPresent()) {
            participantOpt.get().updateLastReadAt(LocalDateTime.now());
        } else {
            // 2. 없는 경우 새로 등록 (saveAndFlush로 즉시 반영하여 count에 잡히게 함)
            User user = userRepository.findByEmail(email).orElseThrow();
            ChatRoom room = chatRoomRepository.findById(roomId).orElseThrow();
            ChatParticipant newParticipant = ChatParticipant.builder()
                    .chatRoom(room).user(user).role(ChatRole.MEMBER)
                    .lastReadAt(LocalDateTime.now()).joinedAt(LocalDateTime.now()).build();

            chatParticipantRepository.saveAndFlush(newParticipant);
        }
    }
    @Transactional
    public void leaveChatRoom(Long roomId, String email) {
        // ✅ 멤버 삭제(delete) 로직을 제거하여 방을 닫아도 멤버로 남게 함
        // participantOpt.ifPresent(chatParticipantRepository::delete); (이 줄을 삭제하거나 주석 처리)

        Optional<ChatParticipant> participantOpt = chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, email);
        participantOpt.ifPresent(p -> {
            p.updateLastReadAt(LocalDateTime.now()); // 마지막 읽은 시간만 기록
        });
        log.info("채팅방 세션 종료 (멤버 유지): {}, 방: {}", email, roomId);
    }
    @Transactional
    public ChatRoomResponse createChatRoomWithAllInfo(String roomName, String email, Integer maxParticipants,
                                                      String description, String location, String category) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 1. 채팅방 엔티티 생성 및 저장
        ChatRoom chatRoom = ChatRoom.builder()
                .roomName(roomName)
                .maxParticipants(maxParticipants != null ? maxParticipants : 10)
                .category(category)
                .description(description)
                .locationName(location)
                .isActive(true)
                .build();

        ChatRoom savedRoom = chatRoomRepository.save(chatRoom);

        // 2. 주최자를 방장(ORGANIZER)으로 즉시 등록
        ChatParticipant organizer = ChatParticipant.builder()
                .chatRoom(savedRoom)
                .user(user)
                .role(ChatRole.ORGANIZER)
                .joinedAt(LocalDateTime.now())
                .lastReadAt(LocalDateTime.now()) // ✅ 생성 시점 읽음 처리
                .build();
        chatParticipantRepository.save(organizer);

        return convertToResponse(savedRoom);
    }
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> findMyRooms(String email) {
        // 1. Repository에 선언한 메서드 호출
        return chatParticipantRepository.findByUserEmail(email).stream()
                .map(participant -> {
                    ChatRoom room = participant.getChatRoom(); // @Getter 필요
                    return convertToResponse(room);
                })
                // 2. null 방지를 위해 Comparator.nullsLast 등을 활용하면 더 안전함
                .sorted(Comparator.comparing(ChatRoomResponse::getLastMessageTime,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}