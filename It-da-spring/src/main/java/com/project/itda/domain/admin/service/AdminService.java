package com.project.itda.domain.admin.service;

import com.project.itda.domain.admin.dto.request.*;
import com.project.itda.domain.admin.dto.response.*;
import com.project.itda.domain.admin.entity.AdminUser;
import com.project.itda.domain.admin.entity.Report;
import com.project.itda.domain.admin.enums.InquiryStatus;
import com.project.itda.domain.admin.enums.ReportStatus;
import com.project.itda.domain.admin.repository.AdminUserRepository;
import com.project.itda.domain.admin.repository.AnnouncementRepository;
import com.project.itda.domain.admin.repository.InquiryRepository;
import com.project.itda.domain.admin.repository.ReportRepository;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.notification.service.NotificationService;
import com.project.itda.domain.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.itda.domain.meeting.enums.MeetingStatus;
import com.project.itda.domain.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.enums.MeetingStatus;
import com.project.itda.domain.admin.repository.InquiryRepository;
import com.project.itda.domain.admin.entity.Inquiry;
import com.project.itda.domain.admin.enums.InquiryStatus;
import com.project.itda.domain.admin.repository.AnnouncementRepository;
import com.project.itda.domain.admin.entity.Announcement;
import com.project.itda.domain.admin.enums.AnnouncementStatus;
import com.project.itda.domain.admin.entity.Report;
import com.project.itda.domain.admin.enums.ReportStatus;
import com.project.itda.domain.admin.dto.request.ReportStatusRequest;
import com.project.itda.domain.admin.dto.response.ReportResponse;
import com.project.itda.domain.admin.dto.response.ReportListResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Arrays;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;


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
    private final NotificationService notificationService;



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
        meetingRepository.save(meeting);
    }

    // ========== 문의 관리 메서드 추가 ==========

    /**
     * 문의 목록 조회 (페이징 + 검색)
     */
    public InquiryListResponse getInquiryList(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);

        Page<Inquiry> inquiryPage;
        if (search != null && !search.isEmpty()) {
            inquiryPage = inquiryRepository.findAllWithSearch(search, pageable);
        } else {
            inquiryPage = inquiryRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        List<InquiryListResponse.InquiryItem> content = inquiryPage.getContent()
                .stream()
                .map(InquiryListResponse.InquiryItem::from)
                .toList();

        return InquiryListResponse.builder()
                .content(content)
                .currentPage(inquiryPage.getNumber())
                .totalPages(inquiryPage.getTotalPages())
                .totalElements(inquiryPage.getTotalElements())
                .build();
    }

    /**
     * 문의 상세 조회
     */
    public InquiryDetailResponse getInquiryDetail(Long inquiryId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new EntityNotFoundException("문의를 찾을 수 없습니다"));

        return InquiryDetailResponse.from(inquiry);
    }

    /**
     * 문의 답변 작성 및 상태 변경
     */
    @Transactional
    public void updateInquiryStatus(Long inquiryId, InquiryStatusRequest request, Long adminId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new EntityNotFoundException("문의를 찾을 수 없습니다"));

        // 답변이 있으면 answer() 메서드 사용
        if (request.getAnswer() != null && !request.getAnswer().isEmpty()) {
            inquiry.answer(request.getAnswer(), adminId);
        }
        // 답변이 없고 상태만 변경
        else if (request.getStatus() != null) {
            inquiry.setStatus(InquiryStatus.valueOf(request.getStatus()));
        }

        inquiryRepository.save(inquiry);
    }

    // ========== 공지사항 관리 메서드 추가 ==========

    /**
     * 공지사항 목록 조회 (페이징)
     */
    public AnnouncementListResponse getAnnouncementList(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size);

        AnnouncementStatus statusEnum = status != null ?
                AnnouncementStatus.valueOf(status) : AnnouncementStatus.PUBLISHED;

        Page<Announcement> announcementPage = announcementRepository
                .findAllByStatusWithAuthorPaged(statusEnum, pageable);

        List<AnnouncementResponse> content = announcementPage.getContent()
                .stream()
                .map(AnnouncementResponse::from)
                .toList();

        return AnnouncementListResponse.builder()
                .content(content)
                .currentPage(announcementPage.getNumber())
                .totalPages(announcementPage.getTotalPages())
                .totalElements(announcementPage.getTotalElements())
                .build();
    }

    /**
     * 공지사항 상세 조회
     */
    @Transactional
    public AnnouncementResponse getAnnouncementDetail(Long announcementId) {
        Announcement announcement = announcementRepository.findByIdWithAuthor(announcementId)
                .orElseThrow(() -> new EntityNotFoundException("공지사항을 찾을 수 없습니다"));

        // 조회수 증가
        announcement.setViewCount(announcement.getViewCount() + 1);
        announcementRepository.save(announcement);

        return AnnouncementResponse.from(announcement);
    }

    /**
     * 공지사항 생성
     */
    @Transactional
    public AnnouncementResponse createAnnouncement(AnnouncementCreateRequest request, Long adminId) {
        AdminUser author = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new EntityNotFoundException("관리자를 찾을 수 없습니다"));

        Announcement announcement = new Announcement();
        announcement.setAuthor(author);
        announcement.setCategory(request.getCategory());
        announcement.setTitle(request.getTitle());
        announcement.setContent(request.getContent());
        announcement.setIsPinned(request.getIsPinned() != null ? request.getIsPinned() : false);
        announcement.setIsImportant(request.getIsImportant() != null ? request.getIsImportant() : false);
        announcement.setStatus(request.getStatus());
        announcement.setPublishedAt(request.getPublishedAt() != null ?
                request.getPublishedAt() : LocalDateTime.now());
        announcement.setViewCount(0);

        Announcement saved = announcementRepository.save(announcement);
        return AnnouncementResponse.from(saved);
    }

    /**
     * 공지사항 수정
     */
    @Transactional
    public AnnouncementResponse updateAnnouncement(Long announcementId, AnnouncementUpdateRequest request) {
        Announcement announcement = announcementRepository.findByIdWithAuthor(announcementId)
                .orElseThrow(() -> new EntityNotFoundException("공지사항을 찾을 수 없습니다"));

        announcement.setCategory(request.getCategory());
        announcement.setTitle(request.getTitle());
        announcement.setContent(request.getContent());

        if (request.getIsPinned() != null) {
            announcement.setIsPinned(request.getIsPinned());
        }
        if (request.getIsImportant() != null) {
            announcement.setIsImportant(request.getIsImportant());
        }

        announcement.setStatus(request.getStatus());

        if (request.getPublishedAt() != null) {
            announcement.setPublishedAt(request.getPublishedAt());
        }

        Announcement updated = announcementRepository.save(announcement);
        return AnnouncementResponse.from(updated);
    }

    /**
     * 공지사항 삭제
     */
    @Transactional
    public void deleteAnnouncement(Long announcementId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new EntityNotFoundException("공지사항을 찾을 수 없습니다"));

        announcementRepository.delete(announcement);
    }

    /**
     * 공지사항 상단 고정 토글
     */
    @Transactional
    public void toggleAnnouncementPin(Long announcementId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new EntityNotFoundException("공지사항을 찾을 수 없습니다"));

        announcement.setIsPinned(!announcement.getIsPinned());
        announcementRepository.save(announcement);
    }


