import React, { useEffect, useState } from 'react';
import { Container, Box, Fab, Button, Typography, CircularProgress, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import HabitTracker from './HabitTracker';
import ExerciseTracker from './ExerciseTracker';

interface HabitData {
  [month: string]: Array<{
    name: string;
    color: string;
    title: string;
    days: number[];
  }>;
}

const ALLOWED_EMAIL = 'spacekatb@gmail.com'; // 여기에 허용할 이메일 주소를 입력하세요
const OLD_USER_ID = 'sIOyGOi27KPY9794P20Z8dsq4Ap2';  // 이전 계정의 USER_ID

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
      // 팝업 옵션 추가
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // 로그인 시도
      const result = await signInWithPopup(auth, provider).catch((error) => {
        console.error('Popup error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
          setError('로그인이 취소되었습니다.');
        } else {
          setError('로그인 중 오류가 발생했습니다: ' + error.message);
        }
        throw error;
      });

      // 이메일 확인
      if (result?.user?.email !== ALLOWED_EMAIL) {
        console.log('Unauthorized email:', result?.user?.email);
        await auth.signOut();
        setError('허용되지 않은 이메일입니다.');
        return;
      }

      console.log('Login successful:', result.user.email);
    } catch (error: any) {
      console.error('Login error:', error);
      if (!error.code?.includes('auth/popup-closed-by-user')) {
        setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  };

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

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

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label="habit tracker tabs"
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
