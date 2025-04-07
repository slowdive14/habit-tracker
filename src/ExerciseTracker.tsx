import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  Grid,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  Timestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Exercise {
  timestamp: Timestamp;
  pushups: number;
  pullups: number;
  dips: number;
  steps: number;
  running: number;
  avgPace: string;  // mm:ss format
}

interface ExerciseData {
  [date: string]: Exercise;
}

interface ExerciseTrackerProps {
  user: User;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`exercise-tabpanel-${index}`}
      aria-labelledby={`exercise-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// 일관성 점수 인터페이스
interface ConsistencyScore {
  score: number; // 0-100 점수
  grade: string; // 등급 (A+, A, B+, ...)
  label: string; // 등급 설명
  color: string; // 등급 색상
  message: string; // 동기부여 메시지
  streakDays: number; // 연속 일수
  trendChange: number; // 변화 추세 (양수: 개선, 음수: 하락)
}

const ExerciseTracker: React.FC<ExerciseTrackerProps> = ({ user }) => {
  const [tabValue, setTabValue] = useState(1);  // 1: 월간 통계
  const [exerciseData, setExerciseData] = useState<ExerciseData>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [shareDate, setShareDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [formData, setFormData] = useState({
    pushups: '',
    pullups: '',
    dips: '',
    steps: '',
    running: '',
    avgPace: ''
  });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [averageStats, setAverageStats] = useState({
    steps: 0,
    running: 0,
    runningDaysAvg: 0,
    pushups: 0,
    pullups: 0,
    dips: 0,
    avgPace: '',
    daysCountedSteps: 0,
    daysCountedRunning: 0,
    daysCountedExercises: 0,
    runningDaysCount: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [consistencyScores, setConsistencyScores] = useState<{
    pushups: ConsistencyScore;
    pullups: ConsistencyScore;
    dips: ConsistencyScore;
    steps: ConsistencyScore;
    running: ConsistencyScore;
  }>({
    pushups: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '규칙적인 운동 습관을 만들어보세요!', streakDays: 0, trendChange: 0 },
    pullups: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '규칙적인 운동 습관을 만들어보세요!', streakDays: 0, trendChange: 0 },
    dips: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '규칙적인 운동 습관을 만들어보세요!', streakDays: 0, trendChange: 0 },
    steps: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '매일 걷는 습관을 만들어보세요!', streakDays: 0, trendChange: 0 },
    running: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '운동을 시작해보세요!', streakDays: 0, trendChange: 0 }
  });

  // 데이터 로드
  useEffect(() => {
    if (user) {  // user가 있을 때만 데이터 로드
      loadExerciseData();
    }
  }, [user]);

  // 주간/월간 데이터 계산
  useEffect(() => {
    calculateWeeklyData();
    calculateMonthlyData();
    calculateConsistencyScores();
  }, [exerciseData]);

  // 선택된 날짜가 변경될 때 해당 날짜의 데이터 로드
  useEffect(() => {
    const existingData = exerciseData[selectedDate];
    if (existingData) {
      setFormData({
        pushups: String(existingData.pushups || ''),
        pullups: String(existingData.pullups || ''),
        dips: String(existingData.dips || ''),
        steps: String(existingData.steps || ''),
        running: String(existingData.running || ''),
        avgPace: existingData.avgPace || ''
      });
    } else {
      setFormData({
        pushups: '',
        pullups: '',
        dips: '',
        steps: '',
        running: '',
        avgPace: ''
      });
    }
  }, [selectedDate, exerciseData]);

  const loadExerciseData = async () => {
    if (!user) {
      console.log('No user found, skipping data load');
      return;
    }
    
    console.log('Loading exercise data for user:', user.uid);
    try {
      const exercisesRef = collection(db, 'exercises');
      const q = query(
        exercisesRef,
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const newData: ExerciseData = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp.toDate().toISOString().split('T')[0];
        newData[date] = {
          timestamp: data.timestamp,
          pushups: data.pushups || 0,
          pullups: data.pullups || 0,
          dips: data.dips || 0,
          steps: data.steps || 0,
          running: data.running || 0,
          avgPace: data.avgPace || ''
        };
      });
      
      console.log('Loaded exercise data:', newData);
      setExerciseData(newData);
    } catch (error) {
      console.error('Error loading exercise data:', error);
      setError('운동 데이터를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const saveExerciseData = async () => {
    if (!user) return;
    
    try {
      const exerciseRef = doc(db, 'exercises', `${user.uid}_${selectedDate}`);
      const exerciseData = {
        userId: user.uid,
        timestamp: Timestamp.fromDate(new Date(selectedDate)),
        pushups: Number(formData.pushups) || 0,
        pullups: Number(formData.pullups) || 0,
        dips: Number(formData.dips) || 0,
        steps: Number(formData.steps) || 0,
        running: Number(formData.running) || 0,
        avgPace: formData.avgPace
      };

      await setDoc(exerciseRef, exerciseData);
      await loadExerciseData();
      console.log('Exercise data saved and reloaded successfully');
    } catch (error) {
      console.error('Error saving exercise data:', error);
      setError('운동 데이터를 저장하는 중 오류가 발생했습니다.');
    }
  };

  const calculateWeeklyData = () => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const data = last7Days.map(date => ({
      date,
      pushups: exerciseData[date]?.pushups || 0,
      pullups: exerciseData[date]?.pullups || 0,
      dips: exerciseData[date]?.dips || 0,
      steps: exerciseData[date]?.steps || 0,
      running: exerciseData[date]?.running || 0
    }));

    setWeeklyData(data);
  };

  const calculateMonthlyData = () => {
    const today = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const data = last30Days.map(date => ({
      date,
      pushups: exerciseData[date]?.pushups || 0,
      pullups: exerciseData[date]?.pullups || 0,
      dips: exerciseData[date]?.dips || 0,
      steps: exerciseData[date]?.steps || 0,
      running: exerciseData[date]?.running || 0
    }));

    setMonthlyData(data);

    // 평균 계산
    let startDate = new Date('2025-01-01'); // 달리기 시작일
    let firstRecordDate = Object.keys(exerciseData).sort()[0]; // 전체 데이터 시작일

    // 현재까지의 총 일수 계산
    const msPerDay = 24 * 60 * 60 * 1000;
    const todayDate = new Date();
    const daysFromStart = Math.floor((todayDate.getTime() - new Date(firstRecordDate).getTime()) / msPerDay) + 1;
    const daysFromRunningStart = Math.floor((todayDate.getTime() - startDate.getTime()) / msPerDay) + 1;

    // 총합 계산
    const totalStats = Object.entries(exerciseData).reduce(
      (acc, [date, data]) => {
        acc.steps += data.steps || 0;
        acc.pushups += data.pushups || 0;
        acc.pullups += data.pullups || 0;
        acc.dips += data.dips || 0;
        if (date >= '2025-01-01') {
          acc.running += data.running || 0;
          if (data.running && data.avgPace) {
            acc.runningDays++;
            // Convert mm:ss to total seconds
            const [min, sec] = data.avgPace.split(':').map(Number);
            acc.totalPaceSeconds += min * 60 + sec;
          }
        }
        return acc;
      },
      { steps: 0, running: 0, pushups: 0, pullups: 0, dips: 0, runningDays: 0, totalPaceSeconds: 0 }
    );

    // Calculate average pace
    let averagePace = '';
    let runningDaysAverage = 0;
    if (totalStats.runningDays > 0) {
      const avgSeconds = Math.round(totalStats.totalPaceSeconds / totalStats.runningDays);
      const avgMinutes = Math.floor(avgSeconds / 60);
      const avgRemainderSeconds = avgSeconds % 60;
      averagePace = `${avgMinutes.toString().padStart(2, '0')}:${avgRemainderSeconds.toString().padStart(2, '0')}`;
      runningDaysAverage = Math.round((totalStats.running / totalStats.runningDays) * 100) / 100;
    }

    setAverageStats({
      steps: Math.round((totalStats.steps / daysFromStart) * 10) / 10,
      running: Math.round((totalStats.running / daysFromRunningStart) * 100) / 100,
      runningDaysAvg: runningDaysAverage,
      pushups: Math.round((totalStats.pushups / daysFromStart) * 10) / 10,
      pullups: Math.round((totalStats.pullups / daysFromStart) * 10) / 10,
      dips: Math.round((totalStats.dips / daysFromStart) * 10) / 10,
      avgPace: averagePace,
      daysCountedSteps: daysFromStart,
      daysCountedRunning: daysFromRunningStart,
      daysCountedExercises: daysFromStart,
      runningDaysCount: totalStats.runningDays
    });
  };

  const calculateConsistencyScores = () => {
    // 운동별 일관성 점수 계산
    const exerciseTypes = ['pushups', 'pullups', 'dips', 'steps', 'running'] as const;
    const newScores = { ...consistencyScores };

    exerciseTypes.forEach((type) => {
      // 1. 데이터 수집 - 최근 30일
      const today = new Date();
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      // 운동 기록 존재 여부
      const hasRecordDays = last30Days.filter(date => 
        exerciseData[date] && exerciseData[date][type] && exerciseData[date][type] > 0
      );

      // 2. 최근 10일의 기록과 그 이전 20일의 기록 비교 (추세 계산)
      const recent10Days = last30Days.slice(0, 10);
      const previous20Days = last30Days.slice(10, 30);
      
      const recent10HasRecords = recent10Days.filter(date => 
        exerciseData[date] && exerciseData[date][type] && exerciseData[date][type] > 0
      );
      const previous20HasRecords = previous20Days.filter(date => 
        exerciseData[date] && exerciseData[date][type] && exerciseData[date][type] > 0
      );
      
      const recent10Ratio = recent10HasRecords.length / recent10Days.length;
      const previous20Ratio = previous20HasRecords.length / previous20Days.length;
      
      // 3. 꾸준함 점수 계산
      // a. 기록 빈도 (60% 가중치)
      const frequencyScore = (hasRecordDays.length / 30) * 100 * 0.6;
      
      // b. 최근 개선도 (20% 가중치)
      const improvementFactor = recent10Ratio > 0 && previous20Ratio > 0
        ? (recent10Ratio - previous20Ratio) / previous20Ratio
        : 0;
      const trendScore = Math.min(100, Math.max(0, 50 + (improvementFactor * 100))) * 0.2;
      
      // c. 연속 일수 (20% 가중치)
      let maxConsecutiveDays = 0;
      let currentConsecutiveDays = 0;
      let currentStreakDays = 0;
      let isCurrentStreak = true;

      // 연속일 계산
      for (const date of last30Days) {
        if (exerciseData[date] && exerciseData[date][type] && exerciseData[date][type] > 0) {
          if (isCurrentStreak) {
            currentStreakDays++;
          }
          currentConsecutiveDays++;
          maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
        } else {
          isCurrentStreak = false;
          currentConsecutiveDays = 0;
        }
      }

      // 최대 30일까지 고려
      const streakScore = (maxConsecutiveDays / 30) * 100 * 0.2;
      
      // 4. 총 일관성 점수 계산 (0-100)
      const totalScore = Math.min(100, Math.round(frequencyScore + trendScore + streakScore));
      
      // 5. 등급 결정
      const { grade, label, color } = getGradeInfo(totalScore);

      // 6. 동기부여 메시지 생성
      const message = getMotivationalMessage(type, totalScore, currentStreakDays);

      // 일관성 점수 저장
      newScores[type] = {
        score: totalScore,
        grade,
        label,
        color,
        message,
        streakDays: currentStreakDays,
        trendChange: Math.round((recent10Ratio - previous20Ratio) * 100)
      };
    });

    setConsistencyScores(newScores);
  };

  // 점수 등급 정보 반환 함수
  const getGradeInfo = (score: number) => {
    if (score >= 90) return { grade: 'A+', label: '탁월함', color: '#2E7D32' };
    if (score >= 80) return { grade: 'A', label: '우수함', color: '#558B2F' };
    if (score >= 70) return { grade: 'B+', label: '매우 좋음', color: '#689F38' };
    if (score >= 60) return { grade: 'B', label: '좋음', color: '#9E9D24' };
    if (score >= 50) return { grade: 'C+', label: '보통 이상', color: '#F9A825' };
    if (score >= 40) return { grade: 'C', label: '보통', color: '#FF8F00' };
    if (score >= 30) return { grade: 'D+', label: '노력 필요', color: '#EF6C00' };
    if (score >= 20) return { grade: 'D', label: '개선 필요', color: '#D84315' };
    return { grade: 'F', label: '시작하기', color: '#B71C1C' };
  };

  // 동기부여 메시지 생성 함수
  const getMotivationalMessage = (exerciseType: string, score: number, streakDays: number) => {
    const exerciseNames = {
      pushups: '푸시업',
      pullups: '풀업',
      dips: '딥스',
      steps: '걷기',
      running: '달리기'
    };
    const name = exerciseNames[exerciseType as keyof typeof exerciseNames];

    if (score >= 90) return `훌륭합니다! ${name} 습관이 완벽하게 자리잡았어요!`;
    if (score >= 80) return `멋져요! ${name}을(를) 꾸준히 실천하고 계시네요!`;
    if (score >= 70) return `좋은 습관이 형성되고 있어요! 계속 ${name}을(를) 유지하세요.`;
    if (score >= 60) return `${name} 습관이 자리잡고 있어요. 꾸준함이 중요합니다!`;
    if (score >= 50) return `절반의 성공! ${name}을(를) 조금 더 자주 실천해보세요.`;
    if (score >= 40) return `${name}을(를) 꾸준히 하면 큰 변화가 있을 거예요!`;
    if (score >= 30) return `좋은 시작입니다! ${name}을(를) 더 자주 실천해보세요.`;
    if (score >= 20) return `${name}을(를) 더 규칙적으로 실천해보는 건 어떨까요?`;
    if (streakDays > 0) return `${streakDays}일째 ${name} 중이네요! 계속 이어가세요!`;
    return `${name} 습관을 만들어보세요. 작은 시작이 중요합니다!`;
  };

  const handleShare = () => {
    if (!shareDate || !exerciseData) return;

    const dayData = exerciseData[shareDate];

    if (!dayData) {
      setError('No exercise data for selected date');
      return;
    }

    const tweetText = `${shareDate} 운동 기록 📝

Push-up: ${dayData.pushups}회 💪
Pull-up: ${dayData.pullups}회 🏋️
Dips: ${dayData.dips}회 🔥
Steps: ${dayData.steps}보 🚶
Running: ${dayData.running}km (avg pace: ${dayData.avgPace}) 🏃

#내재역량 #저속노화 #감정조절 #인지기능개선`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
    setOpenShareDialog(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper elevation={3} sx={{ 
        p: 3, 
        maxWidth: '800px', 
        margin: '0 auto',
        borderRadius: 2
      }}>
        <Typography variant="h5" gutterBottom>
          운동 기록
        </Typography>
        <form onSubmit={(e) => {
          e.preventDefault();
          saveExerciseData();
        }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="날짜 선택"
                value={selectedDate}
                onChange={handleDateChange}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="푸시업"
                name="pushups"
                type="number"
                value={formData.pushups}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="풀업"
                name="pullups"
                type="number"
                value={formData.pullups}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="딥스"
                name="dips"
                type="number"
                value={formData.dips}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="걸음 수"
                name="steps"
                type="number"
                value={formData.steps}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="달리기 (km)"
                name="running"
                type="number"
                inputProps={{ step: "0.1" }}
                value={formData.running}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Avg. pace (mm:ss)"
                name="avgPace"
                placeholder="05:30"
                value={formData.avgPace}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  let value = e.target.value;
                  
                  // 콜론 제거
                  value = value.replace(/:/g, '');
                  
                  // 숫자만 허용
                  if (!/^[0-9]*$/.test(value)) {
                    return;
                  }

                  // 4자리로 제한
                  value = value.slice(0, 4);

                  // mm:ss 형식으로 변환
                  if (value.length > 2) {
                    const minutes = value.slice(0, 2);
                    const seconds = value.slice(2);
                    value = `${minutes}:${seconds}`;
                  }

                  setFormData(prev => ({
                    ...prev,
                    avgPace: value
                  }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace') {
                    e.preventDefault();
                    const value = formData.avgPace.replace(/:/g, '');
                    setFormData(prev => ({
                      ...prev,
                      avgPace: value.slice(0, -1)
                    }));
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 1 }}
              >
                기록하기
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Paper elevation={3} sx={{ 
        p: 3, 
        mt: 3, 
        maxWidth: '800px', 
        margin: '20px auto',
        borderRadius: 2
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            aria-label="exercise statistics tabs"
          >
            <Tab label="주간 통계" />
            <Tab label="월간 통계" />
          </Tabs>
          <IconButton 
            color="primary" 
            onClick={() => setOpenShareDialog(true)}
            sx={{ mr: 2 }}
          >
            <TwitterIcon />
          </IconButton>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* 운동 차트 (푸시업, 풀업, 딥스) */}
          <Typography variant="h6" gutterBottom>
            운동 기록
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 150]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="pushups"
                stroke="#8884d8"
                name="푸시업"
              />
              <Line
                type="monotone"
                dataKey="pullups"
                stroke="#82ca9d"
                name="풀업"
              />
              <Line
                type="monotone"
                dataKey="dips"
                stroke="#ffc658"
                name="딥스"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* 걸음 수 차트 */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            걸음 수
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="steps"
                stroke="#ff7300"
                name="걸음 수"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* 달리기 차트 */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            달리기 거리
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="running"
                stroke="#e91e63"
                name="달리기 (km)"
              />
            </LineChart>
          </ResponsiveContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* 일관성 점수 섹션 추가 */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              일관성 점수
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              운동의 꾸준함을 측정하는 점수입니다. 규칙적으로 운동할수록 점수가 높아집니다.
            </Typography>
            <Grid container spacing={2}>
              {(['pushups', 'pullups', 'dips', 'steps', 'running'] as const).map((type) => (
                <Grid item xs={12} sm={6} md={4} key={type}>
                  <Card 
                    sx={{ 
                      position: 'relative', 
                      overflow: 'visible',
                      boxShadow: 2,
                      transition: 'transform 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      {/* 운동 유형 이름 */}
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 'bold', 
                          color: consistencyScores[type].color,
                          mb: 2
                        }}
                      >
                        {type === 'pushups' && '푸시업'}
                        {type === 'pullups' && '풀업'}
                        {type === 'dips' && '딥스'}
                        {type === 'steps' && '걷기'}
                        {type === 'running' && '달리기'}
                      </Typography>

                      {/* 점수 원형 프로그레스 */}
                      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                        <CircularProgress
                          variant="determinate"
                          value={consistencyScores[type].score}
                          size={80}
                          thickness={8}
                          sx={{ color: consistencyScores[type].color }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h6" component="div" sx={{ lineHeight: 1 }}>
                            {consistencyScores[type].score}
                          </Typography>
                          <Typography variant="caption" component="div" sx={{ 
                            color: 'text.secondary',
                            fontWeight: 'bold' 
                          }}>
                            {consistencyScores[type].grade}
                          </Typography>
                        </Box>
                      </Box>

                      {/* 등급 라벨 */}
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 'medium',
                          mb: 1.5,
                          color: consistencyScores[type].color
                        }}
                      >
                        {consistencyScores[type].label}
                      </Typography>

                      {/* 추세 및 연속일 */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1.5 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          color: consistencyScores[type].trendChange > 0 ? 'success.main' : 
                                 consistencyScores[type].trendChange < 0 ? 'error.main' : 'text.secondary'
                        }}>
                          {consistencyScores[type].trendChange > 0 ? (
                            <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
                          ) : consistencyScores[type].trendChange < 0 ? (
                            <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />
                          ) : null}
                          <Typography variant="body2">
                            {consistencyScores[type].trendChange > 0 && '+'}
                            {consistencyScores[type].trendChange}%
                          </Typography>
                        </Box>
                        {consistencyScores[type].streakDays > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
                            <LocalFireDepartmentIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2">
                              {consistencyScores[type].streakDays}일
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* 동기부여 메시지 */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          fontStyle: 'italic',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {consistencyScores[type].message}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* 운동 차트 (푸시업, 풀업, 딥스) */}
          <Typography variant="h6" gutterBottom>
            운동 기록
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            일일 평균: 푸시업 {averageStats.pushups}회, 풀업 {averageStats.pullups}회, 딥스 {averageStats.dips}회 (총 {averageStats.daysCountedExercises}일)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 150]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="pushups"
                stroke="#8884d8"
                name="푸시업"
              />
              <Line
                type="monotone"
                dataKey="pullups"
                stroke="#82ca9d"
                name="풀업"
              />
              <Line
                type="monotone"
                dataKey="dips"
                stroke="#ffc658"
                name="딥스"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* 걸음 수 차트 */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            걸음 수
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            일일 평균: {averageStats.steps.toLocaleString()}보 (총 {averageStats.daysCountedSteps}일)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="steps"
                stroke="#ff7300"
                name="걸음 수"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* 달리기 차트 */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            달리기 거리
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            전체 일일 평균: {averageStats.running}km
            {averageStats.runningDaysCount > 0 && `, 달린 날 평균: ${averageStats.runningDaysAvg}km`}
            {averageStats.avgPace && `, 평균 페이스: ${averageStats.avgPace}/km`} 
            (총 {averageStats.daysCountedRunning}일)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="running"
                stroke="#e91e63"
                name="달리기 (km)"
              />
            </LineChart>
          </ResponsiveContainer>
        </TabPanel>
      </Paper>

      <Dialog open={openShareDialog} onClose={() => setOpenShareDialog(false)}>
        <DialogTitle>Share Exercise Record</DialogTitle>
        <DialogContent>
          <TextField
            type="date"
            value={shareDate}
            onChange={(e) => setShareDate(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShareDialog(false)}>Cancel</Button>
          <Button onClick={handleShare} variant="contained">Share</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExerciseTracker;
