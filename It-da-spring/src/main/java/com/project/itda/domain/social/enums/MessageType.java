package com.project.itda.domain.social.enums;

/**
 * 채팅 메시지 유형 정의
 */
public enum MessageType {
    TEXT,              // 텍스트 메시지 (기본값)
    TALK,              // 일반 대화 (TEXT와 동일, 호환성)
    IMAGE,             // 이미지
    FILE,              // 파일
    SYSTEM,            // 시스템 메시지 (입장/퇴장 등)
    POLL,              // 투표
    VOTE,              // 투표 (별칭)
    BILL,              // 정산
    LOCATION,          // 위치
    NOTICE,            // 공지
    VOTE_UPDATE,       // 투표 업데이트
    BILL_UPDATE,       // 정산 업데이트
    AI_RECOMMENDATION, // AI 추천
    READ               // 읽음 표시
}