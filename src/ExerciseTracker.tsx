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
  DialogActions
} from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
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
