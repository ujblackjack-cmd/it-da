네, 알림 기능 담당자를 박성훈님에서 신의진님으로 변경하여 `README.md`의 Contributors 섹션을 업데이트했습니다.

---

# it-da (잇다) - AI 기반 감정/맥락 인지 취미 매칭 플랫폼

> **"단순한 만남을 넘어, 당신의 맥락과 감정까지 잇습니다."**

**it-da**는 기존 위치 기반 서비스의 한계를 넘어, AI 기술을 활용해 사용자의 성향, 현재 감정 상태, 그리고 맥락을 분석하여 최적의 취미 모임을 추천하고 연결해주는 하이퍼로컬 커뮤니티 플랫폼입니다.

## 📖 프로젝트 개요

1-2차 프로젝트(구구마켓)를 통해 다진 탄탄한 백엔드 기초 위에, **AI 추천 시스템**, **실시간 통신**, **이벤트 기반 아키텍처** 등 심화 기술을 도입하여 기술적 완성도를 높인 최종 프로젝트입니다. 단순한 CRUD를 넘어 대용량 트래픽과 확장성을 고려한 MSA 지향 아키텍처로 설계되었습니다.

### 핵심 가치

* **🤝 연결 (Connect):** AI 하이브리드 매칭을 통한 관심사 기반의 깊이 있는 연결
* **🧠 맥락 (Context):** 사용자의 감정과 리뷰 데이터를 분석하여 상황에 맞는 모임 추천
* **⚡ 실시간 (Live):** WebSocket과 Redis를 활용한 끊김 없는 실시간 소통 경험

---

## ✨ 주요 기능 (Key Features)

| 기능 | 설명 |
| --- | --- |
| **🤖 AI 맞춤 추천** | LightGBM(랭킹) + SVD(협업 필터링) 기반 하이브리드 추천 시스템 제공 |
| **💬 실시간 채팅** | WebSocket(STOMP) 및 Redis Pub/Sub을 이용한 실시간 그룹 채팅 |
| **🌡️ 감정 분석 (매너온도)** | KoELECTRA NLP 모델을 활용한 리뷰/채팅 텍스트 감정 분석 및 신뢰도 지수 산출 |
| **⚡ 이벤트 기반 시스템** | Spring Event를 활용하여 모임 활동에 따른 실시간 배지 지급 (게이미피케이션) |
| **🔔 실시간 알림** | 주요 활동(채팅, 모임 변동, 배지 획득)에 대한 실시간 푸시 알림 제공 |
| **📍 위치 기반 탐색** | 사용자 위치 중심 근거리 모임 탐색 및 카테고리별 필터링 (QueryDSL 활용) |
| **🔐 안전한 인증** | OAuth 2.0 (카카오 등) 소셜 로그인 및 JWT 기반 인증/인가 |

---

## 🛠 시스템 아키텍처 (System Architecture)

Spring Boot를 메인 API 서버로 두고, AI 추론을 담당하는 Python(FastAPI) 서버를 별도로 분리하여 HTTP 통신으로 연동하는 **MSA 지향 아키텍처**를 채택했습니다. 실시간성을 위해 Redis를 적극적으로 활용합니다.

```mermaid
graph TD
    Client(Web/Mobile Client) -->|HTTP/WebSocket| Gateway[Nginx / Load Balancer]
    
    subgraph "Backend Services"
        Gateway -->|API Request| SpringBoot[Spring Boot API Server]
        Gateway -->|WS Connection| SpringBoot
        SpringBoot -->|Event Publish| Redis[(Redis Pub/Sub & Cache)]
        Redis -->|Event Subscribe| SpringBoot
        SpringBoot -->|Data Access| MySQL[(MySQL DB)]
    end
    
    subgraph "AI Services"
        SpringBoot -->|추론 요청 (HTTP)| FastAPI[Python FastAPI AI Server]
        FastAPI -->|Data Load| MySQL
        FastAPI -->|Model Loading| Models[AI Models (LightGBM/KoELECTRA)]
    end

```

---

## 🧰 기술 스택 (Tech Stack)

### Backend

### Frontend

### AI / Data

### Infrastructure & DB

---

## 🔥 기술적 도전 및 해결 (Technical Highlights)

### 1. 하이브리드 AI 추천 시스템 및 파이프라인 구축

* **도전:** 단순한 규칙 기반 추천이 아닌, 사용자 행동 데이터 기반의 개인화된 추천 필요. Java 백엔드와 Python AI 모델 간의 효율적인 연동 문제.
* **해결:**
* **모델링:** LightGBM Ranker를 활용하여 사용자 Feature(활동이력, 선호도)와 모임 Feature를 결합한 랭킹 모델 구축.
* **파이프라인:** Spring Boot에서 데이터 전처리 후 FastAPI로 REST API 요청을 보내고, 추론 결과를 받아 DB 데이터와 병합(Merging)하는 구조 설계.



### 2. 이벤트 기반 아키텍처를 통한 결합도 감소 (Decoupling)

* **도전:** '모임 생성'이라는 핵심 로직에 '배지 지급', '알림 발송' 등의 부가 기능이 강하게 결합되어 트랜잭션이 비대해지고 유지보수가 어려움.
* **해결:**
* Spring `ApplicationEventPublisher`와 `@EventListener` 도입.
* 핵심 로직 완료 후 이벤트를 발행하고, 부가 기능은 리스너가 비동기(`@Async`)로 처리하도록 분리하여 응답 속도 개선 및 확장성 확보.



