import React, { useEffect, useState } from 'react';
import { Container, Box, Fab, Button, Typography, CircularProgress, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

// 자동 로그인을 위한 기본 사용자 ID
const AUTO_USER_ID = 'auto-user-123456';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('habits');

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
    setLoading(false);
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
      console.log('Saving data for auto user');
      const userDoc = doc(db, 'users', AUTO_USER_ID);
      await setDoc(userDoc, { habitData: data }, { merge: true });
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
      setError('데이터 저장 중 오류가 발생했습니다.');
    }
  };

  const loadHabitData = async (): Promise<HabitData | null> => {
    try {
      console.log('Loading data for auto user');
      const userDoc = doc(db, 'users', AUTO_USER_ID);
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
