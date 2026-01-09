package com.project.itda.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Common
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "C001", "잘못된 입력값입니다"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C002", "서버 오류가 발생했습니다"),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "사용자를 찾을 수 없습니다"),
    EMAIL_DUPLICATED(HttpStatus.BAD_REQUEST, "U002", "이미 존재하는 이메일입니다"),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "U003", "잘못된 비밀번호입니다"),

    // User Preference
    PREFERENCE_NOT_FOUND(HttpStatus.NOT_FOUND, "UP001", "사용자 선호도를 찾을 수 없습니다"),

    // User Setting
    SETTING_NOT_FOUND(HttpStatus.NOT_FOUND, "US001", "사용자 설정을 찾을 수 없습니다"),

    // Authentication
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "A001", "인증이 필요합니다"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "A002", "접근 권한이 없습니다"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "A003", "유효하지 않은 토큰입니다"),

    // Session
    SESSION_EXPIRED(HttpStatus.UNAUTHORIZED, "S001", "세션이 만료되었습니다"),
    INVALID_SESSION(HttpStatus.UNAUTHORIZED, "S002", "유효하지 않은 세션입니다");

    private final HttpStatus status;
    private final String code;
    private final String message;
}