import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAs1xwGfhJgQcQgCGSjXCsqSW1I8mVz1bM",
  authDomain: "habit-tracker-e8b2f.firebaseapp.com",
  projectId: "habit-tracker-e8b2f",
  storageBucket: "habit-tracker-e8b2f.appspot.com",
  messagingSenderId: "991717023098",
  appId: "1:991717023098:web:92b2d1e5c48b34fa0c8da1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 개발 환경에서 에뮬레이터 연결 (필요 시 주석 해제)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('로컬 개발 환경 감지, Firestore 오프라인 지원 활성화');
  
  // 필요한 경우 에뮬레이터 연결
  // connectFirestoreEmulator(db, '127.0.0.1', 8080);
  // connectAuthEmulator(auth, 'http://127.0.0.1:9099');
}

// 오프라인 지원 활성화
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('오프라인 지원이 성공적으로 활성화되었습니다.');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('여러 탭이 열려있어 오프라인 지원을 활성화할 수 없습니다.');
    } else if (err.code === 'unimplemented') {
      console.warn('현재 브라우저는 오프라인 기능을 지원하지 않습니다.');
    } else {
      console.error('오프라인 지원 활성화 중 오류 발생:', err);
    }
  });

// 오프라인 데이터베이스 초기화 시도
const initializeOfflineDb = () => {
  console.log('오프라인 데이터베이스 초기화 시도...');
  
  // 여기에 필요한 초기화 코드 추가
};

// 네트워크 이벤트 모니터링
window.addEventListener('online', () => {
  console.log('온라인 상태로 전환되었습니다.');
});

window.addEventListener('offline', () => {
  console.log('오프라인 상태로 전환되었습니다.');
  initializeOfflineDb();
});

// 디버깅을 위한 전역 객체 노출
window.db = db;
window.auth = auth;

export { app, db, auth };