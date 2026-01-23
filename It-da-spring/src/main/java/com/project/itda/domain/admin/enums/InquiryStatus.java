package com.project.itda.domain.admin.enums;

/**
 * 문의 처리 상태
 */
public enum InquiryStatus {
    PENDING("대기중"),
    IN_PROGRESS("처리중"),
    COMPLETED("답변완료");

    private final String description;

    InquiryStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}