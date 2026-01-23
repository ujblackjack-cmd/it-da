"""
Step 1: Spring Boot MySQL DB에서 리뷰 데이터 추출
"""

import pymysql
import pandas as pd
from datetime import datetime
import os
import sys

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# ========================================
# MySQL 연결 설정
# ========================================
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '1234',
    'database': 'itda',
    'charset': 'utf8mb4'
}

# ========================================
# 데이터 추출 쿼리
# ========================================
EXTRACT_QUERY = """
SELECT 
    r.review_id,
    r.user_id,
    r.meeting_id,
    r.rating,
    r.review_text AS content,
    r.created_at,
    
    u.latitude AS user_lat,
    u.longitude AS user_lng,
    u.gender AS user_gender,
    u.mbti AS user_mbti,
    u.interests AS user_interests,
    
    up.time_preference,
    up.location_type AS user_location_pref,
    up.budget_type,
    up.energy_type,
    up.leadership_type,
    up.frequency_type,
    up.purpose_type,
    
    (SELECT AVG(r2.rating) FROM reviews r2 WHERE r2.user_id = r.user_id AND r2.deleted_at IS NULL) AS user_avg_rating,
    (SELECT COUNT(*) FROM participations p WHERE p.user_id = r.user_id) AS user_meeting_count,
    (SELECT STDDEV(r2.rating) FROM reviews r2 WHERE r2.user_id = r.user_id AND r2.deleted_at IS NULL) AS user_rating_std,
    
    m.category,
    m.subcategory,
    m.vibe,
    m.latitude AS meeting_lat,
    m.longitude AS meeting_lng,
    m.time_slot,
    m.location_type AS meeting_location_type,
    m.expected_cost,
    m.max_participants,
    
    (SELECT AVG(r3.rating) FROM reviews r3 WHERE r3.meeting_id = r.meeting_id AND r3.deleted_at IS NULL) AS meeting_avg_rating,
    (SELECT COUNT(*) FROM reviews r3 WHERE r3.meeting_id = r.meeting_id AND r3.deleted_at IS NULL) AS meeting_rating_count,
    (SELECT COUNT(*) FROM participations p2 WHERE p2.meeting_id = r.meeting_id) AS meeting_participant_count

FROM reviews r
JOIN users u ON r.user_id = u.user_id
LEFT JOIN user_preferences up ON u.user_id = up.user_id
JOIN meetings m ON r.meeting_id = m.meeting_id

WHERE r.review_text IS NOT NULL
  AND r.review_text != ''
  AND r.rating IS NOT NULL
  AND r.deleted_at IS NULL
  AND u.deleted_at IS NULL

ORDER BY r.created_at DESC
"""


def extract_reviews():
    """리뷰 데이터 추출"""

    print("=" * 70)
    print("[Step 1] Spring Boot DB에서 리뷰 추출")
    print("=" * 70)

    try:
        # MySQL 연결
        print("\n[1/3] MySQL 연결 중...")
        conn = pymysql.connect(**DB_CONFIG)
        print("[OK] 연결 성공")

        # 데이터 추출
        print("\n[2/3] 리뷰 데이터 추출 중...")
        df = pd.read_sql(EXTRACT_QUERY, conn)
        print(f"[OK] {len(df):,}개 리뷰 추출 완료")

        # NULL 처리
        df['user_rating_std'] = df['user_rating_std'].fillna(0.5)
        df['user_interests'] = df['user_interests'].fillna('')
        df['user_mbti'] = df['user_mbti'].fillna('')
        df['user_gender'] = df['user_gender'].fillna('N')

        # user_preferences가 없는 경우 기본값
        df['time_preference'] = df['time_preference'].fillna('EVENING')
        df['user_location_pref'] = df['user_location_pref'].fillna('INDOOR')
        df['budget_type'] = df['budget_type'].fillna('value')
        df['energy_type'] = df['energy_type'].fillna('EXTROVERT')
        df['leadership_type'] = df['leadership_type'].fillna('FOLLOWER')
        df['frequency_type'] = df['frequency_type'].fillna('REGULAR')
        df['purpose_type'] = df['purpose_type'].fillna('TASK')

        # 저장
        print("\n[3/3] CSV 저장 중...")
        os.makedirs('data', exist_ok=True)
        output_path = 'data/reviews_raw.csv'
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"[OK] 저장 완료: {output_path}")

        # 통계 출력
        print("\n" + "=" * 70)
        print("[통계] 데이터 통계")
        print("=" * 70)
        print(f"총 리뷰 수: {len(df):,}개")
        print(f"고유 사용자: {df['user_id'].nunique():,}명")
        print(f"고유 모임: {df['meeting_id'].nunique():,}개")
        print(f"\n평점 분포:")
        print(df['rating'].value_counts().sort_index())
        print(f"\n평균 평점: {df['rating'].mean():.2f}")
        print(f"평점 표준편차: {df['rating'].std():.2f}")

        conn.close()

        return df

    except Exception as e:
        print(f"\n[ERROR] 추출 실패: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    extract_reviews()