---
type: troubleshooting
status: done
description: "월간 목표가 이번 달/지난 달 보기에서 다른 값 표시 + 연간 트렌드 불완전 월 왜곡"
created: 2026-03-01
modified: 2026-03-01
phase: resolved
---

# 문제
> 같은 2월의 월간 목표가 2/28(이번 달)과 3/1(지난 달)에서 다른 값으로 표시됨. 푸시업 1920 vs 1573, 풀업 244 vs 205, 달리기도 불일치. 또한 연간 통계에서 풀업이 "강한 감소 추세 (-71%)"로 왜곡 표시.

---

# 시도
- `prepareMonthlyCardData` 함수의 이번 달/지난 달 분기 로직 분석
- `loadSelectedMonthGoals` 함수의 Firestore 가중 합산 로직 분석
- 연간 `calculateTrend` 선형 회귀 로직에서 불완전 월 포함 여부 확인
- `selectedMonthGoals` 상태의 비동기 로딩 및 `monthOf` 검증 부재 확인

---

# 원인
**월간 목표 불일치**: `prepareMonthlyCardData`에서 이번 달과 지난 달에 완전히 다른 계산 방식 사용
- **이번 달** (offset=0): `현재주_주간목표 × 4` → 한 주의 목표로 월간 추정
- **지난 달** (offset≠0): `loadSelectedMonthGoals()` → Firestore의 모든 주 목표를 날짜 가중치로 합산
- 주별 목표가 변동할 때 (예: 2월 초 50 → 말 61) 두 방식의 결과가 크게 차이남
- 월이 바뀌어도 `현재주_주간목표 × 4`는 같은 주(2/24~3/2)를 참조하므로 2월=3월 목표 발생

**연간 트렌드 왜곡**: `calculateTrend`가 3월 1일의 불완전한 데이터(7회)를 완전한 월(1월 216, 2월 217)과 동등하게 선형 회귀에 포함 → -71% 급감으로 계산

**stale 데이터**: `selectedMonthGoals`에 `monthOf` 검증 없이 이전 월 데이터가 다른 월 렌더링에 사용 가능

---

# 해결

### 커밋 1: `29fed44`
- `prepareMonthlyCardData`에서 모든 월에 `selectedMonthGoals` 가중 합산 방식 통일
- `loadSelectedMonthGoals`에서 현재 월의 미래 주차를 `previousWeeklyGoals`로 프로젝션
- useEffect 의존성에 `previousWeeklyGoals` 추가
- 연간 `calculateTrend` 및 최저 월 계산에서 15일 미만 진행 월 제외

### 커밋 2: `89bd05f`
- `loadSelectedMonthGoals` 시작 시 `monthOf: ''`로 즉시 초기화 (stale 방지)
- `prepareMonthlyCardData`에서 `selectedMonthGoals.monthOf === expectedMonthKey` 검증 추가
- 과거 월에서도 Firestore 미존재 주차에 `previousWeeklyGoals` 프로젝션 허용 (offset 조건 제거)

---

# 관련 파일
- `C:\Users\user\Downloads\habit-tracker\src\ExerciseTracker.tsx`

---

# 재발 방지
- 월간/주간/연간 통계에서 동일 데이터를 다른 시점에 볼 때 **반드시 같은 계산 경로**를 타도록 설계
- 비동기 상태(`selectedMonthGoals` 등)를 사용할 때 **해당 데이터가 현재 뷰와 일치하는지 `monthOf` 같은 키로 검증**
- 진행 중인 불완전 데이터(현재 월, 현재 주)를 완료된 데이터와 비교할 때 **필터링 또는 별도 표시** 적용

---

# 📝 쉬운 설명

### 문제
2월 운동 목표 숫자가, 2월 28일에 보면 하나의 값이고, 3월 1일에 보면 다른 값으로 나왔다. 또한 연간 통계에서 풀업이 "크게 줄어들고 있다"고 잘못 표시됨.

### 원인
"이번 달" 목표와 "지난 달" 목표를 계산하는 공식이 서로 달랐다. 이번 달은 "이번 주 목표 × 4"라는 간단한 곱셈을 쓰고, 지난 달은 각 주의 실제 목표를 하나하나 더하는 정밀 계산을 썼다. 매주 목표가 조금씩 달라지니 두 공식의 결과도 달라졌다. 연간 통계는 3월이 막 시작되어 데이터가 하루치뿐인데, 1~2월의 한 달치 데이터와 동등하게 비교해서 "급감"으로 판단했다.

### 해결
모든 월에 동일한 정밀 계산(각 주별 목표의 가중 합산)을 사용하도록 통일했다. 비동기 로딩 중 엉뚱한 월의 데이터가 표시되지 않도록 월 검증을 추가했다. 연간 트렌드에서는 15일 미만 진행된 월을 비교 대상에서 제외했다.

### 관련 파일
- C:\Users\user\Downloads\habit-tracker\src\ExerciseTracker.tsx
