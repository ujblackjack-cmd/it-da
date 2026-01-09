package com.project.itda.domain.log.service;

import com.project.itda.domain.log.entity.UserActivityLog;
import com.project.itda.domain.log.repository.UserActivityLogRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final UserActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void log(Long userId, String activityType, String pageUrl, HttpServletRequest request) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        UserActivityLog activityLog = UserActivityLog.builder()
                .user(user)
                .activityType(activityType)
                .pageUrl(pageUrl)
                .referrer(request.getHeader("Referer"))
                .userAgent(request.getHeader("User-Agent"))
                .ipAddress(getClientIp(request))
                .sessionId(request.getSession(false) != null ?
                        request.getSession(false).getId() : null)
                .build();

        activityLogRepository.save(activityLog);
        log.debug("Activity logged: userId={}, type={}, page={}", userId, activityType, pageUrl);
    }

    @Transactional(readOnly = true)
    public List<UserActivityLog> getUserActivityLogs(Long userId) {
        return activityLogRepository.findByUser_UserId(userId);
    }

    @Transactional(readOnly = true)
    public List<UserActivityLog> getRecentUserActivity(Long userId) {
        return activityLogRepository.findTop10ByUser_UserIdOrderByCreatedAtDesc(userId);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}