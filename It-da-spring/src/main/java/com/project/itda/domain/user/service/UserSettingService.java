package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.request.UserSettingUpdateRequest;
import com.project.itda.domain.user.dto.response.UserSettingResponse;
import com.project.itda.domain.user.entity.UserSetting;
import com.project.itda.domain.user.repository.UserSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserSettingService {

    private final UserSettingRepository userSettingRepository;

    public UserSettingResponse getSetting(Long userId) {
        UserSetting setting = userSettingRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("설정 정보를 찾을 수 없습니다"));

        log.info("사용자 설정 조회: userId={}", userId);
        return UserSettingResponse.from(setting);
    }

    @Transactional
    public UserSettingResponse updateSetting(Long userId, UserSettingUpdateRequest request) {
        UserSetting setting = userSettingRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("설정 정보를 찾을 수 없습니다"));

        setting.updateSettings(
                request.getNotificationEnabled(),
                request.getPushNotification(),
                request.getLocationTracking()
        );

        log.info("사용자 설정 수정: userId={}", userId);
        return UserSettingResponse.from(setting);
    }
}