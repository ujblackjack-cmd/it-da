package com.project.itda.domain.ai.service;

import com.project.itda.domain.ai.config.AIServiceConfig;
import com.project.itda.domain.ai.dto.request.*;
import com.project.itda.domain.ai.dto.response.*;
import com.project.itda.domain.ai.exception.AIServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * FastAPI AI 서버 클라이언트 (통합 완성)
 * - SVD 모임 추천
 * - LightGBM 만족도 예측
 * - KcELECTRA 감성 분석
 * - 중간지점 계산
 */
@Service
@Slf4j
public class AIServiceClient {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private AIServiceConfig config;

    // ========================================================================
    // 공통 메서드
    // ========================================================================

    /**
     * FastAPI POST 요청 (공통)
     */
    protected <T, R> R post(String endpoint, T request, Class<R> responseType) {
        String url = config.getUrl() + endpoint;

        try {
            log.info("🤖 FastAPI 요청: {} → {}", endpoint, request.getClass().getSimpleName());
            log.debug("📤 요청 데이터: {}", request);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<T> entity = new HttpEntity<>(request, headers);

            ResponseEntity<R> response = restTemplate.postForEntity(
                    url, entity, responseType
            );

            log.info("✅ FastAPI 응답: {} - {}", response.getStatusCode(), responseType.getSimpleName());
            return response.getBody();

        } catch (HttpClientErrorException e) {
            log.error("❌ FastAPI 클라이언트 에러: {} - {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new AIServiceException(
                    "FastAPI 요청 오류: " + e.getMessage(),
                    "HTTP_" + e.getStatusCode().value(),
                    "FastAPI",
                    e
            );

        } catch (HttpServerErrorException e) {
            log.error("❌ FastAPI 서버 에러: {} - {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new AIServiceException(
                    "FastAPI 서버 오류: " + e.getMessage(),
                    "HTTP_" + e.getStatusCode().value(),
                    "FastAPI",
                    e
            );

        } catch (ResourceAccessException e) {
            log.error("❌ FastAPI 연결 실패: {}", e.getMessage());
            throw new AIServiceException(
                    "FastAPI 서버 연결 실패 (타임아웃 또는 서버 다운)",
                    "CONNECTION_TIMEOUT",
                    "FastAPI",
                    e
            );

        } catch (Exception e) {
            log.error("❌ FastAPI 예외: {}", e.getMessage(), e);
            throw new AIServiceException(
                    "FastAPI 알 수 없는 오류: " + e.getMessage(),
                    "UNKNOWN_ERROR",
                    "FastAPI",
                    e
            );
        }
    }

    /**
     * FastAPI GET 요청 (공통)
     */
    protected <R> R get(String endpoint, Class<R> responseType) {
        String url = config.getUrl() + endpoint;

        try {
            log.info("🤖 FastAPI GET: {}", endpoint);

            ResponseEntity<R> response = restTemplate.getForEntity(url, responseType);

            log.info("✅ FastAPI 응답: {}", response.getStatusCode());
            return response.getBody();

        } catch (Exception e) {
            log.error("❌ FastAPI GET 실패: {}", e.getMessage());
            throw new AIServiceException(
                    "FastAPI GET 요청 실패: " + e.getMessage(),
                    e
            );
        }
    }

    public <T> T get(String path, Map<String, ?> params, Class<T> responseType) {
        String url = config.getUrl() + path;

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(url);
        params.forEach(builder::queryParam);

        String finalUrl = builder.build(true).toUriString();
        log.info("🤖 FastAPI GET 요청: {}", finalUrl);

        return restTemplate.getForObject(finalUrl, responseType);
    }

    // ========================================================================
    // Step 2: SVD 모임 추천
    // ========================================================================

    /**
     * SVD 협업 필터링 기반 모임 추천
     *
     * @param request 사용자 ID + 추천 개수
     * @return 추천 모임 목록 (meeting_id, score, rank)
     */
    public MeetingRecommendResponse recommendMeetingsPost(MeetingRecommendRequest request) {
        return post("/api/ai/recommendations/meetings", request, MeetingRecommendResponse.class);
    }

    public MeetingRecommendResponse recommendMeetingsGet(Long userId, int topN) {
        String url = UriComponentsBuilder
                .fromHttpUrl(config.getUrl())
                .path("/api/ai/recommendations/meetings")
                .queryParam("user_id", userId)
                .queryParam("top_n", topN)
                .toUriString();

        try {
            log.info("🤖 FastAPI GET: {}", url);
            ResponseEntity<MeetingRecommendResponse> response =
                    restTemplate.getForEntity(url, MeetingRecommendResponse.class);
            return response.getBody();
        } catch (Exception e) {
            throw new AIServiceException("FastAPI GET 요청 실패: " + e.getMessage(), e);
        }
    }

    public MeetingRecommendResponse recommendMeetings(MeetingRecommendRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("MeetingRecommendRequest는 null일 수 없습니다.");
        }
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("userId는 null일 수 없습니다.");
        }

        int safeTopN = (request.getTopN() == null || request.getTopN() <= 0)
                ? 10
                : Math.min(request.getTopN(), 50);

        return recommendMeetingsGet(
                request.getUserId().longValue(),
                safeTopN
        );
    }

    // ========================================================================
    // Step 3: LightGBM 만족도 예측
    // ========================================================================

    /**
     * LightGBM Regressor 기반 만족도 예측
     *
     * @param request 사용자 + 모임 피처 (25개)
     * @return 예측 만족도 (1~5)
     */
    public SatisfactionPredictionResponse predictSatisfaction(SatisfactionPredictionRequest request) {
        return post("/api/ai/recommendations/satisfaction", request, SatisfactionPredictionResponse.class);
    }

    // ========================================================================
    // Step 4: 중간지점 계산
    // ========================================================================

    /**
     * 참가자들의 중간지점 계산
     *
     * @param request 참가자 위치 목록
     * @return 중간지점 + 검색 반경
     */
    public PlaceRecommendResponse calculateCentroid(PlaceRecommendRequest request) {
        return post("/api/ai/recommendations/place", request, PlaceRecommendResponse.class);
    }

    // ========================================================================
    // Step 5: KcELECTRA 감성 분석
    // ========================================================================

    /**
     * KcELECTRA 기반 감성 분석
     *
     * @param request 분석할 텍스트
     * @return 감성 분석 결과 (긍정/중립/부정)
     */
    public SentimentAnalysisResponse analyzeSentiment(SentimentAnalysisRequest request) {
        return post("/api/ai/sentiment-analysis", request, SentimentAnalysisResponse.class);
    }

    // ========================================================================
    // 헬스체크 & 모델 정보
    // ========================================================================

    /**
     * AI 서버 헬스체크
     */
    public Map<String, Object> healthCheck() {
        return get("/api/ai/health", Map.class);
    }

    /**
     * 로드된 AI 모델 정보 조회
     */
    public Map<String, Object> getModelsInfo() {
        return get("/api/ai/models/info", Map.class);
    }



}