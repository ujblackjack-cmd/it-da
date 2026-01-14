package com.project.itda.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // ✅ React 개발 서버 허용
        config.setAllowedOrigins(Arrays.asList(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173"
        ));

        // ✅ 모든 HTTP 메서드 허용
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // ✅ 모든 헤더 허용
        config.setAllowedHeaders(Arrays.asList("*"));

        // ✅ 인증 정보 허용
        config.setAllowCredentials(true);

        // ✅ 모든 경로에 적용
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}