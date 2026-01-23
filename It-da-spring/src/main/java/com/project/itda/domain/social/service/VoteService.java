package com.project.itda.domain.social.service;

import com.project.itda.domain.social.dto.request.VoteActionRequest;
import com.project.itda.domain.social.dto.request.VoteRequest;
import com.project.itda.domain.social.dto.response.VoteResponse;
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.social.entity.Vote;
import com.project.itda.domain.social.entity.VoteOption;
import com.project.itda.domain.social.enums.MessageType;
import com.project.itda.domain.social.repository.ChatRoomRepository;
import com.project.itda.domain.social.repository.VoteRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoteService {

    private final VoteRepository voteRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final ChatMessageService chatMessageService;
    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatRoomService chatRoomService;

    @Transactional
    public VoteResponse createVote(VoteRequest request, String email, Long roomId) {
        // 1. 유저 및 채팅방 조회
        User creator = userRepository.findByEmail(email).orElseThrow();
        ChatRoom room = chatRoomRepository.findById(roomId).orElseThrow();

        // 2. 투표 엔티티 생성
        Vote vote = Vote.builder()
                .title(request.getTitle())
                .isAnonymous(request.isAnonymous())
                .isMultipleChoice(request.isMultipleChoice())
                .chatRoom(room)
                .creator(creator)
                .build();

        // 3. 선택지 추가
        request.getOptions().forEach(optionContent -> {
            VoteOption option = VoteOption.builder()
                    .content(optionContent)
                    .build();
            vote.addOption(option);
        });

        Vote savedVote = voteRepository.save(vote);
        VoteResponse response = convertToResponse(savedVote);


        // ✅ metadata 변수를 선언하고 초기화합니다.
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("voteId", savedVote.getId());
        metadata.put("title", savedVote.getTitle());
        metadata.put("isAnonymous", savedVote.isAnonymous());
        metadata.put("options", response.getOptions().stream()
                .map(opt ->Map.of(
                        "optionId", opt.getOptionId(), // ✅ 프론트엔드 클릭의 핵심
                        "content", opt.getContent(),
                        "voteCount", 0,
                        "voterIds", new ArrayList<>()
                )).collect(Collectors.toList()));

        // 5. 채팅 메시지 저장 (한 번만 호출)
        String systemContent = "📊 투표: " + savedVote.getTitle();

        int unreadCount = chatRoomService.getUnreadCount(roomId, LocalDateTime.now());
        // 2. DB 저장 (MessageType.POLL 지정)
        chatMessageService.saveMessageWithMetadata(email, roomId, systemContent, MessageType.POLL, metadata,unreadCount);

        // 3. 웹소켓 브로드캐스트 (metadata를 포함하여 전송)
        Map<String, Object> socketPayload = new HashMap<>();
        socketPayload.put("type", "POLL");
        socketPayload.put("metadata", metadata); // ✅ 프론트엔드와 규격 일치
        socketPayload.put("content", systemContent);

        String finalNickname = creator.getNickname() != null ? creator.getNickname() : creator.getUsername();
        socketPayload.put("senderNickname", finalNickname);
        socketPayload.put("senderEmail", creator.getEmail()); // '나'임을 식별하는 핵심 데이터
        socketPayload.put("senderId", creator.getUserId());

        socketPayload.put("roomId", roomId);
        socketPayload.put("createdAt", savedVote.getCreatedAt());

        messagingTemplate.convertAndSend("/topic/room/" + roomId, socketPayload);
        return response;
    }

    private VoteResponse convertToResponse(Vote vote) {
        List<VoteResponse.VoteOptionResponse> optionResponses = vote.getOptions().stream()
                .map(opt -> VoteResponse.VoteOptionResponse.builder()
                        .optionId(opt.getId())
                        .content(opt.getContent())
                        .voteCount(opt.getVoters().size())
                        .voterIds(vote.isAnonymous() ? null :
                                opt.getVoters().stream().map(User::getUserId).collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());

        return VoteResponse.builder()
                .voteId(vote.getId())
                .title(vote.getTitle())
                .isAnonymous(vote.isAnonymous())
                .isMultipleChoice(vote.isMultipleChoice())
                .creatorId(vote.getCreator().getUserId())
                .creatorNickname(vote.getCreator().getNickname())
                .options(optionResponses)
                .build();
    }

    @Transactional
    public VoteResponse castVote(Long voteId, VoteActionRequest request, String email) {
        Vote vote = voteRepository.findById(voteId)
                .orElseThrow(() -> new RuntimeException("투표를 찾을 수 없습니다."));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        vote.getOptions().forEach(option -> option.getVoters().remove(user));

        if (request.getSelectedOptionIds() != null && !request.getSelectedOptionIds().isEmpty()) {
            List<VoteOption> selectedOptions = vote.getOptions().stream()
                    .filter(option -> request.getSelectedOptionIds().contains(option.getId()))
                    .collect(Collectors.toList());

            selectedOptions.forEach(option -> option.getVoters().add(user));
        }

        Vote savedVote = voteRepository.save(vote);
        VoteResponse response = convertToResponse(vote);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("voteId", savedVote.getId());
        metadata.put("title", savedVote.getTitle());
        metadata.put("isAnonymous", savedVote.isAnonymous());
        metadata.put("options", response.getOptions().stream()
                .map(opt -> Map.of(
                        "optionId", opt.getOptionId(),
                        "content", opt.getContent(),
                        "voteCount", opt.getVoteCount(),
                        "voterIds", opt.getVoterIds() != null ? opt.getVoterIds() : new ArrayList<>()
                )).collect(Collectors.toList()));

        chatMessageService.updateVoteMetadata(vote.getChatRoom().getId(), voteId, metadata);

        // ✅ 컴파일 에러 해결 및 익명 방지 로직 적용
        Map<String, Object> socketPayload = new HashMap<>();
        socketPayload.put("type", "VOTE_UPDATE");
        socketPayload.put("voteId", voteId);
        socketPayload.put("metadata", metadata);
        socketPayload.put("messageId", System.currentTimeMillis());

        // 닉네임이 없으면 이름을 사용하도록 방어 로직 추가
        String senderNickname = user.getNickname() != null ? user.getNickname() : user.getUsername();
        socketPayload.put("senderNickname", senderNickname);
        socketPayload.put("senderEmail", user.getEmail()); // ✅ '나'임을 증명하는 핵심 데이터
        socketPayload.put("roomId", vote.getChatRoom().getId()); // ✅ roomId 변수 대신 vote에서 추출
        socketPayload.put("createdAt", vote.getUpdatedAt()); // ✅ savedVote 대신 vote 사용

        messagingTemplate.convertAndSend("/topic/room/" + vote.getChatRoom().getId(), socketPayload);
        return response;
    }
    }