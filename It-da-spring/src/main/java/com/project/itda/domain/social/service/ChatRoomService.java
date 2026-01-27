package com.project.itda.domain.social.service;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.notification.service.NotificationService; // ✅ 알림 서비스 임포트 확인
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.participation.service.ParticipationService;
import com.project.itda.domain.social.dto.response.ChatParticipantResponse;
import com.project.itda.domain.social.dto.response.ChatRoomResponse;
import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.entity.ChatParticipant;
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.social.enums.ChatRole;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.repository.ChatRoomRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserFollowRepository;
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

    private final MeetingRepository meetingRepository;
    private final ParticipationRepository participationRepository;
    private final UserFollowRepository userFollowRepository;
    private final ParticipationService participationService;
    private final NotificationService notificationService; // ✅ 알림 서비스 의존성 주입

    // 실시간 접속자 관리
    private final Map<Long, Set<String>> connectedUsers = new ConcurrentHashMap<>();

    // 현재 방에 접속 중인 인원수 반환
    public int getConnectedCount(Long roomId) {
        return connectedUsers.getOrDefault(roomId, new HashSet<>()).size();
    }

    // 유저가 방에 입장했을 때
    public void userJoined(Long roomId, String email) {
        connectedUsers.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(email);
    }

    // 유저가 방에서 나갔을 때
    public void userLeft(Long roomId, String email) {
        if (connectedUsers.containsKey(roomId)) {
            connectedUsers.get(roomId).remove(email);
            if (connectedUsers.get(roomId).isEmpty()) {
                connectedUsers.remove(roomId);
            }
        }
    }

    @Transactional
    public ChatRoom createChatRoom(String name) {
        ChatRoom chatRoom = ChatRoom.builder()
                .roomName(name)
                .isActive(true)
                .build();
        return chatRoomRepository.save(chatRoom);
    }

    @Transactional
    public ChatRoomResponse createChatRoomWithResponse(String name, String email) {
        User creator = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        ChatRoom chatRoom = ChatRoom.builder()
                .roomName(name)
                .isActive(true)
                .build();
        ChatRoom savedRoom = chatRoomRepository.save(chatRoom);

        ChatParticipant participant = ChatParticipant.builder()
                .chatRoom(savedRoom)
                .user(creator)
                .role(ChatRole.ORGANIZER)
                .joinedAt(LocalDateTime.now())
                .build();
        chatParticipantRepository.save(participant);

        return convertToResponse(savedRoom);
    }

    // 모든 방 조회
    public List<ChatRoomResponse> findAllRoomsAsResponse() {
        return chatRoomRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    private ChatRoomResponse convertToResponse(ChatRoom room) {
        List<ChatMessage> msgs = room.getMessages();
        ChatMessage lastMsg = (msgs != null && !msgs.isEmpty())
                ? msgs.get(msgs.size() - 1) : null;

        return ChatRoomResponse.builder()
                .chatRoomId(room.getId())
                .meetingId(room.getMeetingId())
                .roomName(room.getRoomName())
                .participantCount(room.getParticipants() != null ? room.getParticipants().size() : 0)
                .maxParticipants(room.getMaxParticipants())
                .category(room.getCategory() != null ? room.getCategory() : "일반")
                .lastMessage(lastMsg != null ? lastMsg.getContent() : "아직 대화가 없습니다.")
                .lastMessageTime(lastMsg != null ? lastMsg.getCreatedAt() : LocalDateTime.now())
                .notice(room.getNotice())
                .build();
    }

    public List<ChatRoom> findAllRooms() {
        return chatRoomRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<ChatParticipantResponse> getParticipantList(Long roomId, Long currentUserId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));

        return room.getParticipants().stream()
                .map(participant -> {
                    User member = participant.getUser();
                    boolean isFollowing = false;
                    if (currentUserId != null && !currentUserId.equals(member.getUserId())) {
                        isFollowing = userFollowRepository.existsByFollowerIdAndFollowingId(currentUserId, member.getUserId());
                    }
                    return ChatParticipantResponse.builder()
                            .userId(member.getUserId())
                            .username(member.getUsername())
                            .nickname(member.getNickname())
                            .email(member.getEmail())
                            .profileImageUrl(member.getProfileImageUrl())
                            .role(participant.getRole().name())
                            .isFollowing(isFollowing)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateLastReadAt(Long roomId, String email) {
        Optional<ChatParticipant> participantOpt = chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, email);
        if (participantOpt.isPresent()) {
            participantOpt.get().updateLastReadAt(LocalDateTime.now());
        }
    }

    @Transactional
    public void leaveChatRoom(Long roomId, String email) {
        Optional<ChatParticipant> participantOpt = chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, email);
        participantOpt.ifPresent(p -> {
            p.updateLastReadAt(LocalDateTime.now());
        });
        log.info("채팅방 세션 종료 (멤버 유지): {}, 방: {}", email, roomId);
    }

    @Transactional
    public ChatRoomResponse createChatRoomWithAllInfo(String roomName, String email, Integer maxParticipants,
                                                      String description, String location, String category) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        ChatRoom chatRoom = ChatRoom.builder()
                .roomName(roomName)
                .maxParticipants(maxParticipants != null ? maxParticipants : 10)
                .category(category)
                .description(description)
                .locationName(location)
                .isActive(true)
                .build();

        ChatRoom savedRoom = chatRoomRepository.save(chatRoom);

        ChatParticipant organizer = ChatParticipant.builder()
                .chatRoom(savedRoom)
                .user(user)
                .role(ChatRole.ORGANIZER)
                .joinedAt(LocalDateTime.now())
                .lastReadAt(LocalDateTime.now())
                .build();
        chatParticipantRepository.save(organizer);

        return convertToResponse(savedRoom);
    }

    @Transactional(readOnly = true)
    public List<ChatRoomResponse> findMyRooms(String email) {
        return chatParticipantRepository.findByUserEmail(email).stream()
                .map(participant -> convertToResponse(participant.getChatRoom()))
                .sorted(Comparator.comparing(ChatRoomResponse::getLastMessageTime,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    public int getUnreadCount(Long roomId, LocalDateTime messageSentAt) {
        long totalParticipants = chatParticipantRepository.countByChatRoomId(roomId);
        int onlineCount = getConnectedCount(roomId);
        return Math.max(0, (int)(totalParticipants - onlineCount));
    }

    @Transactional
    public void updateNotice(Long roomId, String notice, String userEmail) {
        ChatParticipant participant = chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, userEmail)
                .orElseThrow(() -> new IllegalArgumentException("채팅방 참여자가 아닙니다."));

        if (participant.getRole() != ChatRole.ORGANIZER) {
            throw new IllegalStateException("공지사항 수정 권한이 없습니다. 방장만 가능합니다.");
        }

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));

        room.updateNotice(notice);
    }

    public List<ChatParticipantResponse> searchUsers(String keyword, Long currentUserId) {
        List<User> users;
        if (keyword == null || keyword.trim().isEmpty()) {
            users = userRepository.findAll().stream()
                    .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .collect(Collectors.toList());
        } else {
            users = userRepository.findByNicknameContainingOrEmailContaining(keyword, keyword).stream()
                    .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .collect(Collectors.toList());
        }

        return users.stream()
                .map(user ->{
                    boolean isFollowing = false;
                    if (currentUserId != null && !currentUserId.equals(user.getUserId())) {
                        isFollowing = userFollowRepository.existsByFollowerIdAndFollowingId(currentUserId, user.getUserId());
                    }
                    return ChatParticipantResponse.builder()
                            .userId(user.getUserId())
                            .username(user.getUsername())
                            .nickname(user.getNickname())
                            .email(user.getEmail())
                            .profileImageUrl(user.getProfileImageUrl())
                            .isFollowing(isFollowing)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * ✅ 멤버 초대 (알림 전송 버전)
     * - 즉시 가입 로직을 삭제하고 알림 전송만 수행합니다.
     */
    @Transactional
    public void inviteMember(Long roomId, Long targetUserId, String inviterEmail) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 없습니다."));

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("유저가 없습니다."));

        User inviter = userRepository.findByEmail(inviterEmail)
                .orElseThrow(() -> new IllegalArgumentException("초대자를 찾을 수 없습니다."));

        // 1. 이미 참여 중인지 확인
        boolean isJoined = chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, targetUser.getEmail()).isPresent();
        if (isJoined) {
            throw new IllegalStateException("이미 참여 중인 멤버입니다.");
        }

        // 2. 알림 전송
        notificationService.notifyChatInvite(targetUser, inviter, roomId, room.getRoomName());

        log.info("📩 초대장 전송 완료: {} -> {}", inviter.getUsername(), targetUser.getUsername());
    }

    /**
     * ✅ 초대 수락 시 실행될 가입 로직
     * - NotificationService에서 호출합니다.
     */
    @Transactional
    public void acceptInvitation(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 없습니다."));
        User user = userRepository.findById(userId).orElseThrow();

        // 중복 참여 체크
        if (chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, user.getEmail()).isPresent()) {
            return;
        }

        // 1. 채팅방 멤버 추가
        ChatParticipant participant = ChatParticipant.builder()
                .chatRoom(room)
                .user(user)
                .role(ChatRole.MEMBER)
                .joinedAt(LocalDateTime.now())
                .lastReadAt(LocalDateTime.now())
                .build();
        chatParticipantRepository.save(participant);

        // 2. 모임(Meeting) 참여 정보 업데이트
        if (room.getMeetingId() != null) {
            participationService.approveParticipationFromInvite(room.getMeetingId(), user);
        }
    }
}