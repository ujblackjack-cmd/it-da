package com.project.itda.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("ITDA API Documentation")
                        .description("오프라인 취미 모임 매칭 플랫폼 API")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("ITDA Team")
                                .email("support@itda.com")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Server"),
                        new Server().url("https://api.itda.com").description("Production Server")
                ));
    }
}