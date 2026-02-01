import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Alert, Snackbar } from '@mui/material';
import { onAuthStateChanged, User, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import HabitTracker from './HabitTracker';
import ExerciseTracker from './ExerciseTracker';
import ThemeSelector from './components/ThemeSelector';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';
import './styles/brutalist-theme.css';
import './styles/themes/zen-garden-theme.css';
import './styles/themes/retro-pixel-theme.css';
import './styles/themes/neumorphic-theme.css';
import './styles/theme-transition.css';

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
  const [activeTab, setActiveTab] = useState<string>('exercise');

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
  }, [showScroll, checkScrollTop]);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // 모바일 환경 감지
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;

      console.log('Login attempt:', { isMobile, isPWA, isObsidian: isObsidianWebview(), userAgent: navigator.userAgent });

      // Obsidian은 무조건 리다이렉트
      if (isObsidianWebview()) {
        console.log('Using signInWithRedirect for Obsidian');
        await signInWithRedirect(auth, provider);
        return;
      }

      // 모바일/데스크톱 모두 팝업 먼저 시도, 실패시 리다이렉트
      try {
        console.log('Trying signInWithPopup');
        await signInWithPopup(auth, provider);
        console.log('Popup login successful');
      } catch (popupError: any) {
        console.log('Popup error:', popupError.code, popupError.message);
        if (popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request') {
          console.log('Falling back to signInWithRedirect');
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(`로그인 중 오류가 발생했습니다: ${error.code || error.message}`);
    }
  };

  // 리다이렉트 결과 처리 (모든 환경에서)
  useEffect(() => {
    console.log('Checking redirect result...');
    getRedirectResult(auth)
      .then((result) => {
        console.log('Redirect result:', result);
        if (result?.user) {
          console.log('User from redirect:', result.user.email);
          if (result.user.email !== ALLOWED_EMAIL) {
            console.log('Email not allowed:', result.user.email);
            auth.signOut();
            setError('허용되지 않은 이메일입니다.');
            setUser(null);
          } else {
            console.log('Login successful!');
            setUser(result.user);
          }
        } else {
          console.log('No redirect result');
        }
      })
      .catch((error) => {
        // 리다이렉트 결과가 없는 경우는 정상적인 상황이므로 에러 처리하지 않음
        console.log('Redirect error:', error.code, error.message);
        if (error.code !== 'auth/no-current-user') {
          console.error('Redirect result error:', error);
          setError(`로그인 중 오류가 발생했습니다: ${error.code} - ${error.message}`);
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
      <Box className="app-container brutalist">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          gap={4}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Box className="brutal-card" sx={{ padding: '48px !important', textAlign: 'center', maxWidth: '600px' }}>
            <Typography className="brutal-title" sx={{ fontSize: '6rem !important', marginBottom: '24px !important' }}>
              HABITFLOW
            </Typography>
            <Typography className="brutal-text-mono" sx={{ fontSize: '1rem', marginBottom: '48px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              로그인하여 습관을 기록하고 관리하세요
            </Typography>
            <button
              className="brutal-button brutal-button-primary"
              onClick={signInWithGoogle}
              style={{ width: '100%', padding: '24px', fontSize: '1.25rem' }}
            >
              GOOGLE 로그인
            </button>
          </Box>
        </Box>
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%', borderRadius: '0 !important', border: '4px solid #000' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // 로딩 중인 경우 로딩 화면 표시
  if (loading) {
    return (
      <Box className="app-container brutalist">
        <Box className="brutal-loading">
          <Box className="brutal-spinner" />
          <Typography className="brutal-loading-text">
            LOADING...
          </Typography>
        </Box>
      </Box>
    );
  }

  console.log(window.location.origin);

  return (
    <Box className="app-container brutalist">
      {/* BRUTALIST HEADER */}
      <Box className="brutal-header">
        <Typography className="brutal-title">
          <span>HABIT</span>FLOW
        </Typography>
        <Typography className="brutal-subtitle">
          Track. Measure. Dominate.
        </Typography>
      </Box>

      <Container maxWidth="lg">
        {/* BRUTALIST TABS */}
        <Box className="brutal-tabs">
          {/* HABITS 탭 비활성화 - 코드 유지, 화면에서 숨김
          <button
            className={`brutal-tab ${activeTab === 'habits' ? 'active' : ''}`}
            onClick={() => setActiveTab('habits')}
          >
            🎯 HABITS
          </button>
          */}
          <button
            className={`brutal-tab ${activeTab === 'exercise' ? 'active' : ''}`}
            onClick={() => setActiveTab('exercise')}
          >
            💪 EXERCISE
          </button>
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

        {/* BRUTALIST SCROLL TO TOP BUTTON */}
        {showScroll && (
          <button
            className="brutal-button brutal-button-primary"
            onClick={scrollTop}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              padding: '12px 24px',
              zIndex: 1000,
            }}
            aria-label="scroll to top"
          >
            ▲ TOP
          </button>
        )}

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%', borderRadius: '0 !important', border: '4px solid #000' }}>
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

// Wrap App with ThemeProvider
const AppWithTheme: React.FC = () => {
  return (
    <ThemeProvider>
      <App />
      <ThemeSelector />
    </ThemeProvider>
  );
};

export default AppWithTheme;
