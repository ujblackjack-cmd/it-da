"""
Step 2: KcELECTRA로 리뷰 감성 분석
"""

import pandas as pd
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from tqdm import tqdm
import os
import warnings
import sys

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

warnings.filterwarnings('ignore')

MODEL_PATH = "./models/kcelectra_sentiment_with_typo"
BATCH_SIZE = 32
MAX_LENGTH = 128

class SentimentAnalyzer:
    def __init__(self, model_path: str):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[INFO] Device: {self.device}")

        print(f"[INFO] KcELECTRA 로딩: {model_path}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.model.to(self.device)
        self.model.eval()
        print("[OK] 모델 로드 완료")

    def predict_batch(self, texts: list) -> list:
        """배치 감성 분석"""
        results = []

        for i in tqdm(range(0, len(texts), BATCH_SIZE), desc="감성 분석"):
            batch = texts[i:i + BATCH_SIZE]

            inputs = self.tokenizer(
                batch,
                truncation=True,
                max_length=MAX_LENGTH,
                padding=True,
                return_tensors='pt'
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=1)
                preds = torch.argmax(probs, dim=1)

            for pred, prob in zip(preds, probs):
                pred_val = pred.item()
                confidence = prob[pred_val].item()

                results.append({
                    'label': 'POSITIVE' if pred_val == 1 else 'NEGATIVE',
                    'score': confidence,
                    'positive_prob': prob[1].item(),
                    'negative_prob': prob[0].item()
                })

        return results


def analyze_reviews():
    """리뷰 감성 분석 실행"""

    print("=" * 70)
    print("[Step 2] KcELECTRA 감성 분석")
    print("=" * 70)

    print("\n[1/3] 리뷰 데이터 로딩...")
    df = pd.read_csv('data/reviews_raw.csv')
    print(f"[OK] {len(df):,}개 리뷰 로드")

    print("\n[2/3] 감성 분석 수행 중...")
    analyzer = SentimentAnalyzer(MODEL_PATH)

    texts = df['content'].fillna('').tolist()
    results = analyzer.predict_batch(texts)

    df['sentiment_label'] = [r['label'] for r in results]
    df['sentiment_score'] = [r['score'] for r in results]
    df['positive_prob'] = [r['positive_prob'] for r in results]
    df['negative_prob'] = [r['negative_prob'] for r in results]

    print("\n[3/3] 결과 저장 중...")
    output_path = 'data/reviews_sentiment.csv'
    df.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"[OK] 저장 완료: {output_path}")

    print("\n" + "=" * 70)
    print("[통계] 감성 분석 결과")
    print("=" * 70)
    pos_count = (df['sentiment_label'] == 'POSITIVE').sum()
    neg_count = (df['sentiment_label'] == 'NEGATIVE').sum()
    print(f"긍정 리뷰: {pos_count:,}개 ({pos_count / len(df) * 100:.1f}%)")
    print(f"부정 리뷰: {neg_count:,}개 ({neg_count / len(df) * 100:.1f}%)")
    print(f"\n평균 긍정 확률: {df['positive_prob'].mean():.3f}")
    print(f"평균 부정 확률: {df['negative_prob'].mean():.3f}")

    print("\n평점별 긍정 비율:")
    for rating in sorted(df['rating'].unique()):
        subset = df[df['rating'] == rating]
        pos_ratio = (subset['sentiment_label'] == 'POSITIVE').sum() / len(subset)
        print(f"  {rating}점: {pos_ratio:.1%}")

    return df


if __name__ == "__main__":
    analyze_reviews()