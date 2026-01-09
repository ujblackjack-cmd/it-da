package com.project.itda.global.util;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class GeocodingUtil {

    /**
     * 주소를 좌표로 변환 (카카오/네이버 API 연동 필요)
     * @param address 주소
     * @return 좌표
     */
    public static Coordinate getCoordinate(String address) {
        // TODO: 카카오맵 API 또는 네이버맵 API 연동
        log.warn("GeocodingUtil.getCoordinate() is not implemented yet: address={}", address);
        return new Coordinate(37.5665, 126.9780); // 서울시청 임시 좌표
    }

    /**
     * 좌표를 주소로 변환
     * @param latitude 위도
     * @param longitude 경도
     * @return 주소
     */
    public static String getAddress(double latitude, double longitude) {
        // TODO: 카카오맵 API 또는 네이버맵 API 연동
        log.warn("GeocodingUtil.getAddress() is not implemented yet: lat={}, lon={}", latitude, longitude);
        return "서울특별시";
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Coordinate {
        private double latitude;
        private double longitude;
    }
}