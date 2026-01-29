"""
LightGBM Ranker Model Wrapper - 경고 완전 차단
"""

import json
import pickle
import os
import sys
import warnings
from pathlib import Path
from typing import Optional, Any
from contextlib import contextmanager
import numpy as np


@contextmanager
def suppress_stdout_stderr():
    """stdout/stderr를 완전히 차단"""
    with open(os.devnull, 'w') as devnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = devnull
        sys.stderr = devnull
        try:
            yield
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr


class LightGBMRankerModel:
    def __init__(self, model_path: str = "models/lightgbm_ranker.pkl", calib_path: Optional[str] = None):
        self.model_path = Path(model_path)
        self.calib_path = Path(calib_path) if calib_path else None

        self.model: Optional[Any] = None
        self.calibration: Optional[dict] = None
        self.scaler = None
        self.feature_names = []
        self.model_type: Optional[str] = None
        self.schema_version: Optional[str] = None

        # 환경 변수 설정
        os.environ['LIGHTGBM_VERBOSITY'] = '-1'
        warnings.filterwarnings('ignore')

    def load(self):
        """모델 로드"""
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {self.model_path}")

        print(f"📦 LightGBM Ranker 로딩 중: {self.model_path}")

        with open(self.model_path, "rb") as f:
            loaded = pickle.load(f)

        # 새 형식
        if isinstance(loaded, dict) and "model" in loaded:
            self.model = loaded["model"]
            self.feature_names = loaded.get("feature_names", [])
            self.schema_version = loaded.get("schema_version")
            self.scaler = loaded.get("scaler")
            self.model_type = "dict_model_bundle"
            print(f"  ✅ 새 형식 모델 로드 (schema: {self.schema_version})")

        # 구 형식
        elif isinstance(loaded, dict) and "ranker" in loaded:
            self.model = loaded["ranker"]
            self.scaler = loaded.get("scaler")
            self.feature_names = loaded.get("feature_names", [])
            self.model_type = "dict_ranker_bundle"
            print(f"  ✅ 구 형식 모델 로드")

        # 직접 모델
        else:
            self.model = loaded
            self.model_type = "direct_model"
            print(f"  ✅ 직접 모델 로드")

        # verbose 설정
        if hasattr(self.model, 'set_params'):
            self.model.set_params(verbose=-1)

        # calibration 로드
        if self.calib_path and self.calib_path.exists():
            with open(self.calib_path, "r", encoding="utf-8") as f:
                self.calibration = json.load(f)
            print(f"  ✅ Calibration 로드: {self.calib_path}")

        print(
            f"✅ LightGBM Ranker 로드 완료! "
            f"(type={self.model_type}, features={len(self.feature_names)}, "
            f"calib={'yes' if self.calibration else 'no'})"
        )

    def predict(self, X: np.ndarray) -> np.ndarray:
        """예측 수행 - 경고 차단"""
        if self.model is None:
            raise ValueError("Model not loaded. Call load() first.")

        if self.scaler is not None:
            X = self.scaler.transform(X)

        # ⭐ stdout 리다이렉션으로 경고 차단
        with suppress_stdout_stderr():
            predictions = self.model.predict(X)

        return predictions

    def predict_single(self, features: np.ndarray) -> float:
        """단일 샘플 예측"""
        if features.ndim == 1:
            features = features.reshape(1, -1)
        return float(self.predict(features)[0])

    def is_loaded(self) -> bool:
        return self.model is not None

    def get_info(self) -> dict:
        return {
            "loaded": self.is_loaded(),
            "model_type": self.model_type,
            "schema_version": self.schema_version,
            "n_features": len(self.feature_names),
            "feature_names": self.feature_names[:10] if self.feature_names else [],
            "has_scaler": self.scaler is not None,
            "has_calibration": self.calibration is not None,
        }