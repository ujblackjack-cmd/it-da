"""
전체 파이프라인 실행: 리뷰 추출 → 감성 분석 → 학습 데이터 생성 → 모델 재학습

사용법:
    python run_pipeline.py
"""

import subprocess
import sys
import os
from datetime import datetime


def run_script(script_path: str, description: str):
    """스크립트 실행"""
    print("\n" + "=" * 70)
    print(f"▶️  {description}")
    print("=" * 70)

    # 경로 존재 확인
    if not os.path.exists(script_path):
        print(f"❌ 파일을 찾을 수 없습니다: {script_path}")
        print(f"   현재 경로: {os.getcwd()}")
        return False

    try:
        # Windows 인코딩 문제 해결을 위한 환경 변수 설정
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'

        result = subprocess.run(
            [sys.executable, script_path],
            check=True,
            text=True,
            capture_output=True,
            encoding='utf-8',
            errors='replace',
            env=env  # UTF-8 환경 변수 전달
        )
        print(result.stdout)
        print(f"✅ {description} 완료")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} 실패")
        print(f"   에러 코드: {e.returncode}")
        if e.stdout:
            print(f"   출력:\n{e.stdout}")
        if e.stderr:
            print(f"   에러:\n{e.stderr}")
        return False
    except Exception as e:
        print(f"❌ {description} 실행 중 오류: {e}")
        return False


def check_prerequisites():
    """사전 요구사항 확인"""
    print("\n🔍 사전 요구사항 확인 중...")

    issues = []
    warnings = []

    # 1. scripts 디렉토리 확인
    if not os.path.exists("scripts"):
        issues.append("❌ scripts/ 디렉토리가 없습니다")
    else:
        required_scripts = [
            "1_extract_reviews.py",
            "2_analyze_sentiment.py",
            "3_build_training_data.py",
            "4_train_regressor.py"
        ]
        for script in required_scripts:
            path = f"scripts/{script}"
            if not os.path.exists(path):
                issues.append(f"❌ {path} 파일이 없습니다")
            else:
                print(f"   ✅ {path}")

    # 2. data 디렉토리 생성
    os.makedirs("data", exist_ok=True)
    print(f"   ✅ data/ 디렉토리")

    # 3. models 디렉토리 확인
    os.makedirs("models", exist_ok=True)

    # 4. KcELECTRA 모델 확인
    if not os.path.exists("models/kcelectra_sentiment_with_typo"):
        warnings.append("⚠️ KcELECTRA 모델이 없습니다 (models/kcelectra_sentiment_with_typo/)")
        warnings.append("   → Step 2 실행 전에 Fine-tuning 필요: python ai_models/finetune_kcelectra_with_typo.py")
    else:
        print(f"   ✅ KcELECTRA 모델")

    # 5. 필수 Python 패키지 확인
    try:
        import pymysql
        print(f"   ✅ pymysql")
    except ImportError:
        issues.append("❌ pymysql 미설치: pip install pymysql")

    try:
        import pandas
        print(f"   ✅ pandas")
    except ImportError:
        issues.append("❌ pandas 미설치: pip install pandas")

    try:
        import torch
        print(f"   ✅ torch")
    except ImportError:
        warnings.append("⚠️ torch 미설치: Step 2 실행 불가")

    try:
        import transformers
        print(f"   ✅ transformers")
    except ImportError:
        warnings.append("⚠️ transformers 미설치: Step 2 실행 불가")

    try:
        import lightgbm
        print(f"   ✅ lightgbm")
    except ImportError:
        warnings.append("⚠️ lightgbm 미설치: Step 4 실행 불가")

    # 결과 출력
    if issues:
        print("\n❌ 다음 문제를 해결해주세요:")
        for issue in issues:
            print(f"  {issue}")
        return False

    if warnings:
        print("\n⚠️ 경고:")
        for warning in warnings:
            print(f"  {warning}")
        print("\n계속 진행하시겠습니까? (y/n): ", end='')
        answer = input().strip().lower()
        if answer != 'y':
            return False

    print("\n✅ 사전 요구사항 확인 완료")
    return True


