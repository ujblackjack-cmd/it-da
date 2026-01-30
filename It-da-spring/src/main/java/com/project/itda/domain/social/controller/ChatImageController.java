package com.project.itda.domain.social.controller;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.enums.MessageType;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.service.ChatMessageService;
import com.project.itda.domain.social.service.ChatRoomService;
import com.project.itda.global.service.FileStorageService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/social/chat/images")
@RequiredArgsConstructor
public class ChatImageController {

    private final ChatMessageService chatMessageService;
    private final FileStorageService fileStorageService;
    private final HttpSession httpSession;
    private final ChatParticipantRepository chatParticipantRepository;
    private final SimpMessageSendingOperations messagingTemplate;

    @PostMapping("/{roomId}")
    public ResponseEntity<?> uploadImage(@PathVariable Long roomId, @RequestParam("file") MultipartFile file) {
        Object sessionObj = httpSession.getAttribute("user");
        log.debug("Session user object: {}", sessionObj);

        if (sessionObj == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        // 타입 안전 확인 후 캐스팅
        if (!(sessionObj instanceof SessionUser)) {
            log.error("세션 객체 타입 불일치: 기대(SessionUser), 실제({})", sessionObj.getClass().getName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("인증 정보 처리 오류");
        }

        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            // 파일을 로컬에 저장하고 접근 가능한 URL(/uploads/...)을 받아옴
            String imageUrl = fileStorageService.storeFile(file);

            long total = chatParticipantRepository.countByChatRoomId(roomId);
            int unreadCount = (int) Math.max(0, total - 1);

            // ✅ DB에 IMAGE 타입으로 메시지 저장하고 저장된 엔티티 받기
            ChatMessage savedMsg = chatMessageService.saveMessage(
                    user.getEmail(),
                    roomId,
                    imageUrl,
                    MessageType.IMAGE,
                    unreadCount
            );

            // ✅ null 체크
            if (savedMsg == null || savedMsg.getId() == null) {
                log.error("❌ 이미지 메시지 저장 실패!");
                return ResponseEntity.internalServerError().body("메시지 저장 실패");
            }

            log.info("✅ 이미지 메시지 저장 완료 - ID: {}", savedMsg.getId());

            // ✅ messageId 포함한 응답 객체 생성
            Map<String, Object> imageMsg = new HashMap<>();
            imageMsg.put("messageId", savedMsg.getId()); // ✅ 필수!
            imageMsg.put("type", "IMAGE");
            imageMsg.put("content", imageUrl);
            imageMsg.put("senderEmail", user.getEmail());
            imageMsg.put("senderId", user.getUserId());
            imageMsg.put("senderNickname", user.getNickname() != null && !user.getNickname().trim().isEmpty()
                    ? user.getNickname()
                    : user.getUsername());
            imageMsg.put("unreadCount", unreadCount);
            imageMsg.put("sentAt", savedMsg.getCreatedAt() != null
                    ? savedMsg.getCreatedAt().toString()
                    : LocalDateTime.now().toString());

            // WebSocket 전송
            messagingTemplate.convertAndSend("/topic/room/" + roomId, imageMsg);

            log.info("✅ 이미지 메시지 전송 완료 - messageId: {}", savedMsg.getId());

            return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
        } catch (Exception e) {
            log.error("❌ 이미지 업로드 오류: ", e);
            return ResponseEntity.internalServerError().body("이미지 전송 실패");
        }
    }
}