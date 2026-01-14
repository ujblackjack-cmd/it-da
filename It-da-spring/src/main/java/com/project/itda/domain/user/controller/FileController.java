package com.project.itda.domain.user.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/files")
public class FileController {

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // ✅ 프로젝트 루트의 절대 경로 사용
            String projectRoot = System.getProperty("user.dir");
            Path uploadPath = Paths.get(projectRoot, "src", "main", "resources", "static", "uploads");

            // 디렉토리 생성
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                log.info("✅ 업로드 디렉토리 생성: {}", uploadPath);
            }

            // 파일명 생성
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String savedFilename = UUID.randomUUID().toString() + extension;

            // 파일 저장 (절대 경로)
            Path filePath = uploadPath.resolve(savedFilename);
            Files.copy(file.getInputStream(), filePath);

            // URL 반환
            String fileUrl = "/uploads/" + savedFilename;
            log.info("✅ 파일 업로드 성공: {}", fileUrl);

            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("❌ 파일 업로드 실패:", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}