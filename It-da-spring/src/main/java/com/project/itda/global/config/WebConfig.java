package com.project.itda.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // ✅ 맥 절대 경로로 설정!
        String uploadPath = "file:/Users/bominkim/it-da/It-da-spring/uploads/";

        System.out.println("📁 이미지 서빙 경로: " + uploadPath);

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath)
                .setCachePeriod(0);  // 캐시 비활성화 (테스트용)
    }
}