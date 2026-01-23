"""
Step 3: 모임별 감성 집계 + LightGBM 학습 데이터 생성
"""

import pandas as pd
import numpy as np
import os
import sys

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def aggregate_meeting_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """모임별 감성 점수 집계"""

    print("\n[1/2] 모임별 감성 집계 중...")

    meeting_sentiment = df.groupby('meeting_id').agg({
        'positive_prob': ['mean', 'std', 'min', 'max'],
        'negative_prob': ['mean', 'std'],
        'sentiment_label': lambda x: (x == 'POSITIVE').sum() / len(x),
        'rating': 'count'
    }).reset_index()

    meeting_sentiment.columns = [
        'meeting_id',
        'avg_sentiment_score',
        'sentiment_std',
        'min_sentiment_score',
        'max_sentiment_score',
        'negative_sentiment_mean',
        'negative_sentiment_std',
        'positive_review_ratio',
        'review_count'
    ]

    # ✅ negative_review_ratio 추가
    meeting_sentiment['negative_review_ratio'] = 1.0 - meeting_sentiment['positive_review_ratio']
    meeting_sentiment['review_sentiment_variance'] = meeting_sentiment['sentiment_std']

    print(f"[OK] {len(meeting_sentiment)}개 모임 집계 완료")

    return meeting_sentiment


def build_training_data():
    """LightGBM 학습 데이터 생성"""

    print("=" * 70)
    print("[Step 3] LightGBM 학습 데이터 생성")
    print("=" * 70)

    print("\n[1/4] 데이터 로딩...")
    df = pd.read_csv('data/reviews_sentiment.csv')
    print(f"[OK] {len(df):,}개 리뷰 로드")

    meeting_sentiment = aggregate_meeting_sentiment(df)

    print("\n[2/4] 감성 점수 병합 중...")
    df_merged = df.merge(meeting_sentiment, on='meeting_id', how='left')

    df_merged['negative_review_ratio'] = 1.0 - df_merged['positive_review_ratio']

    sentiment_cols = [
        'avg_sentiment_score', 'positive_review_ratio',
        'negative_review_ratio', 'review_sentiment_variance'
    ]

    for col in sentiment_cols:
        df_merged[col] = df_merged[col].fillna(0.5 if 'ratio' in col else 0.0)

    print(f"[OK] 감성 피처 추가 완료")

    print("\n[3/4] Feature 선택 중...")

    feature_columns = [
        'rating',
        'user_id', 'user_lat', 'user_lng', 'user_gender', 'user_mbti',
        'user_interests', 'time_preference', 'user_location_pref', 'budget_type',
        'user_avg_rating', 'user_meeting_count', 'user_rating_std',
        'meeting_id', 'category', 'subcategory', 'vibe',
        'meeting_lat', 'meeting_lng', 'time_slot', 'meeting_location_type',
        'expected_cost', 'max_participants',
        'meeting_avg_rating', 'meeting_rating_count', 'meeting_participant_count',
        'avg_sentiment_score',
        'positive_review_ratio',
        'negative_review_ratio',
        'review_sentiment_variance',
    ]

    df_train = df_merged[feature_columns].copy()

    print("\n[4/4] 학습 데이터 저장 중...")
    output_path = 'data/training_data.csv'
    df_train.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"[OK] 저장 완료: {output_path}")

    print("\n" + "=" * 70)
    print("[통계] 학습 데이터 통계")
    print("=" * 70)
    print(f"총 샘플 수: {len(df_train):,}개")
    print(f"Feature 수: {len(feature_columns)}개")
    print(f"\n감성 피처 통계:")
    print(df_train[['avg_sentiment_score', 'positive_review_ratio',
                    'negative_review_ratio', 'review_sentiment_variance']].describe())

    meeting_sentiment_path = 'data/meeting_sentiment.csv'
    meeting_sentiment.to_csv(meeting_sentiment_path, index=False, encoding='utf-8-sig')
    print(f"\n[OK] 모임 감성 테이블 저장: {meeting_sentiment_path}")

    return df_train, meeting_sentiment


if __name__ == "__main__":
    build_training_data()