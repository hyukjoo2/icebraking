# 월간회의 케미 매칭

30명 안팎의 월간회의에서 QR로 접속해 각자 생년월일/태어난 시간을 입력하고, 개인 분석과 참가자 간 케미 매칭을 보는 아이스브레이킹 앱입니다.

## 구조

```text
frontend/  Next.js UI
backend/   Express API, 매칭 계산, Redis 세션 저장소
```

## 실행

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

프론트엔드는 기본적으로 `http://localhost:3000`, 백엔드는 `http://localhost:4000`에서 실행합니다.
로컬 환경변수는 필요하면 `frontend/.env.local`, `backend/.env`에 각각 넣으면 됩니다.

## 빌드

```bash
npm run build
```

## 동시 접속 스모크 테스트

로컬 또는 배포 URL에서 API가 동시에 여러 입장을 처리하는지 확인할 수 있습니다.

```bash
BASE_URL=https://your-domain.example SMOKE_USERS=50 npm run smoke:concurrency
```

## 지금 구현된 것

- 참가자 입장 폼
- 개인 회의 캐릭터/에너지/조언 화면
- 케미 좋은 사람, 오늘의 귀인, 오른팔, 조율하면 강한 조합
- 서버 API 기반 매칭 계산
- 클라이언트에는 다른 참가자의 생년월일/태어난 시간을 내려보내지 않음
- Upstash Redis 기반 공유 저장소 지원
- 배포 후 동시 입장 스모크 테스트 스크립트
- `frontend`, `backend` 디렉토리 분리

## 배포 전에 결정할 것

실제 배포/CI-CD로 운영하려면 아래 정보가 필요합니다.

- 배포 플랫폼: Vercel, AWS, GCP, 사내 서버 중 어디인지
- 세션 저장소: 현재 코드는 Upstash Redis 환경변수를 지원
- 세션 삭제 정책: 회의 종료 즉시, 1시간 후, 당일 자정 등
- 관리자 기능: 세션 초기화/참가자 목록 확인을 누가 할 수 있는지
- 실제 만세력 계산 방식: 라이브러리 내장 또는 외부 API

## 동시 접속 운영

프로덕션에서는 아래 환경변수를 설정하세요.

```bash
NEXT_PUBLIC_API_BASE_URL=https://icebraking.onrender.com
FRONTEND_ORIGIN=https://your-domain.example
PORT=4000
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

참가자 정보는 Redis Hash에 참가자 ID별로 저장됩니다. 여러 명이 동시에 입장해도 한 요청이 전체 목록을 통째로 덮어쓰지 않도록 구성했습니다.

프론트엔드와 백엔드를 서로 다른 도메인에 배포하는 경우 `NEXT_PUBLIC_API_BASE_URL`에는 백엔드 URL을, `FRONTEND_ORIGIN`에는 프론트엔드 URL을 넣어 CORS를 맞춰야 합니다.

## Render 배포

`render.yaml`을 추가해두었습니다. Render Dashboard에서 Blueprint로 연결하면 `frontend`, `backend` 두 서비스를 만들 수 있습니다.

기존 Render 서비스를 교체할 때는 새 서비스를 먼저 만든 뒤 아래 값을 연결하고, 동작 확인 후 기존 서비스를 삭제하는 편이 안전합니다.

```text
backend FRONTEND_ORIGIN=https://프론트엔드주소
backend UPSTASH_REDIS_REST_URL=...
backend UPSTASH_REDIS_REST_TOKEN=...
frontend NEXT_PUBLIC_API_BASE_URL=https://icebraking.onrender.com
```

## 운영 메모

로컬에서 Redis 환경변수가 없으면 Next.js 서버 프로세스 메모리에 세션을 저장합니다. 단일 Node 서버에서는 테스트 가능하지만, 서버리스나 여러 인스턴스에서는 참가자 목록이 분산될 수 있습니다. 웹에 올려 실제 회의에서 쓸 때는 Upstash Redis 환경변수를 꼭 설정하세요.
