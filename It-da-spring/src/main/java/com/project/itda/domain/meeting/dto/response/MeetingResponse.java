package com.project.itda.domain.meeting.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 모임 기본 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingResponse {

    /**
     * 모임 ID
     */
    private Long meetingId;

    /**
     * ✅ 추가: 모임과 연결된 채팅방 ID
     */
    private Long chatRoomId;

    /**
     * 주최자 ID
     */
    private Long organizerId;

    /**
     * 주최자 닉네임
     */
    private String organizerUsername;

    /**
     * 주최자 프로필 이미지
     */
    private String organizerProfileImage;

    /**
     * 모임 제목
     */
    private String title;

    /**
     * 모임 설명
     */
    private String description;

    /**
     * 대분류
     */
    private String category;

    /**
     * 소분류
     */
    private String subcategory;

    /**
     * 모임 일시
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime meetingTime;

    /**
     * 시간대 (MORNING/AFTERNOON/EVENING/NIGHT)
     */
    private String timeSlot;

    /**
     * 장소명
     */
    private String locationName;

    /**
     * 상세 주소
     */
    private String locationAddress;

    /**
     * 위도
     */
    private Double latitude;

    /**
     * 경도
     */
    private Double longitude;

    /**
     * 장소 유형 (INDOOR/OUTDOOR)
     */
    private String locationType;

    /**
     * 분위기
     */
    private String vibe;

    /**
     * 현재 참가자 수
     */
    private Integer currentParticipants;

    /**
     * 최대 참가자 수
     */
    private Integer maxParticipants;

    /**
     * 예상 비용
     */
    private Integer expectedCost;

    /**
     * 대표 이미지 URL
     */
    private String imageUrl;

    /**
     * 모임 상태 (RECRUITING/FULL/CANCELLED/COMPLETED)
     */
    private String status;

    /**
     * 평균 평점
     */
    private Double avgRating;

    /**
     * 평점 개수
     */
    private Integer ratingCount;

    /**
     * 생성일
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    /**
     * 수정일
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    /**
     * 모임 마감 여부
     */
    private Boolean isFull;

    /**
     * D-Day (남은 일수)
     */
    private Long dDay;

    /**
     * 태그 (JSON 배열)
     */
    private String tags;

}