// ================== 신고 관리 ==================

    /**
     * 신고 목록 조회 (페이징)
     */
    public ReportListResponse getReportsPaged(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Report> reportPage;
        if (status != null && !status.isEmpty()) {
            ReportStatus reportStatus = ReportStatus.valueOf(status);
            reportPage = reportRepository.findAllByStatus(reportStatus, pageable);
        } else {
            reportPage = reportRepository.findAll(pageable);
        }

        List<ReportResponse> content = reportPage.getContent()
                .stream()
                .map(ReportResponse::from)
                .collect(Collectors.toList());

        return ReportListResponse.builder()
                .content(content)
                .currentPage(reportPage.getNumber())
                .totalPages(reportPage.getTotalPages())
                .totalElements(reportPage.getTotalElements())
                .build();
    }

    /**
     * 신고 상세 조회
     */
    public ReportResponse getReportDetail(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("신고를 찾을 수 없습니다"));
        return ReportResponse.from(report);
    }

    /**
     * 신고 상태 업데이트
     */
    @Transactional
    public void updateReportStatus(Long reportId, ReportStatusRequest request, Long adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("신고를 찾을 수 없습니다"));

        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new EntityNotFoundException("관리자를 찾을 수 없습니다"));

        report.setStatus(request.getStatus());
        report.setResolvedBy(admin);
        report.setResolvedAt(LocalDateTime.now());
        report.setAdminNote(request.getAdminNote());

        if (request.getStatus() == ReportStatus.RESOLVED || request.getStatus() == ReportStatus.REJECTED) {

            report.setResolvedAt(LocalDateTime.now()); // 처리 시간 기록

            // ✅ 신고자 정보 조회 (ID -> Entity)
            User reporter = userRepository.findById(report.getReporterId())
                    .orElseThrow(() -> new EntityNotFoundException("신고자를 찾을 수 없습니다. (ID: " + report.getReporterId() + ")"));

            // ✅ 알림 메시지 생성
            String message = (request.getStatus() == ReportStatus.RESOLVED)
                    ? "접수하신 신고가 정상적으로 처리되었습니다."
                    : "접수하신 신고가 검토 결과 반려되었습니다.";

            // ✅ 알림 서비스 호출
            notificationService.notifyReportResult(reporter, reportId, message);
        }
    }
}