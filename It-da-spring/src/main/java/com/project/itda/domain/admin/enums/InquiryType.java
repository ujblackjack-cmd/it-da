package com.project.itda.domain.admin.enums;

/**
 * 문의 유형
 */
public enum InquiryType {
    ACCOUNT("계정/로그인"),
    MEETING("모임 참여"),
    PAYMENT("결제/환불"),
    REPORT("신고/제재"),
    SUGGESTION("제안/피드백"),
    ETC("기타");

    private final String description;

    InquiryType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}