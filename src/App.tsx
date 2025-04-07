import React, { useEffect, useState } from 'react';
import { Container, Box, Fab, Button, Typography, CircularProgress, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import HabitTracker from './HabitTracker';
import ExerciseTracker from './ExerciseTracker';

// Types
interface HabitBase {
  id: string;
  title: string;
  name: string;
  color: string;
}

interface HabitData {
  [year: string]: {
    [month: string]: Array<HabitBase & { days: number[]; weekNumbers: number[] }>;
  };
}

// 자동 로그인을 위한 기본 사용자 ID (원래 계정 ID 사용)
const AUTO_USER_ID = 'sIOyGOi27KPY9794P20Z8dsq4Ap2';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('habits');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // 네트워크 상태 모니터링
  useEffect(() => {
    const handleOnline = () => {
      console.log("네트워크 연결됨");
      setIsOfflineMode(false);
    };
    
    const handleOffline = () => {
      console.log("네트워크 연결 끊김");
      setIsOfflineMode(true);
      setError("오프라인 모드입니다. 일부 기능이 제한될 수 있습니다.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 초기 네트워크 상태 확인
    setIsOfflineMode(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 자동 로그인 처리
  useEffect(() => {
    // 가상 사용자 객체 생성
    const mockUser = {
      uid: AUTO_USER_ID,
      email: 'auto@example.com',
      displayName: 'Auto User',
      // User 인터페이스에 필요한 다른 속성들
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({
        token: '',
        signInProvider: '',
        claims: {},
        expirationTime: '',
        issuedAtTime: '',
        authTime: ''
      }),
      reload: async () => {},
      toJSON: () => ({})
    } as unknown as User;

    setUser(mockUser);
    
    // 데이터베이스 접근 테스트
    const testDbConnection = async () => {
      try {
        console.log("Firebase 데이터베이스 연결 테스트 중...");
        const userDoc = doc(db, 'users', AUTO_USER_ID);
        const docSnap = await getDoc(userDoc);
        
        if (docSnap.exists()) {
          console.log("Firebase 연결 성공, 데이터 확인:", docSnap.exists());
          // 연결 성공, 아무것도 하지 않음
        } else {
          console.log("사용자 데이터가 없습니다. 초기 데이터를 생성합니다.");
          // 초기 데이터 생성 시도
          try {
            await setDoc(userDoc, { initialized: true, timestamp: new Date().toISOString() }, { merge: true });
          } catch (error) {
            console.error("초기 데이터 생성 실패:", error);
          }
        }
      } catch (error) {
        console.error("Firebase 연결 테스트 실패:", error);
        setError("데이터베이스 연결에 실패했습니다. 오프라인 모드로 전환합니다.");
        setIsOfflineMode(true);
      } finally {
        setLoading(false);
      }
    };
    
    testDbConnection();
  }, []);

  const checkScrollTop = () => {
    if (!showScroll && window.scrollY > 400) {
      setShowScroll(true);
    } else if (showScroll && window.scrollY <= 400) {
      setShowScroll(false);
    }
  };

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.addEventListener('scroll', checkScrollTop);
    return () => window.removeEventListener('scroll', checkScrollTop);
  }, [showScroll]);

  const handleCloseError = () => {
    setError(null);
  };

  const saveHabitData = async (data: HabitData) => {
    try {
      if (isOfflineMode) {
        console.log('오프라인 모드: 로컬 스토리지에 데이터 저장');
        localStorage.setItem('habitData', JSON.stringify(data));
        return;
      }
      
      console.log('Firebase에 데이터 저장 중:', AUTO_USER_ID);
      const userDoc = doc(db, 'users', AUTO_USER_ID);
      await setDoc(userDoc, { habitData: data }, { merge: true });
      console.log('데이터 저장 성공');
      
      // 백업용 로컬 저장
      localStorage.setItem('habitData', JSON.stringify(data));
    } catch (error) {
      console.error('데이터 저장 오류:', error);
      setError('데이터를 저장하는 중 오류가 발생했습니다. 로컬에 임시 저장합니다.');
      
      // 오류 발생 시 로컬 스토리지에 백업
      localStorage.setItem('habitData', JSON.stringify(data));
    }
  };

  const loadHabitData = async (): Promise<HabitData | null> => {
    try {
      if (isOfflineMode) {
        console.log('오프라인 모드: 로컬 스토리지에서 데이터 로드');
        const localData = localStorage.getItem('habitData');
        if (localData) {
          return JSON.parse(localData) as HabitData;
        }
        return null;
      }
      
      console.log('Firebase에서 데이터 로드 중:', AUTO_USER_ID);
      const userDoc = doc(db, 'users', AUTO_USER_ID);
      const docSnap = await getDoc(userDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Firebase에서 데이터 로드 성공:', data);
        
        if (data.habitData) {
          // 로컬에도 저장
          localStorage.setItem('habitData', JSON.stringify(data.habitData));
          return data.habitData as HabitData;
        }
      } else {
        console.log('Firebase에 데이터가 없음, 로컬 스토리지 확인');
      }
      
      // Firebase에 데이터가 없는 경우 로컬 스토리지 확인
      const localData = localStorage.getItem('habitData');
      if (localData) {
        console.log('로컬 스토리지에서 데이터 로드');
        return JSON.parse(localData) as HabitData;
      }
      
      return null;
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다. 로컬 데이터를 시도합니다.');
      
      // 오류 발생 시 로컬 스토리지에서 시도
      try {
        const localData = localStorage.getItem('habitData');
        if (localData) {
          return JSON.parse(localData) as HabitData;
        }
      } catch (localError) {
        console.error('로컬 데이터 로드 오류:', localError);
      }
      
      return null;
    }
  };

  // 로딩 중인 경우 로딩 화면 표시
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      {isOfflineMode && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2, mt: 2 }}
          onClose={() => setError(null)}
        >
          오프라인 모드로 실행 중입니다. 데이터는 로컬에 저장됩니다.
        </Alert>
      )}
    
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2, mt: 2 }}
        >
          <Tab value="habits" label="습관 트래커" />
          <Tab value="exercises" label="운동 기록" />
        </Tabs>
      </Box>

      {activeTab === 'habits' && (
        <HabitTracker 
          user={user}
          saveHabitData={saveHabitData}
          loadHabitData={loadHabitData}
        />
      )}

      {activeTab === 'exercises' && (
        <ExerciseTracker user={user!} />
      )}

      <Fab
        color="primary"
        size="small"
        onClick={scrollTop}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: showScroll ? 'flex' : 'none',
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default App;
