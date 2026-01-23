package com.project.itda.domain.admin.entity;

import com.project.itda.domain.admin.enums.InquiryStatus;
import com.project.itda.domain.admin.enums.InquiryType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "inquiries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inquiry_id")
    private Long inquiryId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InquiryType type;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private InquiryStatus status = InquiryStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Column(name = "answered_by")
    private Long answeredBy; // 답변한 관리자 ID

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * 답변 작성
     */
    public void answer(String answer, Long adminId) {
        this.answer = answer;
        this.answeredAt = LocalDateTime.now();
        this.answeredBy = adminId;
        this.status = InquiryStatus.COMPLETED;
    }
}