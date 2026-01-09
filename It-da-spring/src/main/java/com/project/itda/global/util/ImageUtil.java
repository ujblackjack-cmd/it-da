package com.project.itda.global.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Slf4j
public class ImageUtil {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final String[] ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"};

    /**
     * 파일 확장자 검증
     */
    public static boolean isValidImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return false;
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null) {
            return false;
        }

        String extension = getExtension(fileName);
        for (String allowed : ALLOWED_EXTENSIONS) {
            if (allowed.equalsIgnoreCase(extension)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 파일 크기 검증
     */
    public static boolean isValidSize(MultipartFile file) {
        return file != null && file.getSize() <= MAX_FILE_SIZE;
    }

    /**
     * 고유한 파일명 생성
     */
    public static String generateFileName(String originalFileName) {
        String extension = getExtension(originalFileName);
        return UUID.randomUUID().toString() + "." + extension;
    }

    /**
     * 파일 확장자 추출
     */
    public static String getExtension(String fileName) {
        int lastDotIndex = fileName.lastIndexOf(".");
        if (lastDotIndex > 0) {
            return fileName.substring(lastDotIndex + 1).toLowerCase();
        }
        return "";
    }

    /**
     * 이미지 업로드 (S3/로컬 저장)
     */
    public static String upload(MultipartFile file, String directory) throws IOException {
        // TODO: S3 또는 로컬 파일 시스템에 저장
        log.warn("ImageUtil.upload() is not implemented yet");
        return "https://example.com/images/" + generateFileName(file.getOriginalFilename());
    }
}