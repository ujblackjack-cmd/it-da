package com.project.itda.global.exception;

import lombok.Builder;
import lombok.Getter;
import org.springframework.validation.FieldError;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
public class ErrorResponse {

    private final int status;
    private final String code;
    private final String message;
    private final LocalDateTime timestamp;

    @Builder.Default
    private final List<ValidationError> errors = new ArrayList<>();

    public static ErrorResponse of(ErrorCode errorCode) {
        return ErrorResponse.builder()
                .status(errorCode.getStatus().value())
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ErrorResponse of(ErrorCode errorCode, List<FieldError> fieldErrors) {
        ErrorResponse response = of(errorCode);
        response.errors.addAll(ValidationError.of(fieldErrors));
        return response;
    }

    @Getter
    @Builder
    public static class ValidationError {
        private final String field;
        private final String value;
        private final String reason;

        public static List<ValidationError> of(List<FieldError> fieldErrors) {
            List<ValidationError> errors = new ArrayList<>();
            for (FieldError fieldError : fieldErrors) {
                errors.add(ValidationError.builder()
                        .field(fieldError.getField())
                        .value(fieldError.getRejectedValue() != null ?
                                fieldError.getRejectedValue().toString() : "")
                        .reason(fieldError.getDefaultMessage())
                        .build());
            }
            return errors;
        }
    }
}