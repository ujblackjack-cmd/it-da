"""
Synthetic 데이터 보강: gender + sentiment 추가
- users: gender, mbti 추가
- meetings: sentiment 데이터 추가 (캐시 시뮬레이션)
"""

import pandas as pd
import numpy as np

np.random.seed(42)

print("📂 기존 데이터 로딩...")
users_df = pd.read_csv('/mnt/user-data/uploads/synthetic_users_nationwide.csv')
meetings_df = pd.read_csv('/mnt/user-data/uploads/synthetic_meetings_nationwide.csv')
interactions_df = pd.read_csv('/mnt/user-data/uploads/synthetic_interactions_nationwide.csv')

print(f"  - Users: {len(users_df):,}명")
print(f"  - Meetings: {len(meetings_df):,}개")
print(f"  - Interactions: {len(interactions_df):,}개")

# ===============================
# 1. Users에 gender + mbti 추가
# ===============================

print("\n👤 Users 테이블 보강...")

# ✅ 성별 추가 (M:F:N = 48:48:4 비율)
genders = np.random.choice(['M', 'F', 'N'], size=len(users_df), p=[0.48, 0.48, 0.04])
users_df['gender'] = genders

# ✅ MBTI 추가 (16가지)
mbti_types = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP'
]

# E/I 비율: 50:50
# F/T 비율: 50:50
mbtis = np.random.choice(mbti_types, size=len(users_df))
users_df['mbti'] = mbtis

print(f"  ✅ gender 추가 완료")
print(f"     - M: {(users_df['gender'] == 'M').sum():,}명")
print(f"     - F: {(users_df['gender'] == 'F').sum():,}명")
print(f"     - N: {(users_df['gender'] == 'N').sum():,}명")
print(f"  ✅ mbti 추가 완료 (16가지 타입)")

# ===============================
# 2. Meetings에 sentiment 추가
# ===============================

print("\n📊 Meetings 테이블 보강 (sentiment 시뮬레이션)...")


# ✅ 각 모임의 리뷰들로부터 감성 통계 계산 (시뮬레이션)
# 실제로는 KcELECTRA 배치 작업으로 생성하지만, 여기선 논리적으로 생성

def generate_sentiment_for_meeting(meeting_id, interactions_df):
    """
    특정 모임의 리뷰들로부터 감성 점수 시뮬레이션
    - 평점이 높으면 긍정 비율 높음
    - 평점 분산이 크면 sentiment_variance 높음
    """
    meeting_interactions = interactions_df[interactions_df['meeting_id'] == meeting_id]

    if len(meeting_interactions) == 0:
        # 리뷰 없는 모임 (기본값)
        return {
            'avg_sentiment_score': 0.5,
            'positive_review_ratio': 0.5,
            'negative_review_ratio': 0.5,
            'review_sentiment_variance': 0.0
        }

    ratings = meeting_interactions['rating'].values
    avg_rating = ratings.mean()
    rating_std = ratings.std()

    # ✅ 평점 → 감성 점수 매핑
    # rating 5.0 → sentiment 0.9~1.0
    # rating 3.0 → sentiment 0.5
    # rating 1.0 → sentiment 0.0~0.1

    avg_sentiment = np.clip((avg_rating - 1) / 4, 0, 1)  # [1,5] → [0,1]

    # ✅ 긍정/부정 비율 (threshold: 3.5)
    positive_count = (ratings >= 3.5).sum()
    negative_count = (ratings < 3.5).sum()
    total = len(ratings)

    positive_ratio = positive_count / total
    negative_ratio = negative_count / total

    # ✅ 분산 (의견 일치도)
    # 분산이 크면 의견이 갈림 (논쟁적 모임)
    # 분산이 작으면 의견 일치 (안정적 모임)
    sentiment_variance = np.clip(rating_std / 2, 0, 1)  # [0, 2] → [0, 1]

    return {
        'avg_sentiment_score': round(avg_sentiment, 3),
        'positive_review_ratio': round(positive_ratio, 3),
        'negative_review_ratio': round(negative_ratio, 3),
        'review_sentiment_variance': round(sentiment_variance, 3)
    }


# 각 모임에 대해 sentiment 생성
sentiment_data = []

for idx, row in meetings_df.iterrows():
    if idx % 50 == 0:
        print(f"  진행중: {idx}/{len(meetings_df)}", end='\r')

    sentiment = generate_sentiment_for_meeting(row['meeting_id'], interactions_df)
    sentiment_data.append(sentiment)

# DataFrame에 추가
meetings_df['avg_sentiment_score'] = [s['avg_sentiment_score'] for s in sentiment_data]
meetings_df['positive_review_ratio'] = [s['positive_review_ratio'] for s in sentiment_data]
meetings_df['negative_review_ratio'] = [s['negative_review_ratio'] for s in sentiment_data]
meetings_df['review_sentiment_variance'] = [s['review_sentiment_variance'] for s in sentiment_data]

print(f"\n  ✅ sentiment 추가 완료")
print(f"     - avg_sentiment_score: {meetings_df['avg_sentiment_score'].mean():.3f} (평균)")
print(f"     - positive_ratio: {meetings_df['positive_review_ratio'].mean():.3f} (평균)")
print(f"     - negative_ratio: {meetings_df['negative_review_ratio'].mean():.3f} (평균)")
print(f"     - variance: {meetings_df['review_sentiment_variance'].mean():.3f} (평균)")

# ===============================
# 3. 저장
# ===============================

print("\n💾 저장 중...")

users_df.to_csv('/mnt/user-data/outputs/synthetic_users_nationwide_v2.csv', index=False)
meetings_df.to_csv('/mnt/user-data/outputs/synthetic_meetings_nationwide_v2.csv', index=False)
interactions_df.to_csv('/mnt/user-data/outputs/synthetic_interactions_nationwide_v2.csv', index=False)

print(f"""
✅ 데이터 보강 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 보강 내용:
  1. Users:
     - gender (M/F/N) 추가
     - mbti (16가지) 추가

  2. Meetings:
     - avg_sentiment_score 추가
     - positive_review_ratio 추가
     - negative_review_ratio 추가
     - review_sentiment_variance 추가

  3. Interactions:
     - 변경사항 없음 (그대로 복사)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 저장 위치:
  - /mnt/user-data/outputs/synthetic_users_nationwide_v2.csv
  - /mnt/user-data/outputs/synthetic_meetings_nationwide_v2.csv
  - /mnt/user-data/outputs/synthetic_interactions_nationwide_v2.csv

🎯 다음 단계:
  → train_lightgbm_ranker_v3.py로 35개 피처 학습!
""")

# ===============================
# 4. 통계 출력
# ===============================

print("\n📈 상세 통계:")
print(f"\n[Users]")
print(f"  Gender 분포:")
print(users_df['gender'].value_counts())
print(f"\n  MBTI 상위 5개:")
print(users_df['mbti'].value_counts().head())

print(f"\n[Meetings]")
print(f"  Sentiment 통계:")
print(meetings_df[['avg_sentiment_score', 'positive_review_ratio',
                   'negative_review_ratio', 'review_sentiment_variance']].describe())

print(f"\n[Interactions]")
print(f"  Rating 분포:")
print(interactions_df['rating'].describe())