package com.project.itda.domain.social.controller;

import com.project.itda.domain.auth.dto.SessionUser;
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
    private final ChatParticipantRepository  chatParticipantRepository;
    private final SimpMessageSendingOperations messagingTemplate;

    @PostMapping("/{roomId}")
    public ResponseEntity<?> uploadImage(@PathVariable Long roomId, @RequestParam("file") MultipartFile file) {
        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            // 파일을 로컬에 저장하고 접근 가능한 URL(/uploads/...)을 받아옴
            String imageUrl = fileStorageService.storeFile(file);

            long total = chatParticipantRepository.countByChatRoomId(roomId);
            int unreadCount = (int) Math.max(0, total - 1);

            // DB에 IMAGE 타입으로 메시지 저장 (content 필드에 이미지 URL 저장)
            chatMessageService.saveMessage(user.getEmail(), roomId, imageUrl, MessageType.IMAGE,unreadCount);

            Map<String, Object> imageMsg = new HashMap<>();
            imageMsg.put("type", "IMAGE");
            imageMsg.put("content", imageUrl);
            imageMsg.put("senderEmail", user.getEmail());
            imageMsg.put("senderNickname", user.getNickname());
            imageMsg.put("unreadCount", unreadCount);
            imageMsg.put("sentAt", LocalDateTime.now());

            messagingTemplate.convertAndSend("/topic/room/" + roomId, imageMsg);

            return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
        } catch (Exception e) {
            log.error("이미지 업로드 오류: ", e);
            return ResponseEntity.internalServerError().body("이미지 전송 실패");
        }
    }
}