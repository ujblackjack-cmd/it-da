package com.project.itda.domain.meeting.service;

import com.project.itda.domain.meeting.dto.request.MeetingCreateRequest;
import com.project.itda.domain.meeting.dto.request.MeetingUpdateRequest;
import com.project.itda.domain.meeting.dto.response.MeetingDetailResponse;
import com.project.itda.domain.meeting.dto.response.MeetingResponse;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.enums.MeetingStatus;
import com.project.itda.domain.meeting.enums.MeetingTimeSlot;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.participation.dto.response.ParticipantDto;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * 모임 서비스 (CRUD)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final ParticipationRepository participationRepository;

    // ✅ 이미지 저장 경로 설정 (application.yml에서 관리하는 게 더 좋음)
    private final String uploadDir = "uploads/meetings/";

    /**
     * 모임 생성
     */
    @Transactional
    public MeetingResponse createMeeting(User user, MeetingCreateRequest request) {
        log.info("📍 POST /api/meetings - userId: {}", user.getUserId());

        // 시간대 자동 설정
        MeetingTimeSlot timeSlot = MeetingTimeSlot.fromHour(request.getMeetingTime().getHour());

        // LocationType Enum 변환
        Meeting.LocationType locationType = Meeting.LocationType.valueOf(
                request.getLocationType().toString().toUpperCase()
        );

        Meeting meeting = Meeting.builder()
                .organizer(user)
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
                .currentParticipants(1)  // 주최자 포함
                .expectedCost(request.getExpectedCost() != null ? request.getExpectedCost() : 0)
                .status(MeetingStatus.RECRUITING)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : true)
                .imageUrl(request.getImageUrl())
                .tags(request.getTags())
                .build();

        Meeting savedMeeting = meetingRepository.save(meeting);

        // ✅ 주최자를 참여자로 자동 등록 (APPROVED 상태)
        Participation organizerParticipation = Participation.builder()
                .user(user)
                .meeting(savedMeeting)
                .status(ParticipationStatus.APPROVED)
                .applicationMessage("모임 주최자")
                .build();
        participationRepository.save(organizerParticipation);

        log.info("✅ 모임 생성 완료 - meetingId: {}, 주최자 참여 등록 완료", savedMeeting.getMeetingId());

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

        // 주최자 확인
        if (!meeting.isOrganizer(user.getUserId())) {
            throw new IllegalStateException("주최자만 모임을 수정할 수 있습니다");
        }

        // LocationType 변환
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

        // 참여자 목록 조회 (APPROVED 상태만)
        List<Participation> participations = participationRepository
                .findByMeetingAndStatus(meeting, ParticipationStatus.APPROVED);

        log.info("👥 조회된 참여자 수: {}", participations.size());

        // 참여자 DTO 변환
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
                .participants(participants)  // 이 부분이 중요!
                .build();

        log.info("✅ 응답 생성 완료 - participants 포함: {}", response.getParticipants() != null);

        return response;
    }

    private int calculateDDay(LocalDateTime meetingTime) {
        return (int) ChronoUnit.DAYS.between(LocalDate.now(), meetingTime.toLocalDate());
    }

    @Transactional
    public String uploadMeetingImage(User user, Long meetingId, MultipartFile image) {
        log.info("📸 모임 이미지 업로드 시작 - meetingId: {}, userId: {}", meetingId, user.getUserId());

        // 1. 모임 조회
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다."));

        // 2. 권한 확인
        if (!meeting.getOrganizer().getUserId().equals(user.getUserId())) {
            throw new IllegalArgumentException("모임 주최자만 이미지를 변경할 수 있습니다.");
        }

        // 3. 파일 검증
        if (image.isEmpty()) {
            throw new IllegalArgumentException("이미지 파일이 비어있습니다.");
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 업로드 가능합니다.");
        }

        // 4. 파일 저장
        try {
            // 업로드 디렉토리 생성
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 고유한 파일명 생성
            String originalFilename = image.getOriginalFilename();
            String extension = originalFilename != null ?
                    originalFilename.substring(originalFilename.lastIndexOf(".")) : ".jpg";
            String savedFilename = UUID.randomUUID().toString() + extension;

            // 파일 저장
            Path filePath = uploadPath.resolve(savedFilename);
            Files.copy(image.getInputStream(), filePath);

            // ✅ 5. 상대 경로로 저장 (UserProfile처럼)
            String imageUrl = "/uploads/meetings/" + savedFilename;

            // 6. Meeting 엔티티에 이미지 URL 저장
            meeting.updateImageUrl(imageUrl);

            log.info("✅ 이미지 업로드 완료 - imageUrl: {}", imageUrl);

            return imageUrl;

        } catch (IOException e) {
            log.error("❌ 파일 저장 실패", e);
            throw new RuntimeException("파일 저장에 실패했습니다.", e);
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

    /**
     * Meeting 엔티티 → Map 변환 (AI 서버용)
     */
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

        // 평균 평점, 평점 개수, 참여자 수 (계산 필요시)
        map.put("avgRating", calculateAvgRating(meeting));
        map.put("ratingCount", getRatingCount(meeting));
        map.put("participantCount", getParticipantCount(meeting));

        return map;
    }

    // ===== 헬퍼 메서드 (실제 로직에 맞게 수정) =====

    private Double calculateAvgRating(Meeting meeting) {
        // TODO: 실제 평점 계산 로직
        // 예: reviewRepository.getAvgRating(meeting.getId());
        return 4.0; // 임시
    }

    private Integer getRatingCount(Meeting meeting) {
        // TODO: 실제 평점 개수 조회
        return 5; // 임시
    }

    private Integer getParticipantCount(Meeting meeting) {
        // TODO: 실제 참여자 수 조회
        // 예: participationRepository.countByMeetingId(meeting.getId());
        return meeting.getCurrentParticipants(); // 또는 다른 필드
    }
}