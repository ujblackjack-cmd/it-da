package com.project.itda.domain.user.service;

import com.project.itda.domain.user.enums.SentimentType;
import org.springframework.stereotype.Component;

@Component
public class SentimentAnalyzer {

    public SentimentType analyze(Integer rating, String content) {
        if (rating >= 4) {
            return SentimentType.POSITIVE;
        } else if (rating <= 2) {
            return SentimentType.NEGATIVE;
        }

        if (content == null || content.trim().isEmpty()) {
            return SentimentType.NEUTRAL;
        }

        String lowerContent = content.toLowerCase();

        String[] positiveKeywords = {"좋았", "재밌", "즐거웠", "최고", "추천", "만족", "행복"};
        String[] negativeKeywords = {"별로", "실망", "아쉬웠", "지루", "불편", "최악"};

        int positiveCount = 0;
        int negativeCount = 0;

        for (String keyword : positiveKeywords) {
            if (lowerContent.contains(keyword)) positiveCount++;
        }

        for (String keyword : negativeKeywords) {
            if (lowerContent.contains(keyword)) negativeCount++;
        }

        if (positiveCount > negativeCount) {
            return SentimentType.POSITIVE;
        } else if (negativeCount > positiveCount) {
            return SentimentType.NEGATIVE;
        }

        return SentimentType.NEUTRAL;
    }
}