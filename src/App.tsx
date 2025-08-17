import React, { useEffect, useState } from 'react';
import { Container, Box, Fab, Button, Typography, CircularProgress, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { onAuthStateChanged, User, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
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

const ALLOWED_EMAIL = 'spacekatb@gmail.com'; // 여기에 허용할 이메일 주소를 입력하세요
const OLD_USER_ID = 'sIOyGOi27KPY9794P20Z8dsq4Ap2';  // 이전 계정의 USER_ID

// Obsidian 환경 감지 함수
const isObsidianWebview = () => {
  return navigator.userAgent.toLowerCase().includes('obsidian');
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataMigrated, setDataMigrated] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('habits');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email !== ALLOWED_EMAIL) {
        await auth.signOut();
        setError('허용되지 않은 이메일입니다.');
        setUser(null);
      } else {
        setUser(user);
      }
      setLoading(false);
    });
    return () => unsubscribe();
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

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // 모바일 환경이나 PWA에서는 리다이렉트, 데스크톱에서는 팝업 시도
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      
      if (isMobile || isPWA || isObsidianWebview()) {
        await signInWithRedirect(auth, provider);
      } else {
        // 데스크톱에서는 팝업 시도, 실패시 리다이렉트로 폴백
        try {
          await signInWithPopup(auth, provider);
        } catch (popupError: any) {
          if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
            await signInWithRedirect(auth, provider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error: any) {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 리다이렉트 결과 처리 (모든 환경에서)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          if (result.user.email !== ALLOWED_EMAIL) {
            auth.signOut();
            setError('허용되지 않은 이메일입니다.');
            setUser(null);
          } else {
            setUser(result.user);
          }
        }
      })
      .catch((error) => {
        // 리다이렉트 결과가 없는 경우는 정상적인 상황이므로 에러 처리하지 않음
        if (error.code !== 'auth/no-current-user') {
          console.error('Redirect result error:', error);
          setError('로그인 중 오류가 발생했습니다: ' + error.message);
        }
      });
  }, []);

  const handleCloseError = () => {
    setError(null);
  };

  const saveHabitData = async (data: HabitData) => {
    if (!user) return;
    try {
      console.log('Saving data for user:', user.uid);
      const userDoc = doc(db, 'users', user.uid);
      await setDoc(userDoc, { habitData: data }, { merge: true });
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
      setError('데이터 저장 중 오류가 발생했습니다.');
    }
  };

  const loadHabitData = async (): Promise<HabitData | null> => {
    if (!user) return null;
    try {
      console.log('Loading data for user:', user.uid);
      const userDoc = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Loaded data:', data);
        return data.habitData as HabitData;
      }
      return null;
    } catch (error) {
      console.error('Error loading data:', error);
      setError('데이터 로딩 중 오류가 발생했습니다.');
      return null;
    }
  };

  // 데이터 마이그레이션 함수
  const migrateData = async (newUserId: string) => {
    try {
      console.log('Starting data migration from', OLD_USER_ID, 'to', newUserId);
      
      // 이전 데이터 가져오기
      const oldUserDoc = doc(db, 'users', OLD_USER_ID);
      const oldDocSnap = await getDoc(oldUserDoc);
      
      if (oldDocSnap.exists()) {
        const oldData = oldDocSnap.data();
        console.log('Found old data:', oldData);
        
        // 새 계정으로 데이터 복사
        const newUserDoc = doc(db, 'users', newUserId);
        await setDoc(newUserDoc, oldData, { merge: true });
        console.log('Data migrated successfully');
        setDataMigrated(true);
      } else {
        console.log('No old data found for ID:', OLD_USER_ID);
      }
    } catch (error: any) {
      console.error('Error migrating data:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      if (error.details) {
        console.error('Error details:', error.details);
      }
      setError(`데이터 마이그레이션 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email !== ALLOWED_EMAIL) {
          await auth.signOut();
          setError('허용되지 않은 이메일입니다.');
          setUser(null);
        } else {
          // 로그인 성공 시 데이터 마이그레이션 시도
          if (!dataMigrated) {
            await migrateData(user.uid);
          }
          setUser(user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [dataMigrated]);

  // 로그인하지 않은 경우 로그인 화면 표시
  if (!user) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <Typography variant="h5" gutterBottom>
          HabitFlow
        </Typography>
        <Typography variant="body1" gutterBottom color="textSecondary">
          로그인하여 습관을 기록하고 관리하세요.
        </Typography>
        <Button 
          variant="contained" 
          onClick={signInWithGoogle}
          size="large"
          sx={{ mt: 2 }}
        >
          Google로 로그인
        </Button>
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
      </Box>
    );
  }

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

  console.log(window.location.origin);

  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label="habit tracker tabs"
          variant="fullWidth"
        >
          <Tab 
            value="habits" 
            label="습관 기록" 
            id="habits-tab"
            aria-controls="habits-panel"
          />
          <Tab 
            value="exercise" 
            label="운동 기록" 
            id="exercise-tab"
            aria-controls="exercise-panel"
          />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 'habits'} id="habits-panel">
        {activeTab === 'habits' && (
          <HabitTracker user={user} saveHabitData={saveHabitData} loadHabitData={loadHabitData} />
        )}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 'exercise'} id="exercise-panel">
        {activeTab === 'exercise' && (
          <ExerciseTracker user={user} />
        )}
      </Box>

      <Fab 
        color="primary" 
        size="small"
        onClick={scrollTop}
        style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px',
          display: showScroll ? 'flex' : 'none'
        }}
        aria-label="scroll to top"
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
