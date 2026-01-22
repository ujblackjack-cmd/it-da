package com.project.itda.domain.review.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 모임별 감성 점수 집계 및 관리
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeetingSentimentService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * 모임의 모든 리뷰를 집계하여 meeting_sentiment 테이블 업데이트
     */
    @Transactional
    public void updateMeetingSentiment(Long meetingId) {
        log.info("📊 모임 감성 집계 시작: meetingId={}", meetingId);

        // 1. 해당 모임의 리뷰 통계 계산
        String query = """
            SELECT 
                COUNT(*) as review_count,
                AVG(sentiment_score) as avg_sentiment_score,
                SUM(CASE WHEN sentiment = 'POSITIVE' THEN 1 ELSE 0 END) / COUNT(*) as positive_ratio,
                SUM(CASE WHEN sentiment = 'NEGATIVE' THEN 1 ELSE 0 END) / COUNT(*) as negative_ratio,
                STDDEV(sentiment_score) as sentiment_variance
            FROM reviews
            WHERE meeting_id = ?
              AND deleted_at IS NULL
              AND review_text IS NOT NULL
        """;

        Map<String, Object> stats = jdbcTemplate.queryForMap(query, meetingId);

        int reviewCount = ((Number) stats.get("review_count")).intValue();

        if (reviewCount == 0) {
            log.info("⚠️ 리뷰가 없는 모임: meetingId={}", meetingId);
            upsertMeetingSentiment(meetingId, 0.5, 0.5, 0.5, 0.0, 0);
            return;
        }

        double avgSentimentScore = getDoubleValue(stats, "avg_sentiment_score", 0.5);
        double positiveRatio = getDoubleValue(stats, "positive_ratio", 0.5);
        double negativeRatio = getDoubleValue(stats, "negative_ratio", 0.5);
        double sentimentVariance = getDoubleValue(stats, "sentiment_variance", 0.0);

        log.info("✅ 감성 집계 완료: meetingId={}, count={}, avg={:.3f}, pos={:.2f}%, neg={:.2f}%",
                meetingId, reviewCount, avgSentimentScore, positiveRatio * 100, negativeRatio * 100);

        upsertMeetingSentiment(meetingId, avgSentimentScore, positiveRatio, negativeRatio, sentimentVariance, reviewCount);
    }

    private void upsertMeetingSentiment(Long meetingId, double avgScore, double posRatio, double negRatio, double variance, int count) {
        String upsert = """
            INSERT INTO meeting_sentiment (
                meeting_id, 
                avg_sentiment_score, 
                positive_review_ratio, 
                negative_review_ratio, 
                review_sentiment_variance,
                review_count,
                last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                avg_sentiment_score = VALUES(avg_sentiment_score),
                positive_review_ratio = VALUES(positive_review_ratio),
                negative_review_ratio = VALUES(negative_review_ratio),
                review_sentiment_variance = VALUES(review_sentiment_variance),
                review_count = VALUES(review_count),
                last_updated = NOW()
        """;

        jdbcTemplate.update(upsert, meetingId, avgScore, posRatio, negRatio, variance, count);
    }

    public Map<String, Object> getMeetingSentiment(Long meetingId) {
        String sql = """
            SELECT * FROM meeting_sentiment WHERE meeting_id = ?
        """;

        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
                Map<String, Object> result = new HashMap<>();
                result.put("meeting_id", rs.getLong("meeting_id"));
                result.put("avg_sentiment_score", rs.getDouble("avg_sentiment_score"));
                result.put("positive_review_ratio", rs.getDouble("positive_review_ratio"));
                result.put("negative_review_ratio", rs.getDouble("negative_review_ratio"));
                result.put("review_sentiment_variance", rs.getDouble("review_sentiment_variance"));
                result.put("review_count", rs.getInt("review_count"));
                return result;
            }, meetingId);
        } catch (Exception e) {
            Map<String, Object> def = new HashMap<>();
            def.put("meeting_id", meetingId);
            def.put("avg_sentiment_score", 0.5);
            def.put("positive_review_ratio", 0.5);
            def.put("negative_review_ratio", 0.5);
            def.put("review_sentiment_variance", 0.0);
            def.put("review_count", 0);
            return def;
        }
    }

    private double getDoubleValue(Map<String, Object> map, String key, double defaultValue) {
        Object value = map.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Number) return ((Number) value).doubleValue();
        return defaultValue;
    }
}