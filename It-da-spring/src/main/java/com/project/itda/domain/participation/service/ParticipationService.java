// src/main/java/com/project/itda/domain/participation/service/ParticipationService.java
package com.project.itda.domain.participation.service;

import com.project.itda.domain.badge.event.ParticipationCompletedEvent;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.enums.MeetingStatus;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.notification.service.NotificationService;
import com.project.itda.domain.participation.dto.request.ParticipationRequest;
import com.project.itda.domain.participation.dto.request.ParticipationStatusRequest;
import com.project.itda.domain.participation.dto.response.ParticipantListResponse;
import com.project.itda.domain.participation.dto.response.ParticipationResponse;
import com.project.itda.domain.participation.dto.response.MyRecentMeetingResponse;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserFollow;
import com.project.itda.domain.user.repository.UserFollowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 참여 서비스 (알림 + 배지 연동)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ParticipationService {

    private final ParticipationRepository participationRepository;
    private final MeetingRepository meetingRepository;
    private final NotificationService notificationService;
    private final UserFollowRepository userFollowRepository;
    private final ApplicationEventPublisher eventPublisher;  // ⭐ 추가!

    /**
     * 모임 참여 신청
     */
    @Transactional
    public ParticipationResponse applyParticipation(User user, ParticipationRequest request) {
        log.info("📝 모임 참여 신청 - userId: {}, meetingId: {}",
                user.getUserId(), request.getMeetingId());

        // 1. 모임 조회
        Meeting meeting = meetingRepository.findById(request.getMeetingId())
                .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다"));

        // 2. 이미 신청했는지 확인
        if (participationRepository.existsByUserIdAndMeetingId(user.getUserId(), meeting.getMeetingId())) {
            throw new IllegalStateException("이미 신청한 모임입니다");
        }

        // 3. 주최자는 신청 불가
        if (meeting.isOrganizer(user.getUserId())) {
            throw new IllegalStateException("주최자는 참여 신청을 할 수 없습니다");
        }

        // 4. 모임 마감 확인
        if (meeting.isFull()) {
            throw new IllegalStateException("모임 정원이 마감되었습니다");
        }

        // 5. 거리 계산 (Haversine)
        Double distance = calculateDistance(
                user.getLatitude(), user.getLongitude(),
                meeting.getLatitude(), meeting.getLongitude()
        );

        // 6. 참여 엔티티 생성
        Participation participation = Participation.builder()
                .user(user)
                .meeting(meeting)
                .status(ParticipationStatus.PENDING)
                .applicationMessage(request.getApplicationMessage())
                .recommendationType(request.getRecommendationType())
                .distanceKm(distance)
                .build();

        Participation saved = participationRepository.save(participation);

        log.info("✅ 참여 신청 완료 - participationId: {}", saved.getParticipationId());

        // ✅ 모임장에게 알림 (누군가 참가 신청함)
        try {
            User organizer = meeting.getOrganizer();
            if (organizer != null && !organizer.getUserId().equals(user.getUserId())) {
                notificationService.notifyMeetingJoin(organizer, user, meeting.getMeetingId(), meeting.getTitle());
                log.info("🔔 모임장에게 참가 신청 알림 전송: {} -> {}", user.getUsername(), organizer.getUsername());
            }
        } catch (Exception e) {
            log.error("❌ 모임장 알림 전송 실패: {}", e.getMessage());
        }

        // ✅ 참가자를 팔로우하는 사람들에게 알림
        try {
            notifyFollowersAboutMeetingJoin(user, meeting);
        } catch (Exception e) {
            log.error("❌ 팔로워 알림 전송 실패: {}", e.getMessage());
        }

        return toParticipationResponse(saved);
    }

    /**
     * ✅ 팔로워들에게 모임 참가 알림
     */
    private void notifyFollowersAboutMeetingJoin(User participant, Meeting meeting) {
        List<UserFollow> followers = userFollowRepository.findByFollowing(participant);

        int count = 0;
        for (UserFollow follow : followers) {
            User follower = follow.getFollower();
            if (!follower.getUserId().equals(participant.getUserId())
                    && !follower.getUserId().equals(meeting.getOrganizer().getUserId())) {
                notificationService.notifyFollowerMeetingJoin(
                        follower,
                        participant,
                        meeting.getMeetingId(),
                        meeting.getTitle()
                );
                count++;
            }
        }
        log.info("🔔 팔로워 {}명에게 모임 참가 알림 전송", count);
    }

    /**
     * 참여 승인 (주최자만)
     */
    @Transactional
    public ParticipationResponse approveParticipation(User organizer, Long participationId) {
        log.info("✅ 참여 승인 - organizerId: {}, participationId: {}",
                organizer.getUserId(), participationId);

        Participation participation = findById(participationId);
        Meeting meeting = participation.getMeeting();

        if (!meeting.isOrganizer(organizer.getUserId())) {
            throw new IllegalStateException("주최자만 승인할 수 있습니다");
        }

        participation.approve();
        meeting.addParticipant();

        log.info("✅ 참여 승인 완료 - participationId: {}", participationId);

        // ✅ 참여자에게 승인 알림 + 참여 모임 카운트 업데이트
        try {
            User participant = participation.getUser();

            // 참여 모임 카운트 조회
            long participationCount = participationRepository.countByUserIdAndStatus(
                    participant.getUserId(), ParticipationStatus.APPROVED);

            // WebSocket으로 참여자에게 업데이트 전송
            notificationService.notifyParticipationApproved(
                    participant,
                    meeting.getMeetingId(),
                    meeting.getTitle(),
                    participationCount
            );
            log.info("🔔 참여 승인 알림 전송: {} (참여 모임: {}개)", participant.getUsername(), participationCount);
        } catch (Exception e) {
            log.error("❌ 참여 승인 알림 전송 실패: {}", e.getMessage());
        }

        return toParticipationResponse(participation);
    }

    /**
     * 참여 거절 (주최자만)
     */
    @Transactional
    public ParticipationResponse rejectParticipation(
            User organizer,
            Long participationId,
            ParticipationStatusRequest request
    ) {
        log.info("❌ 참여 거절 - organizerId: {}, participationId: {}",
                organizer.getUserId(), participationId);

        Participation participation = findById(participationId);
        Meeting meeting = participation.getMeeting();

        if (!meeting.isOrganizer(organizer.getUserId())) {
            throw new IllegalStateException("주최자만 거절할 수 있습니다");
        }

        participation.reject(request.getRejectionReason());

        log.info("✅ 참여 거절 완료 - participationId: {}", participationId);

        return toParticipationResponse(participation);
    }

    /**
     * 참여 취소 (신청자 본인)
     */
    @Transactional
    public void cancelParticipation(User user, Long participationId) {
        log.info("🚫 참여 취소 - userId: {}, participationId: {}",
                user.getUserId(), participationId);

        Participation participation = findById(participationId);

        if (!participation.getUser().getUserId().equals(user.getUserId())) {
            throw new IllegalStateException("본인만 취소할 수 있습니다");
        }

        if (participation.getStatus() == ParticipationStatus.APPROVED) {
            Meeting meeting = participation.getMeeting();
            meeting.removeParticipant();
        }

        participation.cancel();

        log.info("✅ 참여 취소 완료 - participationId: {}", participationId);
    }

    /**
     * 모임의 참여자 목록 조회
     */
    @Transactional(readOnly = true)
    public ParticipantListResponse getParticipantsByMeetingId(Long meetingId) {
        log.info("📋 모임 참여자 목록 조회 - meetingId: {}", meetingId);

        List<Participation> participations = participationRepository.findByMeetingId(meetingId);

        List<ParticipationResponse> responses = participations.stream()
                .map(this::toParticipationResponse)
                .collect(Collectors.toList());

        long pendingCount = participations.stream()
                .filter(p -> p.getStatus() == ParticipationStatus.PENDING).count();
        long approvedCount = participations.stream()
                .filter(p -> p.getStatus() == ParticipationStatus.APPROVED).count();
        long rejectedCount = participations.stream()
                .filter(p -> p.getStatus() == ParticipationStatus.REJECTED).count();
        long cancelledCount = participations.stream()
                .filter(p -> p.getStatus() == ParticipationStatus.CANCELLED).count();
        long completedCount = participations.stream()
                .filter(p -> p.getStatus() == ParticipationStatus.COMPLETED).count();

        return ParticipantListResponse.builder()
                .success(true)
                .message("참여자 목록 조회 성공")
                .participants(responses)
                .totalCount(participations.size())
                .statusStats(ParticipantListResponse.StatusStats.builder()
                        .pendingCount(pendingCount)
                        .approvedCount(approvedCount)
                        .rejectedCount(rejectedCount)
                        .cancelledCount(cancelledCount)
                        .completedCount(completedCount)
                        .build())
                .build();
    }

    /**
     * 사용자의 참여 목록 조회
     */
    @Transactional(readOnly = true)
    public List<ParticipationResponse> getParticipationsByUserId(Long userId) {
        log.info("📋 사용자 참여 목록 조회 - userId: {}", userId);

        List<Participation> participations = participationRepository.findByUserId(userId);

        return participations.stream()
                .map(this::toParticipationResponse)
                .collect(Collectors.toList());
    }

    /**
     * ✅ 내가 참여 중인 모임 + 내가 주최한 모임 목록 (홈페이지 최근 접속용)
     * APPROVED 또는 COMPLETED 상태의 모임 + 내가 주최한 모임을 최근 활동순으로 반환
     */
    @Transactional(readOnly = true)
    public List<MyRecentMeetingResponse> getMyRecentMeetings(Long userId, int limit) {
        log.info("📋 최근 참여/주최 모임 조회 - userId: {}, limit: {}", userId, limit);

        // 1. APPROVED 상태 모임 조회
        List<Participation> approvedList = participationRepository.findByUserIdAndStatus(
                userId, ParticipationStatus.APPROVED);

        // 2. COMPLETED 상태 모임 조회
        List<Participation> completedList = participationRepository.findByUserIdAndStatus(
                userId, ParticipationStatus.COMPLETED);

        // 3. 참여 모임 합치기
        List<Participation> allParticipations = new java.util.ArrayList<>();
        allParticipations.addAll(approvedList);
        allParticipations.addAll(completedList);

        // 4. 참여 모임 → Response 변환
        List<MyRecentMeetingResponse> responses = new java.util.ArrayList<>(
                allParticipations.stream()
                        .map(this::toMyRecentMeetingResponse)
                        .collect(Collectors.toList())
        );

        // 5. ✅ 내가 주최한 모임 조회 (participation에 없는 기존 모임용)
        List<Meeting> myMeetings = meetingRepository.findByOrganizerUserId(userId);

        // 6. 이미 participation에 있는 모임 ID 수집
        java.util.Set<Long> participationMeetingIds = allParticipations.stream()
                .map(p -> p.getMeeting().getMeetingId())
                .collect(Collectors.toSet());

        // 7. participation에 없는 주최 모임만 추가
        for (Meeting meeting : myMeetings) {
            if (!participationMeetingIds.contains(meeting.getMeetingId())) {
                responses.add(toMyRecentMeetingResponseFromMeeting(meeting));
                log.info("✅ 주최 모임 추가: meetingId={}, title={}", meeting.getMeetingId(), meeting.getTitle());
            }
        }

        // 8. 최근순 정렬 후 limit 적용
        return responses.stream()
                .sorted(Comparator.comparing(MyRecentMeetingResponse::getLastActivityAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * ✅ Meeting → MyRecentMeetingResponse 변환 (주최자용)
     */
    private MyRecentMeetingResponse toMyRecentMeetingResponseFromMeeting(Meeting meeting) {
        LocalDateTime lastActivity = meeting.getUpdatedAt() != null ? meeting.getUpdatedAt() : meeting.getCreatedAt();

        return MyRecentMeetingResponse.builder()
                .meetingId(meeting.getMeetingId())
                .title(meeting.getTitle())
                .category(meeting.getCategory())
                .subcategory(meeting.getSubcategory())
                .icon(getCategoryIcon(meeting.getCategory()))
                .timeAgo(getTimeAgo(lastActivity))
                .type("chat")  // 채팅방으로 이동
                .meetingTime(meeting.getMeetingTime())
                .status("ORGANIZER")  // 주최자임을 표시
                .lastActivityAt(lastActivity)
                .build();
    }

    /**
     * 마지막 활동 시간 계산
     */
    private LocalDateTime getLastActivityTime(Participation p) {
        if (p.getCompletedAt() != null) return p.getCompletedAt();
        if (p.getApprovedAt() != null) return p.getApprovedAt();
        return p.getAppliedAt();
    }

    /**
     * Participation → MyRecentMeetingResponse 변환
     */
    private MyRecentMeetingResponse toMyRecentMeetingResponse(Participation participation) {
        Meeting meeting = participation.getMeeting();
        LocalDateTime lastActivity = getLastActivityTime(participation);

        return MyRecentMeetingResponse.builder()
                .meetingId(meeting.getMeetingId())
                .chatRoomId(meeting.getChatRoom() != null ? meeting.getChatRoom().getId() : null)
                .title(meeting.getTitle())
                .category(meeting.getCategory())
                .subcategory(meeting.getSubcategory())
                .icon(getCategoryIcon(meeting.getCategory()))
                .timeAgo(getTimeAgo(lastActivity))
                .type("chat")  // 채팅방으로 이동
                .meetingTime(meeting.getMeetingTime())
                .status(participation.getStatus().name())
                .lastActivityAt(lastActivity)
                .build();
    }

    /**
     * 카테고리별 아이콘 반환
     */
    private String getCategoryIcon(String category) {
        if (category == null) return "📅";

        switch (category) {
            case "스포츠": return "🏃";
            case "맛집": return "🍽️";
            case "문화예술": return "🎨";
            case "스터디": return "📚";
            case "취미활동": return "🎸";
            case "소셜": return "🎉";
            default: return "📅";
        }
    }

    /**
     * 시간 차이를 문자열로 변환
     */
    private String getTimeAgo(LocalDateTime dateTime) {
        if (dateTime == null) return "";

        LocalDateTime now = LocalDateTime.now();
        long minutes = ChronoUnit.MINUTES.between(dateTime, now);
        long hours = ChronoUnit.HOURS.between(dateTime, now);
        long days = ChronoUnit.DAYS.between(dateTime, now);

        if (minutes < 1) return "방금 전";
        if (minutes < 60) return minutes + "분 전";
        if (hours < 24) return hours + "시간 전";
        if (days == 1) return "어제";
        if (days < 7) return days + "일 전";
        if (days < 30) return (days / 7) + "주일 전";
        return (days / 30) + "개월 전";
    }

    /**
     * 참여 단건 조회
     */
    @Transactional(readOnly = true)
    public Participation findById(Long participationId) {
        return participationRepository.findById(participationId)
                .orElseThrow(() -> new IllegalArgumentException("참여 정보를 찾을 수 없습니다"));
    }

    /**
     * Haversine 공식으로 거리 계산 (km)
     */
    private Double calculateDistance(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return null;
        }

        double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;

        return Math.round(distance * 100.0) / 100.0;
    }

    /**
     * ✅ 모임 마감 (주최자만)
     * 모든 APPROVED 참여자를 COMPLETED로 변경 + 실시간 알림 + 배지 이벤트
     */
    @Transactional
    public int completeMeeting(User organizer, Long meetingId) {
        log.info("🏁 모임 마감 - organizerId: {}, meetingId: {}", organizer.getUserId(), meetingId);

        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다"));

        // 주최자 확인
        if (!meeting.isOrganizer(organizer.getUserId())) {
            throw new IllegalStateException("주최자만 모임을 마감할 수 있습니다");
        }

        meeting.updateStatus(MeetingStatus.COMPLETED);
        meetingRepository.save(meeting);

        // APPROVED 상태인 모든 참여자 조회
        List<Participation> approvedParticipations = participationRepository
                .findByMeetingIdAndStatus(meetingId, ParticipationStatus.APPROVED);

        // 각 참여자를 COMPLETED로 변경 + 알림 전송 + 배지 이벤트
        int count = 0;
        for (Participation participation : approvedParticipations) {
            participation.complete();
            count++;

            // ✅ 각 참여자에게 모임 완료 알림 전송 (실시간!)
            try {
                notificationService.notifyMeetingCompleted(
                        participation.getUser(),
                        meeting.getMeetingId(),
                        meeting.getTitle()
                );
                log.info("🔔 모임 완료 알림 전송: userId={}", participation.getUser().getUserId());
            } catch (Exception e) {
                log.error("❌ 알림 전송 실패: {}", e.getMessage());
            }

            // ⭐ 배지 이벤트 발행 (참여 완료 시 배지 자동 체크!)
            eventPublisher.publishEvent(new ParticipationCompletedEvent(participation.getUser().getUserId()));
            log.info("🏅 배지 이벤트 발행: userId={}", participation.getUser().getUserId());
        }

        log.info("🏁 모임 마감 완료 - meetingId: {}, completedCount: {}", meetingId, count);

        return count;
    }

    /**
     * Participation → ParticipationResponse 변환
     */
    private ParticipationResponse toParticipationResponse(Participation participation) {
        return ParticipationResponse.builder()
                .participationId(participation.getParticipationId())
                .userId(participation.getUser().getUserId())
                .username(participation.getUser().getUsername())
                .userProfileImage(participation.getUser().getProfileImageUrl())
                .meetingId(participation.getMeeting().getMeetingId())
                .meetingTitle(participation.getMeeting().getTitle())
                .status(participation.getStatus().name())
                .applicationMessage(participation.getApplicationMessage())
                .rejectionReason(participation.getRejectionReason())
                .distanceKm(participation.getDistanceKmAsDouble())
                .recommendationType(participation.getRecommendationType())
                .predictedRating(participation.getPredictedRatingAsDouble())
                .appliedAt(participation.getAppliedAt())
                .approvedAt(participation.getApprovedAt())
                .completedAt(participation.getCompletedAt())
                .build();
    }
    /**
     * ✅ 초대 수락으로 인한 모임 참여 처리 (즉시 승인)
     */
    @Transactional
    public void approveParticipationFromInvite(Long meetingId, User user) {
        log.info("📩 초대 수락으로 인한 모임 참여 처리 - userId: {}, meetingId: {}",
                user.getUserId(), meetingId);

        // 1. 모임 조회
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다"));

        // 2. 이미 신청/참여 정보가 있는지 확인
        // (findByUserIdAndMeetingId 메서드가 Repository에 없다면 Optional<Participation> 반환형으로 추가 필요)
        boolean alreadyParticipated = participationRepository.existsByUserIdAndMeetingId(user.getUserId(), meetingId);

        if (alreadyParticipated) {
            log.info("ℹ️ 이미 참여 정보가 존재합니다. userId={}, meetingId={}", user.getUserId(), meetingId);
            return;
        }

        // 3. 참여 엔티티 생성 및 즉시 승인(APPROVED) 상태 설정
        Participation participation = Participation.builder()
                .user(user)
                .meeting(meeting)
                .status(ParticipationStatus.APPROVED) // 초대 수락이므로 즉시 승인
                .appliedAt(LocalDateTime.now())
                .approvedAt(LocalDateTime.now())
                .build();

        participationRepository.save(participation);

        // 4. 모임 엔티티의 참여 인원수 증가
        meeting.addParticipant();

        log.info("✅ 초대 수락 참여 처리 완료 - userId: {}, meetingId: {}",
                user.getUserId(), meetingId);
    }

}