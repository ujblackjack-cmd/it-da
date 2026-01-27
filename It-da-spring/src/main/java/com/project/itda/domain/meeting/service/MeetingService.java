// src/main/java/com/project/itda/domain/meeting/service/MeetingService.java
package com.project.itda.domain.meeting.service;

import com.project.itda.domain.badge.event.MeetingCreatedEvent;
import com.project.itda.domain.meeting.dto.request.MeetingCreateRequest;
import com.project.itda.domain.meeting.dto.request.MeetingUpdateRequest;
import com.project.itda.domain.meeting.dto.response.MeetingDetailResponse;
import com.project.itda.domain.meeting.dto.response.MeetingResponse;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.enums.MeetingStatus;
import com.project.itda.domain.meeting.enums.MeetingTimeSlot;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.notification.service.PushNotificationService;
import com.project.itda.domain.participation.dto.response.ParticipantDto;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.social.entity.ChatParticipant;
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.social.enums.ChatRole;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.repository.ChatRoomRepository;
import com.project.itda.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 모임 서비스 (CRUD + 배지 이벤트)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final ParticipationRepository participationRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatParticipantRepository chatParticipantRepository;
    private final PushNotificationService pushNotificationService;
    private final ApplicationEventPublisher eventPublisher;  // ⭐ 추가!

    private final String uploadDir = "uploads/meetings/";

    /**
     * 모임 생성 (배지 이벤트 포함)
     */
    @Transactional
    public MeetingResponse createMeeting(User user, MeetingCreateRequest request) {
        log.info("📍 POST /api/meetings - userId: {}", user.getUserId());

        ChatRoom chatRoom = ChatRoom.builder()
                .roomName(request.getTitle())
                .maxParticipants(request.getMaxParticipants())
                .category(request.getCategory())
                .isActive(true)
                .build();
        chatRoomRepository.save(chatRoom);

        // 시간대 자동 설정
        MeetingTimeSlot timeSlot = MeetingTimeSlot.fromHour(request.getMeetingTime().getHour());

        Meeting.LocationType locationType = Meeting.LocationType.valueOf(
                request.getLocationType().toString().toUpperCase()
        );

        Meeting meeting = Meeting.builder()
                .organizer(user)
                .chatRoom(chatRoom)
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .subcategory(request.getSubcategory())
                .meetingTime(request.getMeetingTime())
                .timeSlot(timeSlot)
                .locationName(request.getLocationName())
                .locationAddress(request.getLocationAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .locationType(locationType)
                .vibe(request.getVibe())
                .maxParticipants(request.getMaxParticipants())
                .currentParticipants(1)
                .expectedCost(request.getExpectedCost() != null ? request.getExpectedCost() : 0)
                .status(MeetingStatus.RECRUITING)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : true)
                .imageUrl(request.getImageUrl())
                .tags(request.getTags())
                .build();

        Meeting savedMeeting = meetingRepository.save(meeting);

        chatRoom.updateMeetingId(savedMeeting.getMeetingId());

        ChatParticipant chatOrganizer = ChatParticipant.builder()
                .chatRoom(chatRoom)
                .user(user)
                .role(ChatRole.ORGANIZER)
                .joinedAt(LocalDateTime.now())
                .lastReadAt(LocalDateTime.now())
                .build();
        chatParticipantRepository.save(chatOrganizer);

        Participation participation = Participation.builder()
                .user(user)
                .meeting(savedMeeting)
                .status(ParticipationStatus.APPROVED)
                .appliedAt(LocalDateTime.now())
                .approvedAt(LocalDateTime.now())
                .build();
        participationRepository.save(participation);

        log.info("✅ 모임 생성 및 주최자 참여 완료 - meetingId: {}, chatRoomId: {}",
                savedMeeting.getMeetingId(), chatRoom.getId());

        // ⭐ 배지 이벤트 발행! (모임 생성 시 주최 배지 체크)
        eventPublisher.publishEvent(new MeetingCreatedEvent(user.getUserId()));
        log.info("🏅 모임 생성 배지 이벤트 발행: organizerId={}", user.getUserId());

        return toMeetingResponse(savedMeeting);
    }

    /**
     * 모임 상세 조회
     */
    @Transactional(readOnly = true)
    public MeetingDetailResponse getMeetingDetail(Long meetingId) {
        log.info("📍 GET /api/meetings/{}", meetingId);

        Meeting meeting = findById(meetingId);

        long dDay = ChronoUnit.DAYS.between(LocalDateTime.now(), meeting.getMeetingTime());

        return MeetingDetailResponse.builder()
                .meetingId(meeting.getMeetingId())
                .chatRoomId(meeting.getChatRoom() != null ? meeting.getChatRoom().getId() : null)
                .organizerId(meeting.getOrganizer().getUserId())
                .organizerUsername(meeting.getOrganizer().getUsername())
                .organizerEmail(meeting.getOrganizer().getEmail())
                .organizerProfileImage(meeting.getOrganizer().getProfileImageUrl())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .category(meeting.getCategory())
                .subcategory(meeting.getSubcategory())
                .meetingTime(meeting.getMeetingTime())
                .timeSlot(meeting.getTimeSlot().name())
                .locationName(meeting.getLocationName())
                .locationAddress(meeting.getLocationAddress())
                .latitude(meeting.getLatitudeAsDouble())
                .longitude(meeting.getLongitudeAsDouble())
                .locationType(meeting.getLocationType().name())
                .vibe(meeting.getVibe())
                .currentParticipants(meeting.getCurrentParticipants())
                .maxParticipants(meeting.getMaxParticipants())
                .expectedCost(meeting.getExpectedCost())
                .imageUrl(meeting.getImageUrl())
                .status(meeting.getStatus().name())
                .createdAt(meeting.getCreatedAt())
                .isFull(meeting.isFull())
                .dDay(dDay)
                .tags(meeting.getTags())
                .build();
    }

    /**
     * 모임 수정
     */
    @Transactional
    public MeetingResponse updateMeeting(User user, Long meetingId, MeetingUpdateRequest request) {
        log.info("📍 PUT /api/meetings/{} - userId: {}", meetingId, user.getUserId());

        Meeting meeting = findById(meetingId);

        if (!meeting.isOrganizer(user.getUserId())) {
            throw new IllegalStateException("주최자만 모임을 수정할 수 있습니다");
        }

        Meeting.LocationType locationType = Meeting.LocationType.valueOf(
                request.getLocationType().toUpperCase()
        );

        meeting.update(
                request.getTitle(),
                request.getDescription(),
                request.getMeetingTime(),
                request.getLocationName(),
                request.getLocationAddress(),
                request.getLatitude(),
                request.getLongitude(),
                locationType,
                request.getVibe(),
                request.getMaxParticipants(),
                request.getExpectedCost(),
                request.getImageUrl(),
                request.getTags()
        );

        log.info("✅ 모임 수정 완료 - meetingId: {}", meetingId);

        notifyMeetingUpdatedToParticipants(meetingId, "info", null);

        return toMeetingResponse(meeting);
    }

    /**
     * 모임 삭제
     */
    @Transactional
    public void deleteMeeting(User user, Long meetingId) {
        log.info("📍 DELETE /api/meetings/{} - userId: {}", meetingId, user.getUserId());

        Meeting meeting = findById(meetingId);

        if (!meeting.isOrganizer(user.getUserId())) {
            throw new IllegalStateException("주최자만 모임을 삭제할 수 있습니다");
        }

        meeting.delete();

        log.info("✅ 모임 삭제 완료 - meetingId: {}", meetingId);
    }

    /**
     * 모임 단건 조회
     */
    @Transactional(readOnly = true)
    public Meeting findById(Long meetingId) {
        return meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다: " + meetingId));
    }

    /**
     * ID 리스트로 모임 조회
     */
    @Transactional(readOnly = true)
    public List<Meeting> findByIdIn(List<Long> meetingIds) {
        return meetingRepository.findAllById(meetingIds);
    }

    /**
     * 카테고리별 모임 조회
     */
    @Transactional(readOnly = true)
    public List<Meeting> findByCategoryAndStatusRecruiting(String category) {
        return meetingRepository.findByCategoryAndStatusRecruiting(category);
    }

    /**
     * Meeting → MeetingResponse 변환
     */
    private MeetingResponse toMeetingResponse(Meeting meeting) {
        long dDay = ChronoUnit.DAYS.between(LocalDateTime.now(), meeting.getMeetingTime());

        return MeetingResponse.builder()
                .meetingId(meeting.getMeetingId())
                .chatRoomId(meeting.getChatRoom() != null ? meeting.getChatRoom().getId() : null)
                .organizerId(meeting.getOrganizer().getUserId())
                .organizerUsername(meeting.getOrganizer().getUsername())
                .organizerProfileImage(meeting.getOrganizer().getProfileImageUrl())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .category(meeting.getCategory())
                .subcategory(meeting.getSubcategory())
                .meetingTime(meeting.getMeetingTime())
                .timeSlot(meeting.getTimeSlot().name())
                .locationName(meeting.getLocationName())
                .locationAddress(meeting.getLocationAddress())
                .latitude(meeting.getLatitudeAsDouble())
                .longitude(meeting.getLongitudeAsDouble())
                .locationType(meeting.getLocationType().name())
                .vibe(meeting.getVibe())
                .currentParticipants(meeting.getCurrentParticipants())
                .maxParticipants(meeting.getMaxParticipants())
                .expectedCost(meeting.getExpectedCost())
                .imageUrl(meeting.getImageUrl())
                .status(meeting.getStatus().name())
                .createdAt(meeting.getCreatedAt())
                .updatedAt(meeting.getUpdatedAt())
                .isFull(meeting.isFull())
                .dDay(dDay)
                .tags(meeting.getTags())
                .build();
    }

    @Transactional(readOnly = true)
    public MeetingDetailResponse getMeetingById(Long meetingId) {
        log.info("🔍 모임 상세 조회 - meetingId: {}", meetingId);

        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다."));

        List<Participation> participations = participationRepository
                .findByMeetingAndStatus(meeting, ParticipationStatus.APPROVED);

        log.info("👥 조회된 참여자 수: {}", participations.size());

        List<ParticipantDto> participants = participations.stream()
                .map(p -> ParticipantDto.builder()
                        .userId(p.getUser().getUserId())
                        .username(p.getUser().getUsername())
                        .profileImage(p.getUser().getProfileImageUrl())
                        .status(p.getStatus().name())
                        .joinedAt(p.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        log.info("📦 변환된 참여자 DTO 수: {}", participants.size());

        MeetingDetailResponse response = MeetingDetailResponse.builder()
                .meetingId(meeting.getMeetingId())
                .chatRoomId(meeting.getChatRoom() != null ? meeting.getChatRoom().getId() : null)
                .organizerId(meeting.getOrganizer().getUserId())
                .organizerUsername(meeting.getOrganizer().getUsername())
                .organizerProfileImage(meeting.getOrganizer().getProfileImageUrl())
                .organizerEmail(meeting.getOrganizer().getEmail())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .category(meeting.getCategory())
                .subcategory(meeting.getSubcategory())
                .meetingTime(meeting.getMeetingTime())
                .timeSlot(meeting.getTimeSlot().name())
                .locationName(meeting.getLocationName())
                .locationAddress(meeting.getLocationAddress())
                .latitude(meeting.getLatitude())
                .longitude(meeting.getLongitude())
                .locationType(meeting.getLocationType().name())
                .vibe(meeting.getVibe())
                .currentParticipants(meeting.getCurrentParticipants())
                .maxParticipants(meeting.getMaxParticipants())
                .expectedCost(meeting.getExpectedCost())
                .imageUrl(meeting.getImageUrl())
                .status(meeting.getStatus().name())
                .avgRating(meeting.getAvgRating() != null ? meeting.getAvgRating() : 0.0)
                .reviewCount((long) (meeting.getReviewCount() != null ? meeting.getReviewCount() : 0))
                .createdAt(meeting.getCreatedAt())
                .isFull(meeting.getCurrentParticipants() >= meeting.getMaxParticipants())
                .dDay((long) calculateDDay(meeting.getMeetingTime()))
                .participants(participants)
                .build();

        log.info("✅ 응답 생성 완료 - participants 포함: {}", response.getParticipants() != null);

        return response;
    }

    private int calculateDDay(LocalDateTime meetingTime) {
        return (int) ChronoUnit.DAYS.between(LocalDate.now(), meetingTime.toLocalDate());
    }

    /**
     * 모임 이미지 업로드 (실시간 알림 추가!)
     */
    @Transactional
    public String uploadMeetingImage(User user, Long meetingId, MultipartFile image) {
        log.info("📸 모임 이미지 업로드 시작 - meetingId: {}, userId: {}", meetingId, user.getUserId());

        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다."));

        if (!meeting.getOrganizer().getUserId().equals(user.getUserId())) {
            throw new IllegalArgumentException("모임 주최자만 이미지를 변경할 수 있습니다.");
        }

        if (image.isEmpty()) {
            throw new IllegalArgumentException("이미지 파일이 비어있습니다.");
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 업로드 가능합니다.");
        }

        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = image.getOriginalFilename();
            String extension = originalFilename != null ?
                    originalFilename.substring(originalFilename.lastIndexOf(".")) : ".jpg";
            String savedFilename = UUID.randomUUID().toString() + extension;

            Path filePath = uploadPath.resolve(savedFilename);
            Files.copy(image.getInputStream(), filePath);

            String imageUrl = "/uploads/meetings/" + savedFilename;

            meeting.updateImageUrl(imageUrl);

            log.info("✅ 이미지 업로드 완료 - imageUrl: {}", imageUrl);

            notifyMeetingUpdatedToParticipants(meetingId, "imageUrl", imageUrl);

            return imageUrl;

        } catch (IOException e) {
            log.error("❌ 파일 저장 실패", e);
            throw new RuntimeException("파일 저장에 실패했습니다.", e);
        }
    }

    /**
     * 모임 정보 변경 시 모든 참여자에게 WebSocket 알림
     */
    private void notifyMeetingUpdatedToParticipants(Long meetingId, String field, Object value) {
        try {
            log.info("🔔 모임 업데이트 알림 시작 - meetingId: {}, field: {}", meetingId, field);

            List<Participation> participations = participationRepository
                    .findByMeetingIdAndStatus(meetingId, ParticipationStatus.APPROVED);

            log.info("📋 조회된 참여자 수: {}", participations.size());

            int count = 0;
            for (Participation participation : participations) {
                Long userId = participation.getUser().getUserId();
                pushNotificationService.pushMeetingUpdated(userId, meetingId, field, value);
                count++;
            }

            log.info("📤 모임 업데이트 알림 전송 완료: meetingId={}, field={}, 참여자 {}명", meetingId, field, count);
        } catch (Exception e) {
            log.error("❌ 모임 업데이트 알림 전송 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 여러 모임 ID로 배치 조회
     */
    public Map<String, Object> getMeetingsByIds(List<Long> meetingIds) {
        if (meetingIds == null || meetingIds.isEmpty()) {
            return Map.of("meetings", List.of());
        }

        List<Meeting> meetings = meetingRepository.findAllById(meetingIds);

        List<Map<String, Object>> meetingList = meetings.stream()
                .map(this::convertToMap)
                .collect(Collectors.toList());

        return Map.of("meetings", meetingList);
    }

    // ========================================
// MeetingService.java에 아래 메서드 추가!
// ========================================

    /**
     * ✅ 카테고리별 모임 개수 조회
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getCategoryStats() {
        log.info("📊 카테고리별 모임 통계 조회");

        List<Object[]> results = meetingRepository.countByCategory();

        Map<String, Long> stats = new HashMap<>();
        long total = 0;

        for (Object[] row : results) {
            String category = (String) row[0];
            Long count = (Long) row[1];

            if (category != null) {
                stats.put(category, count);
                total += count;
            }
        }

        stats.put("total", total);

        log.info("✅ 카테고리 통계: {}", stats);

        return stats;
    }

    /**
     * ✅ 카테고리별 상세 통계 (모임 수, 참여 멤버, 평균 평점)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getCategoryDetailStats() {
        log.info("📊 카테고리별 상세 통계 조회");

        List<Object[]> results = meetingRepository.getCategoryDetailStats();

        Map<String, Object> response = new HashMap<>();
        long totalMeetings = 0;
        long totalMembers = 0;
        double totalRatingSum = 0;
        int ratingCount = 0;

        for (Object[] row : results) {
            String category = (String) row[0];
            Long meetingCount = (Long) row[1];
            Long memberCount = ((Number) row[2]).longValue();
            Double avgRating = ((Number) row[3]).doubleValue();

            if (category != null) {
                Map<String, Object> categoryStats = new HashMap<>();
                categoryStats.put("meetings", meetingCount);
                categoryStats.put("members", memberCount);
                categoryStats.put("rating", Math.round(avgRating * 10.0) / 10.0);  // 소수점 1자리

                response.put(category, categoryStats);

                totalMeetings += meetingCount;
                totalMembers += memberCount;
                if (avgRating > 0) {
                    totalRatingSum += avgRating * meetingCount;
                    ratingCount += meetingCount;
                }
            }
        }

        // 전체 통계
        Map<String, Object> totalStats = new HashMap<>();
        totalStats.put("meetings", totalMeetings);
        totalStats.put("members", totalMembers);
        totalStats.put("rating", ratingCount > 0 ? Math.round((totalRatingSum / ratingCount) * 10.0) / 10.0 : 0.0);
        response.put("total", totalStats);

        log.info("✅ 카테고리 상세 통계 조회 완료");

        return response;
    }
// ========================================
// MeetingService.java에 아래 메서드 추가!
// ========================================


    private Map<String, Object> convertToMap(Meeting meeting) {
        Map<String, Object> map = new HashMap<>();

        map.put("id", meeting.getMeetingId());
        map.put("category", meeting.getCategory());
        map.put("vibe", meeting.getVibe());
        map.put("latitude", meeting.getLatitude());
        map.put("longitude", meeting.getLongitude());
        map.put("timeSlot", meeting.getTimeSlot());
        map.put("locationType", meeting.getLocationType());
        map.put("expectedCost", meeting.getExpectedCost());
        map.put("maxParticipants", meeting.getMaxParticipants());

        map.put("avgRating", calculateAvgRating(meeting));
        map.put("ratingCount", getRatingCount(meeting));
        map.put("participantCount", getParticipantCount(meeting));

        return map;
    }

    private Double calculateAvgRating(Meeting meeting) {
        return 4.0;
    }

    private Integer getRatingCount(Meeting meeting) {
        return 5;
    }

    private Integer getParticipantCount(Meeting meeting) {
        return meeting.getCurrentParticipants();
    }
}