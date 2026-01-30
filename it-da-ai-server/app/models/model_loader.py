"""
Model Loader - 모든 AI 모델 통합 관리
"""

from app.models.lightgbm_ranker_model import LightGBMRankerModel
from app.models.lightgbm_regressor import LightGBMRegressorModel
from app.models.kcelectra_model import KcELECTRAModel
from app.models.svd_model import SVDModel
from app.core.feature_builder import FeatureBuilder
from typing import Optional
import warnings
import os


class ModelLoader:
    """
    모든 AI 모델을 로드하고 관리하는 싱글톤 클래스
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        # ⭐ LightGBM 경고 억제
        warnings.filterwarnings('ignore', category=UserWarning)

        if self._initialized:
            return

        # ⭐ 초기화 시점에 경고 완전 차단
        import logging
        warnings.filterwarnings('ignore')
        os.environ['LIGHTGBM_VERBOSITY'] = '-1'
        logging.getLogger('lightgbm').setLevel(logging.ERROR)

        # 모델 초기화
        self.ranker: Optional[LightGBMRankerModel] = None      # ✅ Ranker (검색/피드용)
        self.regressor: Optional[LightGBMRegressorModel] = None   # ✅ Regressor (만족도 예측용)
        self.kcelectra: Optional[KcELECTRAModel] = None
        self.svd: Optional[SVDModel] = None
        self.feature_builder: Optional[FeatureBuilder] = None

        self._initialized = True

    def load_all(self):
        """모든 모델 로드"""
        print("=" * 70)
        print("🚀 AI 모델 로딩 시작")
        print("=" * 70)

        try:
            # 1. FeatureBuilder
            print("\n[1/5] FeatureBuilder 초기화...")
            self.feature_builder = FeatureBuilder()
            print("✅ FeatureBuilder 준비 완료")

            # 2. LightGBM Ranker (검색/피드용)
            print("\n[2/5] LightGBM Ranker 로딩...")
            self.ranker = LightGBMRankerModel(
                model_path="models/lightgbm_ranker.pkl",
                calib_path="models/lightgbm_ranker_calibration.json"
            )
            self.ranker.load()

            # 3. LightGBM Regressor (만족도 예측용)
            print("\n[3/5] LightGBM Regressor 로딩...")
            self.regressor = LightGBMRegressorModel(
                model_path="models/lightgbm_regressor.pkl"  # ✅ Regressor 파일
            )

            self.regressor.load()


            # 4. KcELECTRA
            print("\n[4/5] KcELECTRA 로딩...")
            self.kcelectra = KcELECTRAModel()
            self.kcelectra.load()

            # 5. SVD
            print("\n[5/5] SVD 모델 로딩...")
            self.svd = SVDModel()
            self.svd.load()

            print("\n" + "=" * 70)
            print("🎉 모든 모델 로딩 완료!")
            print("=" * 70)

        except Exception as e:
            print(f"\n❌ 모델 로딩 실패: {e}")
            raise

    def is_ready(self) -> bool:
        """모든 모델이 준비되었는지 확인"""
        return (
                self.feature_builder is not None and
                self.ranker is not None and self.ranker.is_loaded() and
                self.regressor is not None and self.regressor.is_loaded() and
                self.kcelectra is not None and self.kcelectra.is_loaded() and
                self.svd is not None and self.svd.is_loaded()
        )

    def get_status(self) -> dict:
        """모델 상태 반환"""
        return {
            "feature_builder": self.feature_builder is not None,
            "ranker": self.ranker is not None and self.ranker.is_loaded(),
            "regressor": self.regressor is not None and self.regressor.is_loaded(),
            "kcelectra": self.kcelectra is not None and self.kcelectra.is_loaded(),
            "svd": self.svd is not None and self.svd.is_loaded(),
            "ready": self.is_ready()
        }

# 싱글톤 인스턴스
model_loader = ModelLoader()