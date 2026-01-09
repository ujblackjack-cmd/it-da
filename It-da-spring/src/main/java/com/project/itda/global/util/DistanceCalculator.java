package com.project.itda.global.util;

public class DistanceCalculator {

    private static final double EARTH_RADIUS = 6371.0; // km

    /**
     * 두 좌표 사이의 거리 계산 (Haversine formula)
     * @param lat1 위도1
     * @param lon1 경도1
     * @param lat2 위도2
     * @param lon2 경도2
     * @return 거리 (km)
     */
    public static double calculate(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS * c;
    }

    /**
     * km를 m로 변환
     */
    public static int toMeters(double km) {
        return (int) (km * 1000);
    }
}