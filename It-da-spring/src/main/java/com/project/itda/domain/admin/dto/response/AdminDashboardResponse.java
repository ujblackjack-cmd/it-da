package com.project.itda.domain.admin.dto.response;

import com.project.itda.domain.admin.entity.AdminUser;
import com.project.itda.domain.admin.enums.AdminRole;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AdminDashboardResponse {
    private Long adminId;
    private String name;
    private String email;
    private AdminRole role;
    private LocalDateTime lastLoginAt;

    // 통계 정보
    private Long pendingReportsCount;
    private Long todayAnnouncementsCount;
    private Long activeUsersCount;

    private Long totalUsersCount;           // 전체 회원수
    private Long totalMeetingsCount;        // 전체 모임수
    private Long todayJoinedUsersCount;     // 오늘 가입자수
    private Long activeMeetingsCount;       // 활성 모임수

    private Long pendingInquiriesCount;     // 대기중인 1:1 문의 수

    // 증가율
    private Double userGrowthRate;          // 회원 증가율 (지난주 대비)
    private Double meetingGrowthRate;       // 모임 증가율 (지난주 대비)

    public static AdminDashboardResponse from(AdminUser admin) {
        return AdminDashboardResponse.builder()
                .adminId(admin.getAdminId())
                .name(admin.getName())
                .email(admin.getEmail())
                .role(admin.getRole())
                .lastLoginAt(admin.getLastLoginAt())
                .build();
    }
}