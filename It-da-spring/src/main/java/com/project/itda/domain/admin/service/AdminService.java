package com.project.itda.domain.admin.service;

import com.project.itda.domain.admin.dto.response.AdminDashboardResponse;
import com.project.itda.domain.admin.dto.response.RecentMeetingResponse;
import com.project.itda.domain.admin.dto.response.RecentUserResponse;
import com.project.itda.domain.admin.entity.AdminUser;
import com.project.itda.domain.admin.enums.InquiryStatus;
import com.project.itda.domain.admin.enums.ReportStatus;
import com.project.itda.domain.admin.repository.AdminUserRepository;
import com.project.itda.domain.admin.repository.AnnouncementRepository;
import com.project.itda.domain.admin.repository.InquiryRepository;
import com.project.itda.domain.admin.repository.ReportRepository;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.itda.domain.meeting.enums.MeetingStatus;
import com.project.itda.domain.admin.dto.request.UserStatusRequest;
import com.project.itda.domain.admin.dto.response.UserListResponse;
import com.project.itda.domain.admin.dto.response.UserManageResponse;
import com.project.itda.domain.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.project.itda.domain.admin.dto.request.MeetingStatusRequest;
import com.project.itda.domain.admin.dto.response.MeetingListResponse;
import com.project.itda.domain.admin.dto.response.MeetingManageResponse;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.enums.MeetingStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final AdminUserRepository adminUserRepository;
    private final ReportRepository reportRepository;
    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;
    private final MeetingRepository meetingRepository;
    private final InquiryRepository inquiryRepository;


    public AdminDashboardResponse getDashboard(Long adminId) {
        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new EntityNotFoundException("관리자를 찾을 수 없습니다"));

        // 👇 시간 변수 선언 추가
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime weekAgo = now.minusWeeks(1);
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();


        // 대기중인 신고 수
        Long pendingReportsCount = reportRepository.findAllByStatusWithResolver(ReportStatus.PENDING)
                .stream()
                .count();

        // 오늘 작성된 공지사항 수
        Long todayAnnouncementsCount = announcementRepository.findAll()
                .stream()
                .filter(a -> a.getCreatedAt().toLocalDate().equals(LocalDate.now()))
                .count();

        // 활성 모임 수 (RECRUITING + FULL)
        Long activeMeetingsCount = meetingRepository.countByStatusIn(
                Arrays.asList(MeetingStatus.RECRUITING, MeetingStatus.FULL)
        );

        // 대기중인 1:1 문의 수
        Long pendingInquiriesCount = inquiryRepository.countByStatus(
                InquiryStatus.PENDING);


        Long totalUsersCount = userRepository.count();
        Long totalMeetingsCount = meetingRepository.count();
        Long todayJoinedUsersCount = userRepository.countByCreatedAtAfter(todayStart);
        Long lastWeekUsersCount = userRepository.countByCreatedAtBefore(weekAgo);
        Long lastWeekMeetingsCount = meetingRepository.countByCreatedAtBefore(weekAgo);

        Double userGrowthRate = calculateGrowthRate(totalUsersCount, lastWeekUsersCount);
        Double meetingGrowthRate = calculateGrowthRate(totalMeetingsCount, lastWeekMeetingsCount);


        AdminDashboardResponse response = AdminDashboardResponse.from(admin);
        response.setPendingReportsCount(pendingReportsCount);
        response.setTodayAnnouncementsCount(todayAnnouncementsCount);
        response.setTotalUsersCount(totalUsersCount);
        response.setTotalMeetingsCount(totalMeetingsCount);
        response.setTodayJoinedUsersCount(todayJoinedUsersCount);
        response.setActiveMeetingsCount(activeMeetingsCount);
        response.setUserGrowthRate(userGrowthRate);
        response.setMeetingGrowthRate(meetingGrowthRate);
        response.setPendingInquiriesCount(pendingInquiriesCount);

        return response;
    }

    /**
     * 최근 가입 회원 조회
     */
    public List<RecentUserResponse> getRecentUsers(int limit) {
        return userRepository.findAll().stream()
                .sorted((u1, u2) -> u2.getCreatedAt().compareTo(u1.getCreatedAt()))
                .limit(limit)
                .map(user -> RecentUserResponse.builder()
                        .userId(user.getUserId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .createdAt(user.getCreatedAt())
                        .status(user.getStatus().name())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 최근 생성 모임 조회
     */
    public List<RecentMeetingResponse> getRecentMeetings(int limit) {
        return meetingRepository.findAll().stream()
                .sorted((m1, m2) -> m2.getCreatedAt().compareTo(m1.getCreatedAt()))
                .limit(limit)
                .map(meeting -> RecentMeetingResponse.builder()
                        .meetingId(meeting.getMeetingId())
                        .title(meeting.getTitle())
                        .categoryName(meeting.getCategory())
                        .currentMembers(meeting.getCurrentParticipants())
                        .createdAt(meeting.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 증가율 계산
     */
    private Double calculateGrowthRate(Long current, Long previous) {
        if (previous == null || previous == 0) return 0.0;
        return ((current - previous) * 100.0) / previous;
    }

    public AdminUser findByEmail(String email) {
        return adminUserRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("관리자를 찾을 수 없습니다"));
    }

    @Transactional
    public void updateLastLogin(Long adminId) {
        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new EntityNotFoundException("관리자를 찾을 수 없습니다"));
        admin.setLastLoginAt(LocalDateTime.now());
    }

    /**
     * 회원 목록 조회 (페이징)
     */
    public UserListResponse getUserList(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<User> userPage;
        if (search != null && !search.isEmpty()) {
            // 검색어가 있으면 이름 또는 이메일로 검색
            userPage = userRepository.findByUsernameContainingOrEmailContaining(search, search, pageable);
        } else {
            // 검색어가 없으면 전체 조회
            userPage = userRepository.findAll(pageable);
        }

        List<UserManageResponse> users = userPage.getContent().stream()
                .map(UserManageResponse::from)
                .collect(Collectors.toList());

        return UserListResponse.builder()
                .users(users)
                .currentPage(userPage.getNumber())
                .totalPages(userPage.getTotalPages())
                .totalElements(userPage.getTotalElements())
                .build();
    }

    /**
     * 회원 상세 조회
     */
    public UserManageResponse getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("회원을 찾을 수 없습니다"));
        return UserManageResponse.from(user);
    }

    /**
     * 회원 상태 변경
     */
    @Transactional
    public void updateUserStatus(Long userId, UserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("회원을 찾을 수 없습니다"));
        user.setStatus(request.getStatus());
    }

    /**
     * 모임 목록 조회 (페이징 + 필터)
     */
    public MeetingListResponse getMeetingList(int page, int size, String search, String category, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Meeting> meetingPage;

        // 필터 조합에 따라 쿼리 선택
        boolean hasSearch = search != null && !search.isEmpty();
        boolean hasCategory = category != null && !category.isEmpty();
        boolean hasStatus = status != null && !status.isEmpty();

        if (hasSearch && hasCategory && hasStatus) {
            meetingPage = meetingRepository.findByTitleContainingAndCategoryAndStatusWithOrganizer(
                    search, category, MeetingStatus.valueOf(status), pageable);
        } else if (hasSearch && hasCategory) {
            meetingPage = meetingRepository.findByTitleContainingAndCategoryWithOrganizer(search, category, pageable);
        } else if (hasSearch && hasStatus) {
            meetingPage = meetingRepository.findByTitleContainingAndStatusWithOrganizer(
                    search, MeetingStatus.valueOf(status), pageable);
        } else if (hasCategory && hasStatus) {
            meetingPage = meetingRepository.findByCategoryAndStatusWithOrganizer(
                    category, MeetingStatus.valueOf(status), pageable);
        } else if (hasSearch) {
            meetingPage = meetingRepository.findByTitleContainingWithOrganizer(search, pageable);
        } else if (hasCategory) {
            meetingPage = meetingRepository.findByCategoryWithOrganizer(category, pageable);
        } else if (hasStatus) {
            meetingPage = meetingRepository.findByStatusWithOrganizer(MeetingStatus.valueOf(status), pageable);
        } else {
            meetingPage = meetingRepository.findAllWithOrganizer(pageable);
        }

        List<MeetingManageResponse> meetings = meetingPage.getContent().stream()
                .map(MeetingManageResponse::from)
                .collect(Collectors.toList());

        return MeetingListResponse.builder()
                .meetings(meetings)
                .currentPage(meetingPage.getNumber())
                .totalPages(meetingPage.getTotalPages())
                .totalElements(meetingPage.getTotalElements())
                .build();
    }

    /**
     * 모임 상세 조회
     */
    public MeetingManageResponse getMeetingDetail(Long meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new EntityNotFoundException("모임을 찾을 수 없습니다"));
        return MeetingManageResponse.from(meeting);
    }

    /**
     * 모임 상태 변경
     */
    @Transactional
    public void updateMeetingStatus(Long meetingId, MeetingStatusRequest request) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new EntityNotFoundException("모임을 찾을 수 없습니다"));
        meeting.updateStatus(request.getStatus());
    }
}