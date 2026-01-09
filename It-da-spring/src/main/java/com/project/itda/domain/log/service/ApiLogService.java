package com.project.itda.domain.log.service;

import com.project.itda.domain.log.entity.ApiLog;
import com.project.itda.domain.log.repository.ApiLogRepository;
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
public class ApiLogService {

    private final ApiLogRepository apiLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void log(String endpoint, String method, Long userId,
                    Integer statusCode, Integer responseTimeMs,
                    String requestBody, String responseBody,
                    String errorMessage, HttpServletRequest request) {

        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        ApiLog apiLog = ApiLog.builder()
                .endpoint(endpoint)
                .method(method)
                .user(user)
                .statusCode(statusCode)
                .responseTimeMs(responseTimeMs)
                .requestBody(requestBody)
                .responseBody(responseBody)
                .errorMessage(errorMessage)
                .ipAddress(getClientIp(request))
                .build();

        apiLogRepository.save(apiLog);
        log.debug("API logged: {} {} - status={}, time={}ms", method, endpoint, statusCode, responseTimeMs);
    }

    @Transactional(readOnly = true)
    public List<ApiLog> getApiLogs(String endpoint) {
        return apiLogRepository.findByEndpoint(endpoint);
    }

    @Transactional(readOnly = true)
    public List<ApiLog> getErrorLogs() {
        return apiLogRepository.findByStatusCodeGreaterThanEqual(400);
    }

    @Transactional(readOnly = true)
    public List<ApiLog> getSlowApis(int threshold) {
        return apiLogRepository.findByResponseTimeMsGreaterThan(threshold);
    }

    @Transactional(readOnly = true)
    public Double getAverageResponseTime(String endpoint) {
        return apiLogRepository.getAverageResponseTime(endpoint);
    }

    @Transactional(readOnly = true)
    public List<ApiLog> getUserApiLogs(Long userId) {
        return apiLogRepository.findByUser_UserId(userId);
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