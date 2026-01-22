package com.project.itda.global.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@RestController
@RequestMapping("/uploads")
public class FileController {

    // ✅ 너의 맥 경로로 설정!
    private final Path uploadPath = Paths.get("/Users/bominkim/it-da/It-da-spring/uploads").toAbsolutePath().normalize();

    @GetMapping("/meetings/{fileName}")
    public ResponseEntity<Resource> serveMeetingImage(@PathVariable String fileName) {
        try {
            Path filePath = uploadPath.resolve("meetings").resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            log.info("📁 이미지 요청: {}", filePath);

            if (resource.exists() && resource.isReadable()) {
                String contentType = "image/png";
                if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (fileName.endsWith(".gif")) {
                    contentType = "image/gif";
                }

                log.info("✅ 이미지 서빙 성공: {}", fileName);

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
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