### 3. Redis Pub/Sub을 활용한 실시간 채팅 동기화

* **도전:** 다중 서버 환경(Scale-out)에서 WebSocket 세션이 분산되어, 서로 다른 서버에 연결된 사용자 간 메시지 전달 불가.
* **해결:**
* Redis Pub/Sub을 메시지 브로커로 도입. 한 서버에 메시지가 도착하면 Redis Topic으로 발행(Publish)하고, 모든 서버가 이를 구독(Subscribe)하여 연결된 클라이언트에게 메시지를 전달하는 구조 구현.



### 4. QueryDSL을 이용한 동적 쿼리 및 성능 최적화

* **도전:** 복잡한 검색 필터(카테고리, 태그, 날짜, 위치) 조합과 N+1 문제로 인한 조회 성능 저하.
* **해결:**
* QueryDSL의 `BooleanBuilder`를 활용하여 유연한 동적 쿼리 구현.
* 연관된 엔티티 조회 시 `fetchJoin()`을 적절히 사용하여 N+1 문제를 해결하고 쿼리 수 최소화.



---

## 🚀 시작하기 (Getting Started)

### Prerequisites

* Java 21+
* Node.js 18+
* Python 3.9+
* MySQL 8.0+
* Redis

### 1. Database Setup (MySQL & Redis)

MySQL에 데이터베이스를 생성하고 Redis 서버를 실행합니다.

```sql
CREATE DATABASE itda_db;

```

### 2. Backend Setup (Spring Boot)

`itda/src/main/resources/application.yml` 파일에서 DB 및 Redis 설정을 본인 환경에 맞게 수정합니다.

```bash
cd itda
./gradlew clean build
java -jar build/libs/itda-0.0.1-SNAPSHOT.jar

```

### 3. AI Server Setup (FastAPI)

Python 가상환경을 생성하고 필요한 라이브러리를 설치한 후 서버를 실행합니다.

```bash
cd data
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

```

### 4. Frontend Setup (React)

의존성 라이브러리를 설치하고 개발 서버를 실행합니다.

```bash
cd src
npm install
npm run dev

```

---

## 📂 프로젝트 구조 (Project Structure)

```
it-da/
├── itda/                  # Backend (Spring Boot)
│   ├── src/main/java/com/itda/
│   │   ├── domain/        # 도메인별 비즈니스 로직 (Meeting, User, Chat, AI 등)
│   │   ├── global/        # 전역 설정 (Config, Security, Error 등)
│   │   └── ItdaApplication.java
│   └── build.gradle
│
├── src/                   # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # 재사용 가능한 UI 컴포넌트
│   │   ├── hooks/         # 커스텀 훅 (useChatWebsocket 등)
│   │   ├── pages/         # 페이지 단위 컴포넌트
│   │   └── store/         # 전역 상태 관리 (Zustand)
│   ├── package.json
│   └── vite.config.ts
│
└── data/                  # AI Server (Python FastAPI)
    ├── models/            # 학습된 모델 파일 및 로직 (LightGBM, KoELECTRA)
    ├── routers/           # API 엔드포인트 정의
    ├── services/          # AI 비즈니스 로직
    ├── main.py            # FastAPI 앱 진입점
    └── requirements.txt

```

---

## 👥 Contributors

본 프로젝트는 담당한 기능에 대해 **백엔드(Spring Boot/Python)부터 프론트엔드(React)까지 전담(End-to-End Ownership)**하여 개발을 진행했습니다.

* **신의진 (Team Lead)**
* **Role:** 프로젝트 총괄 및 인증/채팅/알림 도메인 전담 개발
* **Feature Focus:** OAuth 2.0 소셜 로그인 구현, JWT 인증/인가 처리, WebSocket 및 STOMP 기반 실시간 채팅방 시스템, **실시간 알림(SSE/WebSocket Push) 기능 풀스택 구현.**


* **최동원**
* **Role:** AI Core 및 데이터 파이프라인 전담 개발
* **Feature Focus:** Python FastAPI AI 서버 구축, LightGBM 랭킹 모델 및 KoELECTRA 감정 분석 모델 서빙, 백엔드와 AI 서버 간 데이터 연동 및 추천 결과 UI 구현.


* **김봉완**
* **Role:** 모임(Meeting) 도메인 전담 개발
* **Feature Focus:** 모임 CRUD 풀스택 구현, QueryDSL을 활용한 위치 기반 검색 및 카테고리 필터링 기능, 모임 참여/취소 로직 구현.


* **김보민**
* **Role:** 유저(User) 도메인 및 마이페이지 전담 개발
* **Feature Focus:** 사용자 프로필 관리 기능 풀스택 구현, 관심사 태그 관리, 내가 참여한/생성한 모임 목록 대시보드 구현.


* **김동민**
* **Role:** 리뷰(Review) 및 평가 도메인 전담 개발
* **Feature Focus:** 모임 후기 작성 및 평점 시스템 풀스택 구현, 사용자 간 상호 평가를 통한 '매너 온도' 산정 로직 구현.


* **박성훈**
* **Role:** 게이미피케이션(Badge) 도메인 전담 개발
* **Feature Focus:** Spring Event 기반 비동기 배지 획득 시스템 풀스택 구현.



---

© 2024 it-da Project. All Rights Reserved.
