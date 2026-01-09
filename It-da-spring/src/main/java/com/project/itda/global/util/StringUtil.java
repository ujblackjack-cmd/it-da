package com.project.itda.global.util;

public class StringUtil {

    /**
     * 이메일 마스킹
     * test@example.com -> te**@example.com
     */
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }

        String[] parts = email.split("@");
        String localPart = parts[0];
        String domain = parts[1];

        if (localPart.length() <= 2) {
            return localPart + "**@" + domain;
        }

        return localPart.substring(0, 2) + "**@" + domain;
    }

    /**
     * 전화번호 마스킹
     * 010-1234-5678 -> 010-****-5678
     */
    public static String maskPhone(String phone) {
        if (phone == null) {
            return null;
        }

        String cleaned = phone.replaceAll("[^0-9]", "");

        if (cleaned.length() == 11) {
            return cleaned.substring(0, 3) + "-****-" + cleaned.substring(7);
        } else if (cleaned.length() == 10) {
            return cleaned.substring(0, 3) + "-***-" + cleaned.substring(6);
        }

        return phone;
    }

    /**
     * 이름 마스킹
     * 홍길동 -> 홍*동
     */
    public static String maskName(String name) {
        if (name == null || name.length() <= 1) {
            return name;
        }

        if (name.length() == 2) {
            return name.charAt(0) + "*";
        }

        return name.charAt(0) + "*".repeat(name.length() - 2) + name.charAt(name.length() - 1);
    }

    /**
     * null 또는 빈 문자열 체크
     */
    public static boolean isEmpty(String str) {
        return str == null || str.trim().isEmpty();
    }

    /**
     * null 또는 빈 문자열이 아닌지 체크
     */
    public static boolean isNotEmpty(String str) {
        return !isEmpty(str);
    }
}