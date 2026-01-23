package com.project.itda.domain.ai.controller;

import com.project.itda.domain.ai.dto.request.MatchScoresRequest;
import com.project.itda.domain.ai.dto.request.MatchScoresRequestDto;
import com.project.itda.domain.ai.dto.request.SentimentAnalysisRequest;
import com.project.itda.domain.ai.dto.response.*;
import com.project.itda.domain.ai.service.*;
import com.project.itda.domain.meeting.entity.Meeting;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AI 추천 컨트롤러 (통합 완성)
 */
@Tag(name = "AI 추천", description = "AI 기반 모임 추천 API")
@RestController
@RequestMapping("/api/ai/recommendations")
@RequiredArgsConstructor
@Slf4j
public class AiRecommendationController {

    private final AiRecommendationService aiRecommendationService;
    private final SatisfactionPredictionService satisfactionPredictionService;
    private final PlaceRecommendService placeRecommendService;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final AIServiceClient aiServiceClient;
    private final MatchScoreService matchScoreService;  // ✅ 추가
    private final PersonalizedRecommendService personalizedRecommendService;
    private final MeetingRecommendationService recommendationService;

    // ========================================================================
    // Step 2: SVD 모임 추천
    // ========================================================================

    /**
     * SVD 협업 필터링 기반 모임 추천
     *
     * GET /api/ai/recommendations/meetings?userId=3&topN=10
     */
    @Operation(
            summary = "AI 모임 추천",
            description = "SVD 협업 필터링을 사용하여 사용자 맞춤 모임을 추천합니다"
    )
    @GetMapping("/meetings")
    public ResponseEntity<AiRecommendListResponse> recommendMeetings(
            @Parameter(description = "사용자 ID", required = true)
            @RequestParam("user_id") Long userId,

            @Parameter(description = "추천 개수 (기본: 10, 최대: 50)")
            @RequestParam(value = "top_n", defaultValue = "10") Integer topN
    ) {
        log.info("📍 GET /api/ai/recommendations/meetings - userId: {}, topN: {}", userId, topN);

        if (topN > 50) {
            topN = 50;
        }

        AiRecommendListResponse response = aiRecommendationService.recommendMeetings(userId, topN);

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // Step 3: LightGBM 만족도 예측
    // ========================================================================

    /**
     * 모임 상세 페이지 만족도 예측
     *
     * GET /api/ai/recommendations/satisfaction?userId=3&meetingId=15
     */
    @Operation(
            summary = "모임 만족도 예측",
            description = "LightGBM Ranker를 사용하여 사용자의 모임 만족도를 예측합니다"
    )
    @GetMapping("/satisfaction")
    public ResponseEntity<SatisfactionPredictionDTO> predictSatisfaction(
            @Parameter(description = "사용자 ID", required = true)
            @RequestParam Long userId,

            @Parameter(description = "모임 ID", required = true)
            @RequestParam Long meetingId
    ) {
        log.info("📍 GET /api/ai/recommendations/satisfaction - userId: {}, meetingId: {}",
                userId, meetingId);

        SatisfactionPredictionDTO response = satisfactionPredictionService.predictSatisfaction(
                userId, meetingId
        );

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // Step 4: 장소 추천
    // ========================================================================

    /**
     * 모임 기반 장소 추천 (POST 방식)
     *
     * @param meetingId 모임 ID
     * @return 추천 장소 목록
     */
    @PostMapping("/meetings/{meetingId}/recommend-place")
    public ResponseEntity<PlaceRecommendationDTO> recommendPlace(
            @PathVariable Long meetingId
    ) {
        log.info("🤖 장소 추천 요청 - Meeting ID: {}", meetingId);

        try {
            PlaceRecommendationDTO result = recommendationService.recommendPlacesForMeeting(meetingId);
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            log.error("❌ 잘못된 요청: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                    PlaceRecommendationDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .build()
            );

        } catch (Exception e) {
            log.error("❌ 장소 추천 실패: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(
                    PlaceRecommendationDTO.builder()
                            .success(false)
                            .message("장소 추천에 실패했습니다: " + e.getMessage())
                            .build()
            );
        }
    }

    /**
     * 채팅방 ID 기반 장소 추천 (POST)
     *
     * POST /api/ai/recommendations/recommend-place
     * Body: { "chatRoomId": 101 } 또는 { "meetingId": 1 }
     */
    @PostMapping("/recommend-place")
    public ResponseEntity<PlaceRecommendationDTO> recommendPlace(
            @RequestBody RecommendPlaceRequest request
    ) {
        log.info("🤖 장소 추천 요청 - ChatRoom ID: {}, Meeting ID: {}",
                request.getChatRoomId(), request.getMeetingId());

        try {
            PlaceRecommendationDTO result;

            // chatRoomId가 있으면 채팅방 기반, 없으면 meetingId 기반
            if (request.getChatRoomId() != null) {
                result = recommendationService.recommendPlacesByChatRoomId(request.getChatRoomId());
            } else if (request.getMeetingId() != null) {
                result = recommendationService.recommendPlacesForMeeting(request.getMeetingId());
            } else {
                throw new IllegalArgumentException("chatRoomId 또는 meetingId가 필요합니다");
            }

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            log.error("❌ 잘못된 요청: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                    PlaceRecommendationDTO.builder()
                            .success(false)
                            .message(e.getMessage())
                            .build()
            );

        } catch (Exception e) {
            log.error("❌ 장소 추천 실패: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(
                    PlaceRecommendationDTO.builder()
                            .success(false)
                            .message("장소 추천에 실패했습니다: " + e.getMessage())
                            .build()
            );
        }
    }

    /**
     * 요청 DTO
     */
    @lombok.Getter
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class RecommendPlaceRequest {
        private Long chatRoomId;  // 채팅방 ID (우선순위)
        private Long meetingId;   // 모임 ID (대안)
    }

    // ========================================================================
    // Step 5: 감성 분석
    // ========================================================================

    /**
     * 감성 분석 테스트 (독립 API)
     *
     * POST /api/ai/recommendations/sentiment
     * Body: { "text": "이 모임 정말 좋았어요!" }
     */
    @Operation(
            summary = "감성 분석 테스트",
            description = "KcELECTRA를 사용하여 텍스트의 감성을 분석합니다 (테스트용)"
    )
    @PostMapping("/sentiment")
    public ResponseEntity<SentimentAnalysisDTO> analyzeSentiment(
            @Parameter(description = "분석할 텍스트", required = true)
            @RequestBody SentimentAnalysisRequest request
    ) {
        log.info("📍 POST /api/ai/recommendations/sentiment - text: {}",
                request.getText().substring(0, Math.min(request.getText().length(), 50)));

        SentimentAnalysisDTO response = sentimentAnalysisService.analyzeSentiment(
                request.getText()
        );

        return ResponseEntity.ok(response);
    }

    // ========================================================================
    // 헬스체크 & 모델 정보
    // ========================================================================

    /**
     * AI 서버 헬스체크
     *
     * GET /api/ai/recommendations/health
     */
    @Operation(
            summary = "AI 서버 헬스체크",
            description = "FastAPI AI 서버의 상태를 확인합니다"
    )
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        log.info("📍 GET /api/ai/recommendations/health");

        Map<String, Object> health = aiServiceClient.healthCheck();

        return ResponseEntity.ok(health);
    }

    /**
     * AI 모델 정보 조회
     *
     * GET /api/ai/recommendations/models
     */
    @Operation(
            summary = "AI 모델 정보",
            description = "로드된 AI 모델의 정보를 조회합니다"
    )
    @GetMapping("/models")
    public ResponseEntity<Map<String, Object>> getModelsInfo() {
        log.info("📍 GET /api/ai/recommendations/models");

        Map<String, Object> modelsInfo = aiServiceClient.getModelsInfo();

        return ResponseEntity.ok(modelsInfo);
    }


    /**
     * AI 매칭률 조회
     *
     * GET /api/ai/recommendations/match-score?userId=121&meetingId=102
     */
    @Operation(
            summary = "AI 매칭률 조회",
            description = "SVD 협업 필터링을 사용하여 사용자와 모임의 매칭률을 계산합니다"
    )
    @GetMapping("/match-score")
    public ResponseEntity<MatchScoreDTO> getMatchScore(
            @Parameter(description = "사용자 ID", required = true)
            @RequestParam Long userId,

            @Parameter(description = "모임 ID", required = true)
            @RequestParam Long meetingId
    ) {
        log.info("📍 GET /api/ai/recommendations/match-score - userId: {}, meetingId: {}",
                userId, meetingId);

        MatchScoreDTO response = matchScoreService.getMatchScore(userId, meetingId);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/match-scores")
    public ResponseEntity<?> getMatchScores(@RequestBody MatchScoresRequestDto req) {
        if (req.getUserId() == null) throw new IllegalArgumentException("userId is required");
        if (req.getMeetingIds() == null || req.getMeetingIds().isEmpty()) {
            return ResponseEntity.ok(new MatchScoresResponse(true, req.getUserId(), List.of()));
        }
        return ResponseEntity.ok(matchScoreService.getMatchScores(req.getUserId(), req.getMeetingIds()));
    }

    /**
     * ⭐ 개인화 AI 추천 - 내부 호출용 (POST)
     * POST /api/ai/recommendations/personalized-internal
     */
    @PostMapping("/personalized-internal")
    public ResponseEntity<Map<String, Object>> getPersonalizedRecommendationInternal(
            @RequestParam Long userId
    ) {
        log.info("🎯 개인화 추천 내부 요청: userId={}", userId);

        try {
            Meeting meeting = personalizedRecommendService.getPersonalizedRecommendation(userId);

            if (meeting == null) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "추천 가능한 모임이 없습니다"
                ));
            }

            Map<String, Object> response = buildMeetingResponse(meeting);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ 개인화 추천 실패: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * ⭐ 개인화 AI 추천 - 프론트 호출용 (GET)
     * GET /api/ai/recommendations/personalized/{userId}
     */
    @GetMapping("/personalized/{userId}")
    public ResponseEntity<Map<String, Object>> getPersonalizedRecommendation(
            @PathVariable Long userId
    ) {
        log.info("🎯 개인화 추천 요청: userId={}", userId);

        try {
            Meeting meeting = personalizedRecommendService.getPersonalizedRecommendation(userId);

            if (meeting == null) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "추천 가능한 모임이 없습니다"
                ));
            }

