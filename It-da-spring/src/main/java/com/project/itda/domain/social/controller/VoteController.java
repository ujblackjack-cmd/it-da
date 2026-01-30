package com.project.itda.domain.social.controller;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.social.dto.request.VoteActionRequest;
import com.project.itda.domain.social.dto.request.VoteRequest;
import com.project.itda.domain.social.dto.response.VoteResponse;
import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.enums.MessageType;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.service.ChatMessageService;
import com.project.itda.domain.social.service.VoteService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/votes")
@RequiredArgsConstructor
@Slf4j
public class VoteController {

    private final VoteService voteService;
    private final HttpSession httpSession;
    private final ChatMessageService chatMessageService; // ✅ 추가
    private final ChatParticipantRepository chatParticipantRepository; // ✅ 추가
    private final SimpMessageSendingOperations messagingTemplate; // ✅ 추가

    /**
     * 투표 생성
     */
    @PostMapping("/{roomId}")
    public ResponseEntity<VoteResponse> createVote(
            @PathVariable Long roomId,
            @RequestBody VoteRequest request) {

        log.info("📥 투표 생성 요청 - roomId: {}, request: {}", roomId, request);
        log.info("🔍 세션 ID: {}", httpSession.getId());

        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        log.info("🔍 세션에서 가져온 user: {}", user);

        if (user == null) {
            log.error("❌ 세션에 user 정보 없음");
            return ResponseEntity.status(401).body(null);
        }

        log.info("✅ 인증된 사용자: {}", user.getEmail());

        // 투표 생성
        VoteResponse voteResponse = voteService.createVote(request, user.getEmail(), roomId);

        // ✅ 채팅 메시지로 저장
        try {
            long total = chatParticipantRepository.countByChatRoomId(roomId);
            int unreadCount = (int) Math.max(0, total - 1);

            // 투표 메타데이터 구성
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("voteId", voteResponse.getVoteId());
            metadata.put("title", voteResponse.getTitle());
            metadata.put("isAnonymous", voteResponse.isAnonymous());
            metadata.put("isMultipleChoice", voteResponse.isMultipleChoice());
            metadata.put("options", voteResponse.getOptions());
            metadata.put("creatorId", user.getUserId());
            metadata.put("creatorNickname", user.getNickname() != null && !user.getNickname().trim().isEmpty()
                    ? user.getNickname()
                    : user.getUsername());

            String content = "📊 " + voteResponse.getTitle();

            // DB에 POLL 타입 메시지 저장
            ChatMessage savedMsg = chatMessageService.saveMessageWithMetadata(
                    user.getEmail(),
                    roomId,
                    content,
                    MessageType.POLL,
                    metadata,
                    unreadCount
            );

            // ✅ null 체크
            if (savedMsg == null || savedMsg.getId() == null) {
                log.error("❌ 투표 메시지 저장 실패!");
                return ResponseEntity.ok(voteResponse); // 투표는 생성되었으니 일단 반환
            }

            log.info("✅ 투표 메시지 저장 완료 - ID: {}", savedMsg.getId());

            // ✅ WebSocket으로 전송
            Map<String, Object> wsMessage = new HashMap<>();
            wsMessage.put("messageId", savedMsg.getId()); // ✅ 필수!
            wsMessage.put("type", "POLL");
            wsMessage.put("content", content);
            wsMessage.put("senderId", user.getUserId());
            wsMessage.put("senderNickname", user.getNickname() != null && !user.getNickname().trim().isEmpty()
                    ? user.getNickname()
                    : user.getUsername());
            wsMessage.put("sentAt", savedMsg.getCreatedAt() != null
                    ? savedMsg.getCreatedAt().toString()
                    : LocalDateTime.now().toString());
            wsMessage.put("unreadCount", unreadCount);
            wsMessage.put("metadata", metadata);

            messagingTemplate.convertAndSend("/topic/room/" + roomId, wsMessage);

            log.info("✅ 투표 메시지 전송 완료 - messageId: {}", savedMsg.getId());

        } catch (Exception e) {
            log.error("❌ 투표 메시지 WebSocket 전송 실패: ", e);
            // 투표 자체는 생성되었으므로 에러를 던지지 않음
        }

        return ResponseEntity.ok(voteResponse);
    }

    /**
     * 투표하기 (항목 선택)
     */
    @PostMapping("/{voteId}/cast")
    public ResponseEntity<VoteResponse> castVote(
            @PathVariable Long voteId,
            @RequestBody VoteActionRequest request,
            @SessionAttribute(name = "user", required = false) SessionUser user) {

        log.info("📥 투표 전송 요청 - voteId: {}, request: {}", voteId, request);
        log.info("🔍 세션에서 가져온 user: {}", user);

        if (user == null) {
            log.error("❌ 세션에 유저 정보가 없습니다. 로그인이 필요합니다.");
            return ResponseEntity.status(401).build();
        }

        VoteResponse updatedVote = voteService.castVote(voteId, request, user.getEmail());

        // ✅ 투표 업데이트를 WebSocket으로 전송 (선택사항)
        try {
            Map<String, Object> updateMsg = new HashMap<>();
            updateMsg.put("type", "VOTE_UPDATE");
            updateMsg.put("voteId", voteId);
            updateMsg.put("metadata", Map.of(
                    "voteId", updatedVote.getVoteId(),
                    "options", updatedVote.getOptions()
            ));

            // roomId를 알아야 전송 가능 - VoteResponse에 roomId가 있다면:
            // messagingTemplate.convertAndSend("/topic/room/" + updatedVote.getRoomId(), updateMsg);

        } catch (Exception e) {
            log.error("❌ 투표 업데이트 WebSocket 전송 실패: ", e);
        }

        return ResponseEntity.ok(updatedVote);
    }
}