package com.project.itda.domain.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserListResponse {
    private List<UserManageResponse> users;
    private int currentPage;
    private int totalPages;
    private long totalElements;
}