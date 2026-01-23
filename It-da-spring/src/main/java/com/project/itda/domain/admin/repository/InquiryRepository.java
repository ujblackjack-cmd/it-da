package com.project.itda.domain.admin.repository;

import com.project.itda.domain.admin.entity.Inquiry;
import com.project.itda.domain.admin.enums.InquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Long countByStatus(InquiryStatus status);
}