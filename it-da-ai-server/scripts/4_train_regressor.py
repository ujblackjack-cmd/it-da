"""
Step 4: 감성 피처를 포함한 LightGBM Regressor 재학습
"""

import pandas as pd
import numpy as np
import pickle
import warnings
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import lightgbm as lgb
import sys
import os

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from app.core.feature_builder import FeatureBuilder

warnings.filterwarnings('ignore')
os.environ['LIGHTGBM_VERBOSITY'] = '-1'


def load_training_data():
    """학습 데이터 로드"""
    print("\n[1/5] 학습 데이터 로딩...")
    df = pd.read_csv('data/training_data.csv')

    meeting_sentiment = pd.read_csv('data/meeting_sentiment.csv')

    print(f"[OK] {len(df):,}개 샘플 로드")
    print(f"[OK] {len(meeting_sentiment):,}개 모임 감성 데이터 로드")

    return df, meeting_sentiment


def prepare_features(df: pd.DataFrame, meeting_sentiment: pd.DataFrame, feature_builder: FeatureBuilder):
    """FeatureBuilder로 특징 벡터 생성"""

    print("\n[2/5] Feature 생성 중...")

    df = df.merge(meeting_sentiment[['meeting_id', 'avg_sentiment_score',
                                      'positive_review_ratio', 'negative_review_ratio',
                                      'review_sentiment_variance']],
                  on='meeting_id', how='left', suffixes=('', '_agg'))

    X_list = []
    y_list = []

    for idx, row in df.iterrows():
        if idx % 1000 == 0:
            print(f"  진행: {idx:,} / {len(df):,}")

        user = {
            "lat": row['user_lat'],
            "lng": row['user_lng'],
            "interests": row['user_interests'],
            "time_preference": row['time_preference'],
            "user_location_pref": row['user_location_pref'],
            "budget_type": row['budget_type'],
            "user_avg_rating": row['user_avg_rating'],
            "user_meeting_count": row['user_meeting_count'],
            "user_rating_std": row['user_rating_std'],
            "gender": row['user_gender'],
            "mbti": row['user_mbti'],
        }

        meeting = {
            "lat": row['meeting_lat'],
            "lng": row['meeting_lng'],
            "category": row['category'],
            "subcategory": row.get('subcategory', ''),
            "time_slot": row['time_slot'],
            "meeting_location_type": row['meeting_location_type'],
            "vibe": row['vibe'],
            "max_participants": row['max_participants'],
            "expected_cost": row['expected_cost'],
            "meeting_avg_rating": row['meeting_avg_rating'],
            "meeting_rating_count": row['meeting_rating_count'],
            "meeting_participant_count": row['meeting_participant_count'],

            "sentiment": {
                "avg_sentiment_score": row.get('avg_sentiment_score_agg', row.get('avg_sentiment_score', 0.5)),
                "positive_review_ratio": row.get('positive_review_ratio_agg', row.get('positive_review_ratio', 0.5)),
                "negative_review_ratio": row.get('negative_review_ratio_agg', row.get('negative_review_ratio', 0.5)),
                "review_sentiment_variance": row.get('review_sentiment_variance_agg', row.get('review_sentiment_variance', 0.0)),
            }
        }

        try:
            _, X = feature_builder.build(user, meeting)
            X_list.append(X[0])
            y_list.append(row['rating'])
        except Exception as e:
            continue

    X = np.array(X_list)
    y = np.array(y_list)

    print(f"[OK] Feature 생성 완료: {X.shape}")

    return X, y


def train_regressor():
    """LightGBM Regressor 학습"""

    print("=" * 70)
    print("[Step 4] LightGBM Regressor 재학습")
    print("=" * 70)

    df, meeting_sentiment = load_training_data()

    feature_builder = FeatureBuilder()
    print(f"[OK] FeatureBuilder 준비 (총 {feature_builder.n_features}개 features)")

    X, y = prepare_features(df, meeting_sentiment, feature_builder)

    print("\n[3/5] Train/Test Split...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )
    print(f"[OK] Train: {len(X_train):,}, Test: {len(X_test):,}")

    print("\n[4/5] LightGBM 학습 중...")

    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'max_depth': 6,
        'min_child_samples': 20,
    }

    train_data = lgb.Dataset(X_train, label=y_train)
    valid_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

    model = lgb.train(
        params,
        train_data,
        num_boost_round=500,
        valid_sets=[valid_data],
        callbacks=[
            lgb.early_stopping(stopping_rounds=50),
            lgb.log_evaluation(period=50)
        ]
    )

    print("[OK] 학습 완료")

    print("\n[5/5] 모델 평가...")
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    print("\n[통계] Train 성능:")
    print(f"  RMSE: {np.sqrt(mean_squared_error(y_train, y_pred_train)):.4f}")
    print(f"  MAE:  {mean_absolute_error(y_train, y_pred_train):.4f}")
    print(f"  R2:   {r2_score(y_train, y_pred_train):.4f}")

    print("\n[통계] Test 성능:")
    print(f"  RMSE: {np.sqrt(mean_squared_error(y_test, y_pred_test)):.4f}")
    print(f"  MAE:  {mean_absolute_error(y_test, y_pred_test):.4f}")
    print(f"  R2:   {r2_score(y_test, y_pred_test):.4f}")

    print("\n[통계] Top 15 Feature Importance:")
    importance = model.feature_importance(importance_type='gain')
    feature_names = feature_builder.get_feature_names()

    importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': importance
    }).sort_values('importance', ascending=False).head(15)

    for idx, row in importance_df.iterrows():
        print(f"  {row['feature']:<30} {row['importance']:>10.1f}")

    print("\n[INFO] 모델 저장 중...")
    os.makedirs('models', exist_ok=True)

    payload = {
        "model": model,
        "regressor": model,
        "feature_names": feature_names,
        "schema_version": "v2_with_sentiment",
        "scaler": None
    }

    model_path = 'models/lightgbm_regressor.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(payload, f)

    print(f"[OK] 모델 저장: {model_path}")

    print("\n" + "=" * 70)
    print("[완료] 재학습 완료!")
    print("=" * 70)

    return model


if __name__ == "__main__":
    train_regressor()