            Map<String, Object> response = buildMeetingResponse(meeting);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ 개인화 추천 실패: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    // ⭐ 공통 응답 빌더
    private Map<String, Object> buildMeetingResponse(Meeting meeting) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("meetingId", meeting.getMeetingId());
        response.put("title", meeting.getTitle());
        response.put("description", meeting.getDescription());
        response.put("category", meeting.getCategory());
        response.put("subcategory", meeting.getSubcategory());
        response.put("locationName", meeting.getLocationName());
        response.put("location", meeting.getLocationName());
        response.put("meetingTime", meeting.getMeetingTime().toString());
        response.put("meetingDate", meeting.getMeetingTime().toLocalDate().toString());
        response.put("dayOfWeek", meeting.getMeetingTime().getDayOfWeek()
                .getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.KOREAN));
        response.put("maxParticipants", meeting.getMaxParticipants());
        response.put("currentParticipants", meeting.getCurrentParticipants());
        response.put("expectedCost", meeting.getExpectedCost());
        response.put("vibe", meeting.getVibe());
        response.put("imageUrl", meeting.getImageUrl());
        response.put("avgRating", meeting.getAvgRating());
        response.put("organizerId", meeting.getOrganizer().getUserId());
        response.put("matchScore", 70);
        response.put("ageRange", "20-30대");
        return response;
    }



}