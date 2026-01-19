package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // 이메일로 사용자 찾기
    Optional<User> findByEmail(String email);

    // 닉네임으로 사용자 찾기
    Optional<User> findByUsername(String username);

    // 🆕 이메일 prefix로 사용자 찾기 (@ 앞부분)
    // 예: "utmmppol" 입력하면 "utmmppol@naver.com" 유저 찾음
    @Query("SELECT u FROM User u WHERE u.email LIKE CONCAT(:emailPrefix, '@%')")
    List<User> findAllByEmailPrefix(@Param("emailPrefix") String emailPrefix);

    // 닉네임 존재 여부 확인
    boolean existsByUsername(String username);

    // 이메일 존재 여부 확인
    boolean existsByEmail(String email);

    // 전화번호 존재 여부 확인
    boolean existsByPhone(String phone);
}