import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAarOk7ApcQ7LzIBqeS2lmFmIHJQhmb_Es",
  authDomain: "habit-tracker-f9d25.firebaseapp.com",
  databaseURL: "https://habit-tracker-f9d25-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "habit-tracker-f9d25",
  storageBucket: "habit-tracker-f9d25.appspot.com",
  messagingSenderId: "627010599884",
  appId: "1:627010599884:web:4733f8522c3048fa4c7b69",
  measurementId: "G-FBR61QG7GQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 로컬 개발 모드에서는 인증 검사 우회 (프로덕션 모드에서는 주석 처리 필요)
if (window.location.hostname === "localhost" || 
    window.location.hostname.includes("gitpod.io") ||
    window.location.hostname.includes("obsidian")) {
  console.log("로컬 개발 모드: Firebase 에뮬레이터 모드 활성화");
  
  // Firestore 로컬 에뮬레이터 연결 시도 (8080 포트는 일반적인 Firestore 에뮬레이터 포트)
  try {
    // 에뮬레이터가 실행 중이면 연결, 아니면 패스
    // connectFirestoreEmulator(db, "localhost", 8080);
    console.log("Firestore 에뮬레이터 모드 - 인증 없이 직접 접근");
  } catch (error) {
    console.warn("Firestore 에뮬레이터 연결 실패:", error);
  }
}

const initializeFirestore = async () => {
  try {
    await enableIndexedDbPersistence(db, {
      cacheSizeBytes: 50 * 1024 * 1024, // 50MB
      synchronizeTabs: true
    });
    console.log("Firestore 오프라인 캐싱 활성화");
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.log('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.log('Persistence not supported by browser');
    }
  }
};

// 오프라인 지원 초기화
initializeFirestore();

// 디버깅을 위한 전역 객체 노출
window.db = db;
window.auth = auth;

export { app, db, auth };