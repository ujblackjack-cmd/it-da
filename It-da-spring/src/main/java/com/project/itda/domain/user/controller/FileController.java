package com.project.itda.domain.user.controller;


import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@RestController
@RequestMapping("/uploads")
public class FileController {

    // ✅ 너의 맥 경로로 설정!
    @Value("${file.upload-dir}")
    private String uploadDir;

    @GetMapping("/{fileName}")
    public ResponseEntity<Resource> serveChatImage(@PathVariable String fileName) {
        return serveFile(fileName, "");
    }

    @GetMapping("/meetings/{fileName}")
    public ResponseEntity<Resource> serveMeetingImage(@PathVariable String fileName) {
        return serveFile(fileName, "meetings"); // 공통 메서드 호출
    }

    // ✅ 중복 로직을 처리할 공통 메서드 추가
    private ResponseEntity<Resource> serveFile(String fileName, String subDir) {
        try {
            // subDir이 있으면 해당 폴더 안에서 찾고, 없으면 uploadDir 바로 아래서 찾음
            Path filePath = Paths.get(uploadDir).resolve(subDir).resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            log.info("📁 이미지 요청: {}", filePath);

            if (resource.exists() && resource.isReadable()) {
                String contentType = "image/png"; // 기본값
                if (fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (fileName.toLowerCase().endsWith(".gif")) {
                    contentType = "image/gif";
                }

                String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
                        .replace("+", "%20");

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + encodedFileName + "\"")
                        .body(resource);
            } else {
                log.error("❌ 파일 없음: {}", filePath);
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            log.error("❌ URL 오류: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}