def main():
    """전체 파이프라인 실행"""

    start_time = datetime.now()

    print("=" * 70)
    print("🚀 KcELECTRA → LightGBM 학습 파이프라인")
    print("=" * 70)
    print(f"시작 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"작업 디렉토리: {os.getcwd()}")

    # 사전 요구사항 확인
    if not check_prerequisites():
        print("\n❌ 파이프라인을 실행할 수 없습니다")
        print("\n💡 해결 방법:")
        print("  1. 다운로드한 파일들이 올바른 위치에 있는지 확인")
        print("  2. 필수 패키지 설치: pip install pymysql pandas torch transformers lightgbm")
        print("  3. 디렉토리 구조:")
        print("     it-da-ai-server/")
        print("     ├── run_pipeline.py        ← 이 파일")
        print("     ├── scripts/")
        print("     │   ├── 1_extract_reviews.py")
        print("     │   ├── 2_analyze_sentiment.py")
        print("     │   ├── 3_build_training_data.py")
        print("     │   └── 4_train_regressor.py")
        print("     ├── models/")
        print("     ├── data/")
        print("     └── app/")
        return

    # 실행할 스크립트 목록
    scripts = [
        ("scripts/1_extract_reviews.py", "Step 1: 리뷰 데이터 추출"),
        ("scripts/2_analyze_sentiment.py", "Step 2: KcELECTRA 감성 분석"),
        ("scripts/3_build_training_data.py", "Step 3: 학습 데이터 생성"),
        ("scripts/4_train_regressor.py", "Step 4: LightGBM 재학습"),
    ]

    success_count = 0
    failed_step = None

    for script_path, description in scripts:
        if run_script(script_path, description):
            success_count += 1
        else:
            failed_step = description
            print(f"\n⚠️ {description} 실패로 인해 파이프라인 중단")
            break

    end_time = datetime.now()
    duration = end_time - start_time

    print("\n" + "=" * 70)
    print("📊 파이프라인 완료")
    print("=" * 70)
    print(f"성공: {success_count}/{len(scripts)} 단계")
    print(f"소요 시간: {duration}")
    print(f"종료 시간: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")

    if success_count == len(scripts):
        print("\n🎉 모든 단계 성공!")
        print("\n생성된 파일:")
        print("  ✅ data/reviews_raw.csv - 원본 리뷰 데이터")
        print("  ✅ data/reviews_sentiment.csv - 감성 분석 결과")
        print("  ✅ data/training_data.csv - LightGBM 학습 데이터")
        print("  ✅ data/meeting_sentiment.csv - 모임별 감성 집계")
        print("  ✅ models/lightgbm_regressor.pkl - 재학습된 모델")
        print("\n다음 단계:")
        print("  1. MySQL에 meeting_sentiment 테이블 생성:")
        print("     mysql -u root -p itda < meeting_sentiment_schema.sql")
        print("  2. 감성 데이터 임포트:")
        print("     (meeting_sentiment.csv → meeting_sentiment 테이블)")
        print("  3. FastAPI 서버 재시작: python -m app.main")
        print("  4. Spring Boot 재시작")
        print("  5. API 테스트: POST /api/ai/recommendations/satisfaction")
    else:
        print(f"\n⚠️ 실패한 단계: {failed_step}")
        print("\n트러블슈팅:")
        if "Step 1" in (failed_step or ""):
            print("  • MySQL 연결 확인")
            print("  • scripts/1_extract_reviews.py의 DB_CONFIG 설정 확인")
        elif "Step 2" in (failed_step or ""):
            print("  • KcELECTRA 모델 존재 확인")
            print("  • GPU/CPU 메모리 확인")
            print("  • BATCH_SIZE 조정 (32 → 16)")
        elif "Step 3" in (failed_step or ""):
            print("  • data/reviews_sentiment.csv 파일 확인")
        elif "Step 4" in (failed_step or ""):
            print("  • data/training_data.csv 파일 확인")
            print("  • FeatureBuilder 경로 확인")


if __name__ == "__main__":
    main()