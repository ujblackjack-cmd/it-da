package com.project.itda.domain.social.service;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.social.dto.response.ChatParticipantResponse;
import com.project.itda.domain.social.dto.response.ChatRoomResponse; // ✅ 추가
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
                .map(this::convertToResponse) // ✅ 이미 수정해둔 convertToResponse 메서드 활용
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
    public List<ChatParticipantResponse> getParticipantList(Long roomId, Long currentUserId) { // ✅ 파라미터 추가

        System.out.println(">>> 멤버 조회 요청: RoomID=" + roomId + ", 내 ID=" + currentUserId);

        // 1. 방 조회
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));

        // 2. 참여자 리스트 변환 + 팔로우 여부 체크
        return room.getParticipants().stream()
                .map(participant -> {
                    User member = participant.getUser();

                    // ⚡ [핵심] 내가 이 사람을 팔로우 중인지 확인
                    boolean isFollowing = false;
                    if (currentUserId != null && !currentUserId.equals(member.getUserId())) {
                        // 로그인 상태이고, 본인이 아닐 때만 DB 조회
                        isFollowing = userFollowRepository.existsByFollowerIdAndFollowingId(currentUserId, member.getUserId());
                    }

                    return ChatParticipantResponse.builder()
                            .userId(member.getUserId())
                            .username(member.getUsername())
                            .nickname(member.getNickname())
                            .email(member.getEmail())
                            .profileImageUrl(member.getProfileImageUrl())
                            .role(participant.getRole().name())
                            .isFollowing(isFollowing) // ✅ 확인한 값을 DTO에 넣기
                            .build();
                })
                .collect(Collectors.toList());
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
    public int getUnreadCount(Long roomId, LocalDateTime messageSentAt) {
        // 1. 채팅방의 전체 참여자 수 조회
        long totalParticipants = chatParticipantRepository.countByChatRoomId(roomId);

        // 2. 💡 수정: 단순히 시간 비교가 아니라, 현재 "실시간으로 접속 중인 인원수"를 가져옵니다.
        // 이미 구현해두신 getConnectedCount를 활용합니다.
        int onlineCount = getConnectedCount(roomId);

        // 3. 결과 = 전체 참여자 - 현재 방에 들어와 있는 사람 수
        // 이렇게 해야 방에 없는 사람 수만큼 숫자가 안정적으로 유지됩니다.
        return Math.max(0, (int)(totalParticipants - onlineCount));
    }
    @Transactional
    public void updateNotice(Long roomId, String notice) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));

        room.updateNotice(notice);

        // (선택사항) 여기서 "공지가 등록되었습니다"라는 시스템 메시지를 보내거나
        // 소켓으로 실시간 업데이트 신호를 보낼 수도 있습니다.
    }
    public List<ChatParticipantResponse> searchUsers(String keyword,Long currentUserId) {
        List<User> users;

        if (keyword == null || keyword.trim().isEmpty()) {
            // 키워드가 없으면 전체 유저 중 최근 20명만 조회 (페이징 사용 권장하지만 임시로 이렇게 처리)
            // UserRepository에 findAllByOrderByCreatedAtDesc(Pageable pageable) 메서드가 필요할 수 있음
            // 없는 경우 아래처럼 stream limit으로 대체 가능하지만, 실제 운영 환경에서는 페이징 쿼리를 작성해야 함.
            users = userRepository.findAll().stream()
                    // createdAt(가입일) 기준 내림차순(최신순) 정렬
                    .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    // .limit(100) // (선택사항) 너무 많으면 100명 등으로 끊어줄 수 있습니다.
                    .collect(Collectors.toList());
        } else {
            // 검색어가 있을 때도 최신순으로 보여주려면 여기서도 정렬 가능
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
    @Transactional
    public void inviteMember(Long roomId, Long targetUserId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 없습니다."));

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("유저가 없습니다."));

        // 1. 이미 참여 중인지 확인
        boolean isJoined = chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, targetUser.getEmail()).isPresent();
        if (isJoined) {
            throw new IllegalStateException("이미 참여 중인 멤버입니다.");
        }

        // 2. 채팅방 참여자 추가
        ChatParticipant chatParticipant = ChatParticipant.builder()
                .chatRoom(room)
                .user(targetUser)
                .role(ChatRole.MEMBER)
                .joinedAt(LocalDateTime.now())
                .lastReadAt(LocalDateTime.now())
                .build();
        chatParticipantRepository.save(chatParticipant);

        // 3. 모임(Meeting)이 연결된 방이라면, 모임 참여자 목록에도 추가 (중요!)
        if (room.getMeetingId() != null) {
            Meeting meeting = meetingRepository.findById(room.getMeetingId())
                    .orElse(null);

            if (meeting != null) {
                // 모임 참여 정보 저장
                Participation participation = Participation.builder()
                        .user(targetUser)
                        .meeting(meeting)
                        .status(ParticipationStatus.APPROVED) // 즉시 승인 상태로 추가
                        .appliedAt(LocalDateTime.now())
                        .approvedAt(LocalDateTime.now())
                        .build();
                participationRepository.save(participation);

                // (선택) 모임 현재 인원 수 증가 로직이 Meeting 엔티티에 있다면 호출
                // meeting.increaseParticipantCount();
            }
        }
    }
}