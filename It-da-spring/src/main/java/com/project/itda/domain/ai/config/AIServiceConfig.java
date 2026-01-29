package com.project.itda.domain.ai.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ai.server")  // ✅ "ai.service"로 변경
@Getter
@Setter
public class AIServiceConfig {

    /**
     * FastAPI 서버 URL
     * 예: http://fastapi:8000 (Docker) 또는 http://localhost:8000 (로컬)
     */
    private String url = "http://localhost:8000";  // 기본값 (fallback)

    /**
     * 요청 타임아웃 (밀리초)
     */
    private int timeout = 30000;

    /**
     * 최대 재시도 횟수
     */
    private int maxRetries = 3;

    /**
     * 캐시 활성화 여부
     */
    private boolean enableCache = true;
}