package com.project.itda.global.config;// 새로운 설정 파일: src/main/java/com/project/itda/global/config/SessionConfig.java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
public class SessionConfig {
    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("SESSION"); // 쿠키 이름 명시
        serializer.setCookiePath("/");
        // 로컬 환경에서 쿠키 전달을 원활하게 하기 위해 Lax 설정 (필요시 None)
        serializer.setSameSite("Lax");
        serializer.setUseHttpOnlyCookie(true);
        return serializer;
    }
}