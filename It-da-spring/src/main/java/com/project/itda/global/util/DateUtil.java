package com.project.itda.global.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class DateUtil {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static String format(LocalDate date) {
        return date != null ? date.format(DATE_FORMATTER) : null;
    }

    public static String format(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(DATETIME_FORMATTER) : null;
    }

    public static LocalDate parseDate(String date) {
        return date != null ? LocalDate.parse(date, DATE_FORMATTER) : null;
    }

    public static LocalDateTime parseDateTime(String dateTime) {
        return dateTime != null ? LocalDateTime.parse(dateTime, DATETIME_FORMATTER) : null;
    }
}