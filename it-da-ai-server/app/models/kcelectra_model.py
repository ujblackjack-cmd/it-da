"""
KcELECTRA Sentiment Analysis Model
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
from typing import Dict, Optional


class KcELECTRAModel:
    """KcELECTRA 감성 분석 모델"""

    def __init__(self, model_path: str = "models/kcelectra_sentiment_with_typo"):
        self.model_path = Path(model_path)
        self.tokenizer: Optional[AutoTokenizer] = None
        self.model: Optional[AutoModelForSequenceClassification] = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.labels = ["NEGATIVE", "POSITIVE"]  # ✅ 2개 레이블 (NSMC)

    def load(self):
        """모델 로드"""
        if not self.model_path.exists():
            print(f"⚠️ Fine-tuned model not found: {self.model_path}")
            print("⚠️ Loading base model: beomi/KcELECTRA-base-v2022")
            model_path = "beomi/KcELECTRA-base-v2022"
            num_labels = 2  # Base 모델도 2개 레이블로 초기화
        else:
            model_path = str(self.model_path)
            num_labels = 2  # Fine-tuned 모델은 2개 레이블 (NSMC)

        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_path,
            num_labels=num_labels  # ✅ 2개 레이블
        )
        self.model.to(self.device)
        self.model.eval()

        print(f"✅ KcELECTRA 로드 완료: {model_path} (Device: {self.device}, Labels: {num_labels})")

    def predict(self, text: str) -> Dict:
        """감성 분석 예측"""
        if self.model is None or self.tokenizer is None:
            raise ValueError("Model not loaded. Call load() first.")

        # 토크나이징
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)

        # 추론
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1)[0]

        # 결과 (2개 레이블)
        pred_idx = torch.argmax(probs).item()
        sentiment = self.labels[pred_idx]
        score = probs[pred_idx].item()

        return {
            "text": text,
            "sentiment": sentiment,
            "score": round(score, 4),
            "probabilities": {
                "negative": round(probs[0].item(), 4),
                "positive": round(probs[1].item(), 4)
            }
        }

    def is_loaded(self) -> bool:
        """로드 여부 확인"""
        return self.model is not None and self.tokenizer is not None