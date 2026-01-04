# Feature Plan: 원서 읽기 숨김 및 메모 습관 추가

> **Status**: ✅ Completed
> **Created**: 2025-12-30
> **Last Updated**: 2025-12-30
> **Deployed**: https://profound-seahorse-60f4ac.netlify.app

---

## 📋 Overview

### 목표
1. "원서 읽기" 습관을 "아내 마사지", "아이들과 영어"처럼 숨김 처리
2. 새로운 "메모" 습관 섹션 추가 (점수: 1개=1점, 2개=2점, 3개 이상=3점)

### 영향 범위
- `src/HabitTracker.tsx`: 습관 분류 및 UI 수정

---

## 🏗️ Architecture Decisions

| 결정 사항 | 선택 | 이유 |
|----------|------|------|
| 원서 읽기 이동 | `PRIMARY_HABITS` → `SECONDARY_HABITS` | 기존 토글 시스템 재활용 |
| 메모 습관 추가 | `HABITS` 배열에 새 항목 추가 | 기존 데이터 구조와 호환 |
| 메모 점수 표시 | 기존 0-3 점수 시스템 활용 | 일관성 유지 |

---

## 📦 Phase Breakdown

### Phase 1: 원서 읽기 습관 숨김 처리 ✅
**Goal**: 원서 읽기를 SECONDARY_HABITS로 이동하여 "모든 습관 보기" 버튼으로 토글

#### Tasks
- [x] `PRIMARY_HABITS` 배열에서 `'english-reading'` 제거
- [x] `SECONDARY_HABITS` 배열에 `'english-reading'` 추가
- [x] 주요 습관 현황/월간 기록/트렌드 섹션에서 원서 읽기 조건부 표시 처리

#### Quality Gate
- [x] 앱 빌드 성공
- [x] 기본 화면에서 원서 읽기 숨김 확인
- [x] "모든 습관 보기" 클릭 시 원서 읽기 표시 확인
- [x] 기존 원서 읽기 데이터 유지 확인

---

### Phase 2: 메모 습관 추가 ✅
**Goal**: 새로운 "메모" 습관을 PRIMARY_HABITS에 추가

#### Tasks
- [x] `HABITS` 배열에 메모 습관 추가 (id: 'memo', title: '메모', color: '#4A90D9')
- [x] `PRIMARY_HABITS` 배열에 `'memo'` 추가
- [x] `getHabitScoreInfo` 함수에 메모 점수 기준 추가:
  - 0점: 메모 안함
  - 1점: 메모 1개
  - 2점: 메모 2개
  - 3점: 메모 3개 이상

#### Quality Gate
- [x] 앱 빌드 성공
- [x] 메모 습관 카드 표시 확인
- [x] 점수 버튼 (0-3) 동작 확인
- [x] 점수 기준 안내 텍스트 표시 확인

---

### Phase 3: 통합 및 검증 ✅
**Goal**: 전체 기능 동작 확인 및 데이터 호환성 검증

#### Tasks
- [x] 주요 습관 현황 섹션에 메모 습관 추가
- [x] 월간 습관 기록 히트맵에 메모 포함
- [x] 최근 8주 트렌드에 메모 포함
- [x] 기존 데이터와 새 구조 호환성 확인

#### Quality Gate
- [x] 모든 섹션에서 메모 습관 정상 표시
- [x] 원서 읽기 숨김 상태 유지
- [x] 점수 저장/로드 정상 동작
- [x] Netlify 배포 완료

---

## 🎨 Implementation Details

### 수정 대상 코드

```typescript
// Before
const PRIMARY_HABITS = ['exercise', 'english-reading', 'reading'];
const SECONDARY_HABITS = ['english-kids', 'massage'];

// After
const PRIMARY_HABITS = ['exercise', 'reading', 'memo'];
const SECONDARY_HABITS = ['english-reading', 'english-kids', 'massage'];
```

### 메모 습관 정의

```typescript
{ id: 'memo', name: 'Memo', color: '#4A90D9', title: '메모' }
```

### 메모 점수 기준

```typescript
if (id === 'memo') {
  return [
    { score: 0, title: '메모 안함', desc: '오늘 메모하지 않음' },
    { score: 1, title: '메모 1개', desc: '메모 1개 작성' },
    { score: 2, title: '메모 2개', desc: '메모 2개 작성' },
    { score: 3, title: '메모 3개+', desc: '메모 3개 이상 작성' }
  ];
}
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 기존 데이터 손실 | Low | High | HABITS 배열 순서 유지, 기존 인덱스 보존 |
| 히트맵 표시 오류 | Low | Medium | 신규 습관을 배열 끝에 추가 |

---

## 🔄 Rollback Strategy

Phase 1-2: `git checkout` 으로 HabitTracker.tsx 원복
Phase 3: 데이터는 Firebase에 저장되어 있으므로 코드만 롤백하면 복구 가능

---

## 📝 Notes & Learnings

- PWA 서비스 워커 캐시로 인해 업데이트가 즉시 반영되지 않는 문제 발견
- `homepage` 설정을 `.`으로 변경하여 Netlify 루트 배포 호환성 확보
- 서비스 워커에 `skipWaiting` 및 `onUpdate` 콜백 추가하여 자동 업데이트 구현
- workbox 라이브러리 추가 설치 필요

