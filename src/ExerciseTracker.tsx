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
  CardContent,
  Tooltip as MuiTooltip,
  Chip,
  Divider
} from '@mui/material';
import { useTheme } from './contexts/ThemeContext';
import TwitterIcon from '@mui/icons-material/Twitter';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RecommendIcon from '@mui/icons-material/Recommend';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
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
import ExerciseCard from './components/ExerciseCard';
import MonthlyExerciseCard from './components/MonthlyExerciseCard';
import './styles/ExerciseTracker.css';

interface Exercise {
  timestamp: Timestamp;
  pushups: number;
  pullups: number;
  dips: number;
  lateralRaise: number;  // 사이드 래터럴 레이즈
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

// 운동 종류별 특성 정보 추가
const exerciseCharacteristics = {
  pushups: { 
    optimalFrequency: 3, // 주당 최적 빈도
    recoveryNeeded: true, // 회복 필요성
    intensityType: "근력", // 운동 유형
    recommendedRest: 1, // 권장 휴식일 (연속 운동일 사이)
    progression: "reps", // 진행 유형 (횟수 증가)
    maxRecommended: 40 // 일반적인 최대 권장량
  },
  pullups: { 
    optimalFrequency: 3, 
    recoveryNeeded: true,
    intensityType: "근력",
    recommendedRest: 1,
    progression: "reps",
    maxRecommended: 15
  },
  dips: {
    optimalFrequency: 3,
    recoveryNeeded: true,
    intensityType: "근력",
    recommendedRest: 1,
    progression: "reps",
    maxRecommended: 25
  },
  lateralRaise: {
    optimalFrequency: 3,
    recoveryNeeded: true,
    intensityType: "근력",
    recommendedRest: 1,
    progression: "reps",
    maxRecommended: 20
  },
  running: {
    optimalFrequency: 3,
    recoveryNeeded: true,
    intensityType: "유산소 중강도",
    recommendedRest: 1,
    progression: "distance_time", // 진행 유형 (거리/시간)
    maxRecommended: 5
  }
};

// 한국 시간 기준 날짜 문자열 생성 유틸리티 함수
const getKoreanDateString = (date: Date): string => {
  const koreanTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return koreanTime.toISOString().split('T')[0];
};

const ExerciseTracker: React.FC<ExerciseTrackerProps> = ({ user }) => {
  const { theme } = useTheme();
  const [tabValue, setTabValue] = useState(0);  // 0: 주간 통계
  const [exerciseData, setExerciseData] = useState<ExerciseData>({});
  const [selectedDate, setSelectedDate] = useState<string>(getKoreanDateString(new Date()));
  const [shareDate, setShareDate] = useState<string>(getKoreanDateString(new Date()));
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [openGuideDialog, setOpenGuideDialog] = useState(false);
  const [selectedExerciseType, setSelectedExerciseType] = useState<string>('');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0: 현재 주, -1: 지난 주, -2: 2주 전...
  const [guideContent, setGuideContent] = useState<{
    title: string;
    description: string;
    recommendations: string[];
    goalDays: number;
    targetPerDay: number;
    currentTrend: number;
    desiredTrend: number;
  }>({
    title: '',
    description: '',
    recommendations: [],
    goalDays: 0,
    targetPerDay: 0,
    currentTrend: 0,
    desiredTrend: 0
  });
  const [formData, setFormData] = useState({
    pushups: '',
    pullups: '',
    dips: '',
    lateralRaise: '',
    running: '',
    avgPace: ''
  });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [averageStats, setAverageStats] = useState({
    running: 0,
    runningDaysAvg: 0,
    pushups: 0,
    pullups: 0,
    dips: 0,
    lateralRaise: 0,
    avgPace: '',
    daysCountedRunning: 0,
    daysCountedExercises: 0,
    runningDaysCount: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [consistencyScores, setConsistencyScores] = useState<{
    pushups: ConsistencyScore;
    pullups: ConsistencyScore;
    dips: ConsistencyScore;
    running: ConsistencyScore;
  }>({
    pushups: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '규칙적인 운동 습관을 만들어보세요!', streakDays: 0, trendChange: 0 },
    pullups: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '규칙적인 운동 습관을 만들어보세요!', streakDays: 0, trendChange: 0 },
    dips: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '규칙적인 운동 습관을 만들어보세요!', streakDays: 0, trendChange: 0 },
    running: { score: 0, grade: 'F', label: '시작하기', color: '#B71C1C', message: '운동을 시작해보세요!', streakDays: 0, trendChange: 0 }
  });

  // 이전 주간 목표 저장 (Firebase에서 로드)
  const [previousWeeklyGoals, setPreviousWeeklyGoals] = useState<{
    pushups: number;
    pullups: number;
    dips: number;
    lateralRaise: number;
    running: number;
    weekOf: string; // 목표가 설정된 주의 월요일 날짜
  }>({
    pushups: 0,
    pullups: 0,
    dips: 0,
    lateralRaise: 0,
    running: 0,
    weekOf: ''
  });

  // 선택된 주차의 목표 저장 (보고 있는 주차의 실제 목표)
  const [selectedWeekGoals, setSelectedWeekGoals] = useState<{
    pushups: number;
    pullups: number;
    dips: number;
    lateralRaise: number;
    running: number;
    weekOf: string;
  }>({
    pushups: 0,
    pullups: 0,
    dips: 0,
    lateralRaise: 0,
    running: 0,
    weekOf: ''
  });

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
        const date = getKoreanDateString(data.timestamp.toDate());
        newData[date] = {
          timestamp: data.timestamp,
          pushups: data.pushups || 0,
          pullups: data.pullups || 0,
          dips: data.dips || 0,
          lateralRaise: data.lateralRaise || 0,
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

  // 이전 주간 목표 로드 (Firebase) - 실제로는 현재 주의 기존 목표를 로드
  const loadPreviousWeeklyGoals = async () => {
    if (!user) return;

    try {
      // 현재 주 월요일 날짜 계산 (이번 주 목표가 이미 있는지 확인용)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisWeekMonday = new Date(today);
      thisWeekMonday.setDate(today.getDate() - daysFromMonday);
      const thisWeekMondayStr = getKoreanDateString(thisWeekMonday);

      const goalsRef = doc(db, 'weeklyGoals', `${user.uid}_${thisWeekMondayStr}`);
      const goalsDoc = await getDoc(goalsRef);

      if (goalsDoc.exists()) {
        const data = goalsDoc.data();
        // 새로운 데이터 구조 (goals 객체) 또는 기존 데이터 구조 지원
        const goals = data.goals || {
          pushups: data.pushups || 0,
          pullups: data.pullups || 0,
          dips: data.dips || 0,
          lateralRaise: data.lateralRaise || 0,
          running: data.running || 0
        };

        setPreviousWeeklyGoals({
          pushups: goals.pushups,
          pullups: goals.pullups,
          dips: goals.dips,
          lateralRaise: goals.lateralRaise,
          running: goals.running,
          weekOf: thisWeekMondayStr
        });
        console.log('현재 주 기존 목표 로드 성공:', { goals, achievements: data.achievements, rates: data.achievementRates });
      } else {
        console.log('현재 주 목표 없음 (새로운 주 시작 - 지난 주 목표 기반으로 계산 예정)');
        // 새로운 주가 시작되었으면 지난 주 목표를 불러와서 참고
        const lastWeekMonday = new Date(today);
        lastWeekMonday.setDate(today.getDate() - daysFromMonday - 7);
        const lastWeekMondayStr = getKoreanDateString(lastWeekMonday);

        const lastWeekGoalsRef = doc(db, 'weeklyGoals', `${user.uid}_${lastWeekMondayStr}`);
        const lastWeekGoalsDoc = await getDoc(lastWeekGoalsRef);

        if (lastWeekGoalsDoc.exists()) {
          const lastWeekData = lastWeekGoalsDoc.data();
          const lastWeekGoals = lastWeekData.goals || {
            pushups: lastWeekData.pushups || 0,
            pullups: lastWeekData.pullups || 0,
            dips: lastWeekData.dips || 0,
            lateralRaise: lastWeekData.lateralRaise || 0,
            running: lastWeekData.running || 0
          };

          setPreviousWeeklyGoals({
            pushups: lastWeekGoals.pushups,
            pullups: lastWeekGoals.pullups,
            dips: lastWeekGoals.dips,
            lateralRaise: lastWeekGoals.lateralRaise,
            running: lastWeekGoals.running,
            weekOf: lastWeekMondayStr
          });
          console.log('지난 주 목표를 기반으로 새 목표 계산 예정:', lastWeekGoals);
        }
      }
    } catch (error) {
      console.error('이전 주간 목표 로드 오류:', error);
    }
  };

  // 현재 주간 목표 저장 (Firebase) - 목표량과 달성량 모두 저장
  const saveCurrentWeeklyGoals = async (goals: {
    pushups: number;
    pullups: number;
    dips: number;
    lateralRaise: number;
    running: number;
  }, weekMondayDate?: Date) => {
    if (!user) return;

    try {
      // 주 월요일 날짜 계산 (파라미터로 받지 않으면 이번 주)
      const targetDate = weekMondayDate || new Date();
      const dayOfWeek = targetDate.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekMonday = new Date(targetDate);
      weekMonday.setDate(targetDate.getDate() - daysFromMonday);
      const weekMondayStr = getKoreanDateString(weekMonday);

      // 해당 주의 7일간 날짜 생성
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekMonday);
        date.setDate(weekMonday.getDate() + i);
        return getKoreanDateString(date);
      });

      // 각 운동별 실제 달성량 계산
      const achievements = {
        pushups: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.pushups || 0), 0),
        pullups: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.pullups || 0), 0),
        dips: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.dips || 0), 0),
        lateralRaise: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.lateralRaise || 0), 0),
        running: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.running || 0), 0)
      };

      const goalsRef = doc(db, 'weeklyGoals', `${user.uid}_${weekMondayStr}`);
      await setDoc(goalsRef, {
        userId: user.uid,
        weekOf: weekMondayStr,
        // 목표량
        goals: {
          pushups: goals.pushups,
          pullups: goals.pullups,
          dips: goals.dips,
          lateralRaise: goals.lateralRaise,
          running: goals.running
        },
        // 실제 달성량
        achievements: {
          pushups: achievements.pushups,
          pullups: achievements.pullups,
          dips: achievements.dips,
          lateralRaise: achievements.lateralRaise,
          running: achievements.running
        },
        // 달성률
        achievementRates: {
          pushups: goals.pushups > 0 ? Math.round((achievements.pushups / goals.pushups) * 100) : 0,
          pullups: goals.pullups > 0 ? Math.round((achievements.pullups / goals.pullups) * 100) : 0,
          dips: goals.dips > 0 ? Math.round((achievements.dips / goals.dips) * 100) : 0,
          lateralRaise: goals.lateralRaise > 0 ? Math.round((achievements.lateralRaise / goals.lateralRaise) * 100) : 0,
          running: goals.running > 0 ? Math.round((achievements.running / goals.running) * 100) : 0
        },
        updatedAt: Timestamp.now()
      }, { merge: true }); // merge: true로 기존 데이터 유지하면서 업데이트

      console.log('주간 목표 및 달성량 저장 성공:', { goals, achievements, weekOf: weekMondayStr });
    } catch (error) {
      console.error('주간 목표 저장 오류:', error);
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

  // 선택된 주차의 목표 로드
  const loadSelectedWeekGoals = async () => {
    if (!user) return;

    try {
      const selectedMonday = getSelectedWeekMonday();
      const selectedMondayStr = getKoreanDateString(selectedMonday);

      const goalsRef = doc(db, 'weeklyGoals', `${user.uid}_${selectedMondayStr}`);
      const goalsDoc = await getDoc(goalsRef);

      if (goalsDoc.exists()) {
        const data = goalsDoc.data();
        // 새로운 데이터 구조 (goals 객체) 또는 기존 데이터 구조 지원
        const goals = data.goals || {
          pushups: data.pushups || 0,
          pullups: data.pullups || 0,
          dips: data.dips || 0,
          lateralRaise: data.lateralRaise || 0,
          running: data.running || 0
        };

        setSelectedWeekGoals({
          pushups: goals.pushups,
          pullups: goals.pullups,
          dips: goals.dips,
          lateralRaise: goals.lateralRaise,
          running: goals.running,
          weekOf: selectedMondayStr
        });
        console.log(`선택된 주차 (${selectedMondayStr}) 목표 로드 성공:`, { goals, achievements: data.achievements, rates: data.achievementRates });
      } else {
        // 목표가 없으면 계산된 목표 사용 (과거 주차의 경우)
        console.log(`선택된 주차 (${selectedMondayStr}) 목표 없음 - 기본값 사용`);
        setSelectedWeekGoals({
          pushups: 0,
          pullups: 0,
          dips: 0,
          lateralRaise: 0,
          running: 0,
          weekOf: selectedMondayStr
        });
      }
    } catch (error) {
      console.error('선택된 주차 목표 로드 오류:', error);
    }
  };

  // 주차 네비게이션 함수들
  const goToPreviousWeek = () => {
    setSelectedWeekOffset(prev => prev - 1);
  };

  const goToNextWeek = () => {
    setSelectedWeekOffset(prev => prev + 1);
  };

  const goToCurrentWeek = () => {
    setSelectedWeekOffset(0);
  };

  // 선택된 주의 월요일 날짜 계산
  const getSelectedWeekMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() - daysFromMonday);

    // offset 적용
    const selectedWeekMonday = new Date(currentWeekMonday);
    selectedWeekMonday.setDate(currentWeekMonday.getDate() + (selectedWeekOffset * 7));

    return selectedWeekMonday;
  };

  // 선택된 주의 날짜 범위 텍스트 생성
  const getSelectedWeekRangeText = () => {
    const monday = getSelectedWeekMonday();
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (date: Date) => {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    };

    if (selectedWeekOffset === 0) {
      return `이번 주 (${formatDate(monday)} - ${formatDate(sunday)})`;
    } else if (selectedWeekOffset === -1) {
      return `지난 주 (${formatDate(monday)} - ${formatDate(sunday)})`;
    } else if (selectedWeekOffset < -1) {
      return `${Math.abs(selectedWeekOffset)}주 전 (${formatDate(monday)} - ${formatDate(sunday)})`;
    } else {
      return `${selectedWeekOffset}주 후 (${formatDate(monday)} - ${formatDate(sunday)})`;
    }
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
        lateralRaise: Number(formData.lateralRaise) || 0,
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

  // 데이터 로드 useEffect
  useEffect(() => {
    if (user) {
      loadExerciseData();
      loadPreviousWeeklyGoals();
    }
  }, [user]);

  // 주간/월간 데이터 계산 및 목표 저장 useEffect
  useEffect(() => {
    calculateWeeklyData();
    calculateMonthlyData();
    calculateConsistencyScores();

    // 운동 데이터가 있거나, 이전 목표가 로드되었으면 이번 주 목표 생성
    if (user && (Object.keys(exerciseData).length > 0 || previousWeeklyGoals.weekOf)) {
      saveWeeklyGoalsIfNeeded();  // 현재 주차의 목표 및 달성량 저장
      updateHistoricalAchievements();  // 과거 주차는 달성량만 업데이트 (목표는 변경 안함)
    }
  }, [exerciseData, previousWeeklyGoals, user]);

  // 선택된 주차 변경 시 해당 주차 목표 로드
  useEffect(() => {
    if (user) {
      loadSelectedWeekGoals();
    }
  }, [selectedWeekOffset, user]);

  // 선택된 날짜 변경 useEffect
  useEffect(() => {
    const existingData = exerciseData[selectedDate];
    if (existingData) {
      setFormData({
        pushups: String(existingData.pushups || ''),
        pullups: String(existingData.pullups || ''),
        dips: String(existingData.dips || ''),
        lateralRaise: String(existingData.lateralRaise || ''),
        running: String(existingData.running || ''),
        avgPace: existingData.avgPace || ''
      });
    } else {
      setFormData({
        pushups: '',
        pullups: '',
        dips: '',
        lateralRaise: '',
        running: '',
        avgPace: ''
      });
    }
  }, [selectedDate, exerciseData]);

  // Helper Functions for Goal Calculation

  // 실제 운동한 날의 데이터만 추출
  const getExerciseDays = (dateRange: string[], exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    return dateRange
      .map(date => exerciseData[date]?.[exerciseType])
      .filter((value): value is number => typeof value === 'number' && value > 0);
  };

  // 운동일 평균 계산 (0인 날 제외)
  const getExerciseDaysAverage = (dateRange: string[], exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    const exerciseDays = getExerciseDays(dateRange, exerciseType);
    if (exerciseDays.length === 0) return 0;

    return exerciseDays.reduce((sum, val) => sum + val, 0) / exerciseDays.length;
  };

  // 최근 4주간 평균 주간 운동 빈도 계산 (완전한 주 단위)
  const calculateWeeklyFrequency = (exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    const today = new Date();

    // 지난 주 일요일 찾기
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    const daysToLastSunday = dayOfWeek === 0 ? 0 : dayOfWeek; // 일요일이면 0, 아니면 지난 일요일까지 일수

    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - daysToLastSunday);

    // 지난 주 월요일부터 4주간 (완전한 주 4개)
    const last4Weeks: string[][] = [];
    for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
      const weekDays: string[] = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = new Date(lastSunday);
        date.setDate(lastSunday.getDate() - (weekIndex * 7 + 7) + dayIndex + 1); // 월요일부터 시작
        weekDays.push(getKoreanDateString(date));
      }
      last4Weeks.push(weekDays);
    }

    // 최신 주부터 오래된 순으로 정렬 (역순)
    const weeklyData = last4Weeks.reverse();

    const weeklyFrequencies = weeklyData.map(week => getExerciseDays(week, exerciseType).length);
    const avgFrequency = weeklyFrequencies.reduce((sum, freq) => sum + freq, 0) / 4;

    // 운동 특성에 따른 최적 빈도 보장
    const characteristics = exerciseCharacteristics[exerciseType];
    const minFrequency = Math.min(characteristics.optimalFrequency, 3);

    // 실제 빈도와 권장 빈도 중 더 높은 값 사용 (최대 7회)
    const finalFrequency = Math.max(minFrequency, Math.min(7, avgFrequency));

    // 디버깅 로그
    console.log(`[${exerciseType}] 주간 빈도 계산:`, {
      지난주일요일: getKoreanDateString(lastSunday),
      '4주전(week1)': `${weeklyData[0][0]} ~ ${weeklyData[0][6]}`,
      '3주전(week2)': `${weeklyData[1][0]} ~ ${weeklyData[1][6]}`,
      '2주전(week3)': `${weeklyData[2][0]} ~ ${weeklyData[2][6]}`,
      '지난주(week4)': `${weeklyData[3][0]} ~ ${weeklyData[3][6]}`,
      주별운동횟수: weeklyFrequencies,
      평균빈도: avgFrequency.toFixed(2),
      권장최소빈도: minFrequency,
      최종빈도: finalFrequency
    });

    return finalFrequency;
  };

  // Step 1: 사용자 운동 능력 평가 (5단계 우선순위)
  const evaluateUserCapacity = (exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    const today = new Date();

    // 날짜 범위 생성
    const getDateRange = (daysBack: number) => {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - daysBack - i);
        return getKoreanDateString(date);
      });
    };

    const getMonthRange = (monthsBack: number) => {
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - monthsBack);
      const daysInRange = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      return Array.from({ length: daysInRange }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return getKoreanDateString(date);
      });
    };

    const thisWeekDates = getDateRange(0);
    const lastWeekDates = getDateRange(7);
    const lastMonthDates = getMonthRange(1);

    const thisWeekAvg = getExerciseDaysAverage(thisWeekDates, exerciseType);
    const lastWeekAvg = getExerciseDaysAverage(lastWeekDates, exerciseType);
    const lastMonthAvg = getExerciseDaysAverage(lastMonthDates, exerciseType);

    // Priority 1: 지난주 + 이번주 평균 (가장 신뢰도 높음)
    if (lastWeekAvg > 0 && thisWeekAvg > 0) {
      return (lastWeekAvg + thisWeekAvg) / 2;
    }

    // Priority 2: 지난주 데이터만 (5 이상일 때)
    if (lastWeekAvg >= 5) {
      return lastWeekAvg;
    }

    // Priority 3: 가중 평균 (지난주 저조 + 지난달 양호)
    if (lastWeekAvg > 0 && lastWeekAvg < 5 && lastMonthAvg > 10) {
      return lastWeekAvg * 0.3 + lastMonthAvg * 0.7;
    }

    // Priority 4: 이번주 데이터 (최소 10 보장)
    if (thisWeekAvg > 0) {
      return Math.max(thisWeekAvg, 10);
    }

    // Priority 5: 지난달 데이터 (최소 10 보장)
    if (lastMonthAvg > 0) {
      return Math.max(lastMonthAvg, 10);
    }

    // 기본값
    return 10;
  };

  // Step 2: 기본 주간 목표 계산
  const calculateBaseWeeklyGoal = (exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    const today = new Date();

    // 지난달 날짜 범위
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const lastMonthDays: string[] = [];
    for (let d = new Date(lastMonthStart); d <= lastMonthEnd; d.setDate(d.getDate() + 1)) {
      lastMonthDays.push(getKoreanDateString(d));
    }

    const lastMonthExerciseDaysAvg = getExerciseDaysAverage(lastMonthDays, exerciseType);
    const avgWeeklyFrequency = calculateWeeklyFrequency(exerciseType);
    const userCapacity = evaluateUserCapacity(exerciseType);

    // 모든 운동에 동일한 배율 적용
    const growthMultiplier = 1.05;
    const capacityMultiplier = 0.8;

    // Case A: 지난달 데이터 존재 (신뢰도 높음)
    if (lastMonthExerciseDaysAvg > 0) {
      return Math.ceil(lastMonthExerciseDaysAvg * avgWeeklyFrequency * growthMultiplier);
    }

    // Case B: 지난달 데이터 없음 (보수적 접근)
    return Math.ceil(userCapacity * avgWeeklyFrequency * capacityMultiplier);
  };

  // Step 3: 최근 추세 보너스 계산
  const calculateTrendBonus = (exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    const today = new Date();

    // 지난주 날짜
    const lastWeekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - 7 - i);
      return getKoreanDateString(date);
    });

    // 지난달 날짜 범위
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const lastMonthDays: string[] = [];
    for (let d = new Date(lastMonthStart); d <= lastMonthEnd; d.setDate(d.getDate() + 1)) {
      lastMonthDays.push(getKoreanDateString(d));
    }

    const lastWeekAvg = getExerciseDaysAverage(lastWeekDates, exerciseType);
    const lastMonthAvg = getExerciseDaysAverage(lastMonthDays, exerciseType);
    const avgWeeklyFrequency = calculateWeeklyFrequency(exerciseType);

    // 지난주가 지난달보다 개선된 경우에만 보너스 부여 (모든 운동 동일)
    if (lastWeekAvg > lastMonthAvg && lastMonthAvg > 0) {
      const improvement = lastWeekAvg - lastMonthAvg;
      return Math.ceil(improvement * avgWeeklyFrequency * 0.3);
    }

    return 0;
  };

  // Step 4: 최종 주간 목표 합성 (안전장치 포함)
  const calculateFinalWeeklyGoal = (exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running', previousGoal: number = 0) => {
    const minWeeklyGoals = {
      pushups: 50,
      pullups: 15,
      dips: 30,
      lateralRaise: 50,
      running: 3  // 주 3km (하루 1km씩 3일)
    };

    // 운동별 절대 최대값 (건강/안전 고려)
    const maxWeeklyGoals = {
      pushups: Infinity,  // 제한 없음
      pullups: Infinity,  // 제한 없음
      dips: Infinity,     // 제한 없음
      lateralRaise: Infinity,  // 제한 없음
      running: 25   // 주 25km 상한선
    };

    const baseGoal = calculateBaseWeeklyGoal(exerciseType);
    const trendBonus = calculateTrendBonus(exerciseType);
    const userCapacity = evaluateUserCapacity(exerciseType);
    const avgWeeklyFrequency = calculateWeeklyFrequency(exerciseType);

    // 초기 목표 = 기본 + 보너스 (최소값 보장)
    let finalGoal = Math.max(baseGoal + trendBonus, minWeeklyGoals[exerciseType]);

    // 40% 증가 상한선 적용 (이전 목표가 있을 경우)
    if (previousGoal > 0) {
      const maxAllowedGoal = previousGoal * 1.4;
      finalGoal = Math.min(finalGoal, maxAllowedGoal);
    }

    // 절대 상한선 적용 (최종 안전장치)
    const goalBeforeCap = finalGoal;
    finalGoal = Math.min(finalGoal, maxWeeklyGoals[exerciseType]);

    // 디버깅 로그
    console.log(`[${exerciseType}] 목표 계산 상세:`, {
      사용자능력: Math.round(userCapacity * 10) / 10,
      주간빈도: Math.round(avgWeeklyFrequency * 10) / 10,
      기본목표: baseGoal,
      추세보너스: trendBonus,
      최소보장: minWeeklyGoals[exerciseType],
      이전목표: previousGoal,
      최대허용_40프로: previousGoal > 0 ? Math.round(previousGoal * 1.4) : 'N/A',
      절대상한선: maxWeeklyGoals[exerciseType],
      상한선적용전: goalBeforeCap,
      최종목표: finalGoal
    });

    return finalGoal;
  };

  // 주간 목표를 계산하고 필요시 Firebase에 저장
  const saveWeeklyGoalsIfNeeded = async () => {
    // 각 운동별 목표 계산
    const currentGoals = {
      pushups: calculateFinalWeeklyGoal('pushups', previousWeeklyGoals.pushups),
      pullups: calculateFinalWeeklyGoal('pullups', previousWeeklyGoals.pullups),
      dips: calculateFinalWeeklyGoal('dips', previousWeeklyGoals.dips),
      lateralRaise: calculateFinalWeeklyGoal('lateralRaise', previousWeeklyGoals.lateralRaise),
      running: calculateFinalWeeklyGoal('running', previousWeeklyGoals.running)
    };

    // 이번 주 월요일 날짜
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisWeekMonday = new Date(today);
    thisWeekMonday.setDate(today.getDate() - daysFromMonday);
    const thisWeekMondayStr = getKoreanDateString(thisWeekMonday);

    // 같은 주의 목표가 이미 저장되어 있는지 확인
    if (!user) return;

    try {
      const goalsRef = doc(db, 'weeklyGoals', `${user.uid}_${thisWeekMondayStr}`);
      const goalsDoc = await getDoc(goalsRef);

      // 이번 주 목표가 없으면 새로 저장, 있으면 달성량만 업데이트
      if (!goalsDoc.exists()) {
        await saveCurrentWeeklyGoals(currentGoals);
        console.log('새로운 주간 목표 저장:', currentGoals);
      } else {
        // 기존 목표가 있으면 달성량만 업데이트
        await saveCurrentWeeklyGoals(currentGoals);
      }
    } catch (error) {
      console.error('주간 목표 확인 오류:', error);
    }
  };

  // 과거 주차의 달성량만 업데이트하는 함수 (목표는 변경하지 않음)
  const updateHistoricalAchievements = async () => {
    if (!user || Object.keys(exerciseData).length === 0) return;

    try {
      // 현재 주 월요일
      const today = new Date();
      const todayDayOfWeek = today.getDay();
      const todayDaysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
      const currentWeekMonday = new Date(today);
      currentWeekMonday.setDate(today.getDate() - todayDaysFromMonday);
      const currentWeekMondayStr = getKoreanDateString(currentWeekMonday);

      // 모든 운동 데이터의 날짜를 가져와서 주차별로 그룹화
      const dates = Object.keys(exerciseData).sort();
      if (dates.length === 0) return;

      // 각 날짜가 속한 주의 월요일 찾기
      const weekMondays = new Set<string>();
      dates.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(date);
        monday.setDate(date.getDate() - daysFromMonday);
        weekMondays.add(getKoreanDateString(monday));
      });

      // 각 주차의 달성량만 업데이트 (현재 주는 제외, 목표는 절대 변경하지 않음)
      for (const mondayStr of Array.from(weekMondays)) {
        if (mondayStr === currentWeekMondayStr) continue; // 현재 주는 saveWeeklyGoalsIfNeeded에서 처리

        const goalsRef = doc(db, 'weeklyGoals', `${user.uid}_${mondayStr}`);
        const goalsDoc = await getDoc(goalsRef);

        // 해당 주의 7일간 날짜 생성
        const monday = new Date(mondayStr);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          return getKoreanDateString(date);
        });

        // 실제 달성량 계산
        const achievements = {
          pushups: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.pushups || 0), 0),
          pullups: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.pullups || 0), 0),
          dips: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.dips || 0), 0),
          lateralRaise: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.lateralRaise || 0), 0),
          running: weekDays.reduce((sum, date) => sum + (exerciseData[date]?.running || 0), 0)
        };

        // ⚠️ 중요: 과거 주차는 달성량만 업데이트, 목표는 절대 변경하지 않음
        if (goalsDoc.exists()) {
          // 기존에 저장된 목표가 있으면 그 목표를 유지하고 달성량만 업데이트
          const existingData = goalsDoc.data();
          const existingGoals = existingData.goals || {
            pushups: existingData.pushups || 0,
            pullups: existingData.pullups || 0,
            dips: existingData.dips || 0,
            lateralRaise: existingData.lateralRaise || 0,
            running: existingData.running || 0
          };

          // 달성률 계산
          const achievementRates = {
            pushups: existingGoals.pushups > 0 ? Math.round((achievements.pushups / existingGoals.pushups) * 100) : 0,
            pullups: existingGoals.pullups > 0 ? Math.round((achievements.pullups / existingGoals.pullups) * 100) : 0,
            dips: existingGoals.dips > 0 ? Math.round((achievements.dips / existingGoals.dips) * 100) : 0,
            lateralRaise: existingGoals.lateralRaise > 0 ? Math.round((achievements.lateralRaise / existingGoals.lateralRaise) * 100) : 0,
            running: existingGoals.running > 0 ? Math.round((achievements.running / existingGoals.running) * 100) : 0
          };

          // 목표는 유지하고 달성량과 달성률만 업데이트
          await setDoc(goalsRef, {
            userId: user.uid,
            weekOf: mondayStr,
            goals: existingGoals,  // 기존 목표 유지
            achievements: achievements,  // 달성량만 업데이트
            achievementRates: achievementRates,
            updatedAt: Timestamp.now()
          }, { merge: true });

          console.log(`✅ 과거 주차 (${mondayStr}) 달성량 업데이트:`, {
            goals: existingGoals,
            achievements,
            rates: achievementRates
          });
        } else {
          // 과거 주차인데 목표가 없는 경우: 저장하지 않음 (당시 목표를 모르므로)
          console.log(`⚠️ 과거 주차 (${mondayStr}) 목표 없음 - 건너뜀 (당시 목표 데이터 없음)`);
        }
      }
    } catch (error) {
      console.error('과거 주차 달성량 업데이트 오류:', error);
    }
  };

  const calculateWeeklyData = () => {
    const today = new Date();

    // 이번 주 월요일 찾기 (한국 시간 기준)
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일인 경우 6, 그외는 요일-1

    const thisWeekMonday = new Date(today);
    thisWeekMonday.setDate(today.getDate() - daysFromMonday);

    // 월요일부터 7일간의 날짜 생성
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(thisWeekMonday);
      date.setDate(thisWeekMonday.getDate() + i);
      return getKoreanDateString(date);
    });

    const data = weekDays.map(date => ({
      date,
      pushups: exerciseData[date]?.pushups || 0,
      pullups: exerciseData[date]?.pullups || 0,
      dips: exerciseData[date]?.dips || 0,
      running: exerciseData[date]?.running || 0
    }));

    setWeeklyData(data);
  };

  // 주간 목표 진행 상황 및 오늘 권장량 계산 (푸시업, 풀업, 딥스, 사이드 래터럴 레이즈, 달리기)
  const calculateTodayRecommendation = (exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // 이번 주 월요일
    const thisWeekMonday = new Date(today);
    thisWeekMonday.setDate(today.getDate() - daysFromMonday);

    // 월요일부터 오늘까지의 날짜
    const daysUntilToday = daysFromMonday + 1; // 오늘 포함
    const weekDaysUntilToday = Array.from({ length: daysUntilToday }, (_, i) => {
      const date = new Date(thisWeekMonday);
      date.setDate(thisWeekMonday.getDate() + i);
      return getKoreanDateString(date);
    });

    // 이번 주 지금까지 완료한 개수
    const completedThisWeek = weekDaysUntilToday.reduce((sum, date) => {
      return sum + (exerciseData[date]?.[exerciseType] || 0);
    }, 0);

    // 주간 목표 (previousWeeklyGoals에서 가져오거나 계산)
    const weeklyGoal = previousWeeklyGoals[exerciseType] || calculateFinalWeeklyGoal(exerciseType, 0);

    // 남은 일수 (오늘 포함, 일요일까지)
    const remainingDays = 7 - daysFromMonday; // 오늘부터 일요일까지

    // 진행률
    const progressRate = weeklyGoal > 0 ? (completedThisWeek / weeklyGoal) * 100 : 0;

    // 오늘 권장량 = (목표 - 완료) / 남은일수
    const remaining = Math.max(0, weeklyGoal - completedThisWeek);
    const todayRecommendation = remainingDays > 0 ? Math.ceil(remaining / remainingDays) : remaining;

    return {
      weeklyGoal,
      completedThisWeek,
      remaining,
      remainingDays,
      progressRate: Math.round(progressRate * 10) / 10,
      todayRecommendation: Math.max(0, todayRecommendation)
    };
  };

  const calculateMonthlyData = () => {
    const today = new Date();
    // 이번 달 1일부터 오늘까지의 날짜 생성
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInThisMonth = today.getDate(); // 1일부터 오늘까지의 날 수
    
    const thisMonthDays = Array.from({ length: daysInThisMonth }, (_, i) => {
      const date = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth(), 1 + i);
      return getKoreanDateString(date);
    });

    const data = thisMonthDays.map(date => ({
      date,
      pushups: exerciseData[date]?.pushups || 0,
      pullups: exerciseData[date]?.pullups || 0,
      dips: exerciseData[date]?.dips || 0,
      running: exerciseData[date]?.running || 0
    }));

    setMonthlyData(data);

    // 평균 계산 - 모든 운동을 2025-01-01부터 계산
    const startDate = new Date('2025-01-01'); // 모든 운동 시작일 통일
    
    // 현재까지의 총 일수 계산 (2025-01-01부터)
    const msPerDay = 24 * 60 * 60 * 1000;
    const todayDate = new Date();
    const daysFromStart = Math.floor((todayDate.getTime() - startDate.getTime()) / msPerDay) + 1;

    // 총합 계산 - 모든 운동을 2025-01-01부터만 계산
    const totalStats = Object.entries(exerciseData).reduce(
      (acc, [date, data]) => {
        if (date >= '2025-01-01') {
          acc.pushups += data.pushups || 0;
          acc.pullups += data.pullups || 0;
          acc.dips += data.dips || 0;
          acc.lateralRaise += data.lateralRaise || 0;
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
      { running: 0, pushups: 0, pullups: 0, dips: 0, lateralRaise: 0, runningDays: 0, totalPaceSeconds: 0 }
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

    // 모든 운동의 전체 평균 계산 (2025-01-01부터 통일)
    const runningTotalAverage = totalStats.running / daysFromStart;
    const pushupsTotalAverage = totalStats.pushups / daysFromStart;
    const pullupsTotalAverage = totalStats.pullups / daysFromStart;
    const dipsTotalAverage = totalStats.dips / daysFromStart;
    const lateralRaiseTotalAverage = totalStats.lateralRaise / daysFromStart;

    // 디버깅: 전체 평균 계산
    console.log('전체 평균 계산 (2025-01-01 통일):', {
      시작일: '2025-01-01',
      오늘날짜: getKoreanDateString(todayDate),
      경과일수: daysFromStart,
      총운동량: {
        달리기: totalStats.running,
        푸시업: totalStats.pushups,
        풀업: totalStats.pullups,
        딥스: totalStats.dips,
        래터럴레이즈: totalStats.lateralRaise
      },
      계산된평균: {
        달리기: runningTotalAverage,
        푸시업: pushupsTotalAverage,
        풀업: pullupsTotalAverage,
        딥스: dipsTotalAverage,
        래터럴레이즈: lateralRaiseTotalAverage
      }
    });

    setAverageStats({
      running: Math.round(runningTotalAverage * 100) / 100,
      runningDaysAvg: runningDaysAverage,
      pushups: Math.round(pushupsTotalAverage * 10) / 10,
      pullups: Math.round(pullupsTotalAverage * 10) / 10,
      dips: Math.round(dipsTotalAverage * 10) / 10,
      lateralRaise: Math.round(lateralRaiseTotalAverage * 10) / 10,
      avgPace: averagePace,
      daysCountedRunning: daysFromStart,
      daysCountedExercises: daysFromStart,
      runningDaysCount: totalStats.runningDays
    });
  };

  // 카드형 차트를 위한 데이터 준비
  const prepareCardData = (exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    const today = new Date();

    // 선택된 주의 월요일 가져오기
    const thisWeekMonday = getSelectedWeekMonday();

    // 월요일부터 7일간의 날짜 생성
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(thisWeekMonday);
      date.setDate(thisWeekMonday.getDate() + i);
      return getKoreanDateString(date);
    });

    const chartData = weekDays.map(date => ({
      date,
      value: exerciseData[date]?.[exerciseType] || 0
    }));

    const currentValue = exerciseData[selectedDate]?.[exerciseType] || 0;

    // 선택된 주의 총합 계산
    const totalThisWeek = chartData.reduce((sum, day) => sum + day.value, 0);

    // 선택된 주의 평균 계산
    // 현재 주를 보는 경우: 오늘까지만 평균 계산
    // 과거 주를 보는 경우: 전체 7일로 평균 계산
    let thisWeekDaysCount = 7;
    if (selectedWeekOffset === 0) {
      // 현재 주인 경우, 오늘까지만 계산
      const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
      thisWeekDaysCount = Math.min(currentDayOfWeek, 7);
    }
    const thisWeekAverage = thisWeekDaysCount > 0 ? totalThisWeek / thisWeekDaysCount : 0;

    // 지난 주 데이터 계산 (지난 주 월요일부터 일요일까지 7일)
    const lastWeekMonday = new Date(thisWeekMonday);
    lastWeekMonday.setDate(thisWeekMonday.getDate() - 7);

    const lastWeekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(lastWeekMonday);
      date.setDate(lastWeekMonday.getDate() + i);
      return getKoreanDateString(date);
    });
    
    const lastWeekTotal = lastWeekDays.reduce((sum, date) => {
      return sum + (exerciseData[date]?.[exerciseType] || 0);
    }, 0);
    const lastWeekAverage = lastWeekTotal / 7;

    // 최고 기록
    const allValues = Object.values(exerciseData).map(day => day[exerciseType] || 0);
    const bestRecord = Math.max(...allValues, 0);

    // 평균값
    const averageValue = averageStats[exerciseType] || 0;

    // 주간 목표 결정 로직
    // 1. 선택된 주차가 현재 주인 경우: previousWeeklyGoals 사용 (현재 주 목표)
    // 2. 선택된 주차가 과거 주인 경우: selectedWeekGoals 사용 (그 주차의 실제 목표)
    // 3. 과거 주차에 저장된 목표가 없으면: 계산된 목표를 대신 사용
    let weeklyGoal: number;

    if (selectedWeekOffset === 0) {
      // 현재 주: 계산된 목표 사용
      const previousGoal = previousWeeklyGoals[exerciseType] || 0;
      weeklyGoal = calculateFinalWeeklyGoal(exerciseType, previousGoal);
    } else {
      // 과거/미래 주: 저장된 목표 사용
      const savedGoal = selectedWeekGoals[exerciseType];
      if (savedGoal && savedGoal > 0) {
        // 저장된 목표가 있으면 사용
        weeklyGoal = savedGoal;
      } else {
        // 저장된 목표가 없으면 계산된 목표를 대신 사용
        weeklyGoal = calculateFinalWeeklyGoal(exerciseType, 0);
      }
    }

    // 오늘 권장량 계산 (현재 주에만 의미 있음)
    const todayRecommendation = selectedWeekOffset === 0 ? calculateTodayRecommendation(exerciseType) : null;

    return {
      chartData,
      currentValue,
      thisWeekAverage,
      lastWeekAverage,
      totalThisWeek,
      bestRecord,
      averageValue,
      weeklyGoal,
      todayRecommendation
    };
  };

  // 월간 카드형 차트를 위한 데이터 준비
  const prepareMonthlyCardData = (exerciseType: 'pushups' | 'pullups' | 'dips' | 'lateralRaise' | 'running') => {
    // 이번 달 1일부터 오늘까지의 날짜 생성
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInThisMonth = today.getDate(); // 1일부터 오늘까지의 날 수
    
    const thisMonthDays = Array.from({ length: daysInThisMonth }, (_, i) => {
      const date = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth(), 1 + i);
      return getKoreanDateString(date);
    });

    const chartData = thisMonthDays.map(date => ({
      date,
      value: exerciseData[date]?.[exerciseType] || 0
    }));

    const currentValue = exerciseData[selectedDate]?.[exerciseType] || 0;
    
    // 이번 달과 지난 달 비교 (today와 thisMonthStart는 위에서 이미 선언됨)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // 이번 달 데이터
    const thisMonthData = Object.entries(exerciseData)
      .filter(([date]) => new Date(date) >= thisMonthStart && new Date(date) <= today)
      .map(([, data]) => data[exerciseType] || 0);
    
    // 지난 달 데이터
    const lastMonthData = Object.entries(exerciseData)
      .filter(([date]) => new Date(date) >= lastMonthStart && new Date(date) <= lastMonthEnd)
      .map(([, data]) => data[exerciseType] || 0);

    const thisMonthTotal = thisMonthData.reduce((sum, val) => sum + val, 0);
    const lastMonthTotal = lastMonthData.reduce((sum, val) => sum + val, 0);
    
    // 이번 달 평균 (실제 경과 날수로 계산)
    const daysPassedThisMonth = today.getDate(); // 1일부터 오늘까지의 날 수
    const thisMonthAverage = daysPassedThisMonth > 0 ? thisMonthTotal / daysPassedThisMonth : 0;
    
    // 디버깅 정보 (달리기일 때만)
    if (exerciseType === 'running') {
      const originalThisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      console.log(`달리기 월간 계산 (${exerciseType}):`, {
        오늘날짜: getKoreanDateString(today),
        오늘getDate: today.getDate(),
        올바른이번달시작: getKoreanDateString(originalThisMonthStart),
        경과일수: daysPassedThisMonth,
        이번달데이터개수: thisMonthData.length,
        이번달총거리: thisMonthTotal,
        이번달평균: thisMonthAverage,
        이번달실제데이터: thisMonthData,
        thisMonthDays길이: thisMonthDays.length,
        thisMonthDays첫번째: thisMonthDays[0],
        thisMonthDays마지막: thisMonthDays[thisMonthDays.length - 1]
      });
    }
    
    // 지난 달 평균 (지난 달 전체 날수로 계산)
    const daysInLastMonth = lastMonthEnd.getDate(); // 지난 달 총 일수
    const lastMonthAverage = daysInLastMonth > 0 ? lastMonthTotal / daysInLastMonth : 0;

    // 최고 기록
    const allValues = Object.values(exerciseData).map(day => day[exerciseType] || 0);
    const bestRecord = Math.max(...allValues, 0);

    // 전체 평균값
    const averageValue = averageStats[exerciseType] || 0;

    // 주간 목표 (이전 목표를 전달하여 40% 상한선 적용)
    const previousGoal = previousWeeklyGoals[exerciseType] || 0;
    const weeklyGoal = calculateFinalWeeklyGoal(exerciseType, previousGoal);

    // 월간 목표 (주간 목표 × 4주, 기존 4.3에서 4로 변경)
    const monthlyGoal = Math.ceil(weeklyGoal * 4);

    return {
      chartData,
      currentValue,
      previousValue: lastMonthAverage,
      totalThisMonth: thisMonthTotal,
      bestRecord,
      averageValue,
      monthlyGoal,
      thisMonthAverage,
      lastMonthAverage
    };
  };

  const calculateConsistencyScores = () => {
    // 운동별 일관성 점수 계산
    const exerciseTypes = ['pushups', 'pullups', 'dips', 'running'] as const;
    const newScores = { ...consistencyScores };

    exerciseTypes.forEach((type) => {
      // 1. 데이터 수집 - 최근 30일
      const today = new Date();
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        return getKoreanDateString(date);
      });

      // 운동 기록 존재 여부 (관대한 계산 - 건너뛰기 고려)
      const actualRecordDays = last30Days.filter(date => 
        exerciseData[date] && exerciseData[date][type] && exerciseData[date][type] > 0
      );
      
      // 동기부여를 위한 보너스: 실제 운동일에 건너뛰기 일수도 부분적으로 인정
      const actualExerciseDays = actualRecordDays.length;
      const maxPossibleSkipDays = Math.floor(actualExerciseDays / 3); // 실제 운동일의 1/3까지 건너뛰기 보너스
      const adjustedRecordDaysCount = Math.min(30, actualExerciseDays + maxPossibleSkipDays);
      
      // 가상의 hasRecordDays 객체 생성 (배열의 length 속성만 필요)
      const hasRecordDays = { length: adjustedRecordDaysCount };

      // 2. 최근 10일의 기록과 그 이전 20일의 기록 비교 (추세 계산 - 관대하게)
      const recent10Days = last30Days.slice(0, 10);
      const previous20Days = last30Days.slice(10, 30);
      
      const recent10HasRecords = recent10Days.filter(date => {
        const value = exerciseData[date]?.[type];
        return typeof value === 'number' && value > 0;
      });
      const previous20HasRecords = previous20Days.filter(date => {
        const value = exerciseData[date]?.[type];
        return typeof value === 'number' && value > 0;
      });
      
      // 관대한 추세 계산: 건너뛰기 보너스 적용
      const recent10BonusDays = Math.floor(recent10HasRecords.length / 3);
      const previous20BonusDays = Math.floor(previous20HasRecords.length / 3);
      
      const recent10Ratio = Math.min(1, (recent10HasRecords.length + recent10BonusDays) / recent10Days.length);
      const previous20Ratio = Math.min(1, (previous20HasRecords.length + previous20BonusDays) / previous20Days.length);
      
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

      // 연속일 계산 (개선된 관대한 버전 - 최대 2일까지 건너뛰기 허용)
      let allowedSkips = 2;
      let skipsUsed = 0;
      let currentStreakSkips = 0;
      
      for (const date of last30Days) {
        if (exerciseData[date] && exerciseData[date][type] && exerciseData[date][type] > 0) {
          // 운동한 날: 연속 기록 증가, 건너뛰기 카운터 리셋
          if (isCurrentStreak) {
            currentStreakDays++;
            currentStreakSkips = 0; // 운동하면 현재 연속 기록의 건너뛰기 리셋
          }
          currentConsecutiveDays++;
          maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
          skipsUsed = 0; // 전체 건너뛰기 카운터 리셋
        } else {
          // 운동 안 한 날
          if (isCurrentStreak && currentStreakSkips < allowedSkips) {
            // 현재 연속 기록 중이고 건너뛰기 기회가 남아있으면
            currentStreakSkips++;
            currentStreakDays++; // 건너뛰기로 처리하여 연속 기록 유지
            currentConsecutiveDays++;
            maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
          } else if (skipsUsed < allowedSkips && currentConsecutiveDays > 0) {
            // 일반 연속 기록에서 건너뛰기 기회가 남아있으면
            skipsUsed++;
            currentConsecutiveDays++;
            maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
          } else {
            // 건너뛰기 기회를 모두 사용했으면 연속 기록 중단
            isCurrentStreak = false;
            currentConsecutiveDays = 0;
            skipsUsed = 0;
            currentStreakSkips = 0;
          }
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

  // 점수 등급 정보 반환 함수 (더 관대한 기준)
  const getGradeInfo = (score: number) => {
    if (score >= 85) return { grade: 'A+', label: '탁월함', color: '#2E7D32' };
    if (score >= 70) return { grade: 'A', label: '우수함', color: '#558B2F' };
    if (score >= 60) return { grade: 'B+', label: '매우 좋음', color: '#689F38' };
    if (score >= 50) return { grade: 'B', label: '좋음', color: '#9E9D24' };
    if (score >= 40) return { grade: 'C+', label: '보통 이상', color: '#F9A825' };
    if (score >= 30) return { grade: 'C', label: '보통', color: '#FF8F00' };
    if (score >= 25) return { grade: 'D+', label: '노력 필요', color: '#EF6C00' };
    if (score >= 15) return { grade: 'D', label: '개선 필요', color: '#D84315' };
    return { grade: 'F', label: '시작하기', color: '#B71C1C' };
  };

  // 동기부여 메시지 생성 함수 (더 긍정적이고 격려적인 메시지)
  const getMotivationalMessage = (exerciseType: string, score: number, streakDays: number) => {
    const exerciseNames = {
      pushups: '푸시업',
      pullups: '풀업',
      dips: '딥스',
      running: '달리기'
    };
    const name = exerciseNames[exerciseType as keyof typeof exerciseNames];

    if (score >= 85) return `🏆 완벽해요! ${name} 마스터가 되셨네요!`;
    if (score >= 70) return `🎉 훌륭합니다! ${name}을(를) 꾸준히 실천하고 계시네요!`;
    if (score >= 60) return `👍 좋은 페이스입니다! ${name} 습관이 잘 자리잡고 있어요.`;
    if (score >= 50) return `💪 잘하고 있어요! ${name}으로 건강해지고 있습니다.`;
    if (score >= 40) return `🌱 성장하고 있어요! ${name} 습관이 서서히 만들어지고 있습니다.`;
    if (score >= 30) return `⭐ 좋은 시작이에요! ${name}을(를) 조금씩 늘려가고 있네요.`;
    if (score >= 25) return `🚀 시작이 반이에요! ${name}으로 건강한 변화를 만들어가세요.`;
    if (score >= 15) return `🌟 첫걸음을 떼셨네요! ${name}으로 새로운 도전을 시작하세요.`;
    if (streakDays > 0) return `🔥 ${streakDays}일째 ${name} 도전 중! 멋진 연속 기록이에요!`;
    return `✨ ${name}으로 건강한 하루를 시작해보세요! 작은 변화가 큰 차이를 만듭니다.`;
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
Lateral Raise: ${dayData.lateralRaise}회 🏋️‍♂️
Running: ${dayData.running}km (avg pace: ${dayData.avgPace}) 🏃

#내재역량 #저속노화 #감정조절 #인지기능개선`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
    setOpenShareDialog(false);
  };

  // 개선 가이드 다이얼로그 열기 함수
  const handleOpenGuide = (exerciseType: string) => {
    setSelectedExerciseType(exerciseType);
    
    // 운동 타입별 기본 데이터 구성
    const exerciseInfo = {
      pushups: { name: '푸시업', unit: '회', defaultTarget: 15, increaseStep: 5 },
      pullups: { name: '풀업', unit: '회', defaultTarget: 8, increaseStep: 2 },
      dips: { name: '딥스', unit: '회', defaultTarget: 10, increaseStep: 3 },
      running: { name: '달리기', unit: 'km', defaultTarget: 3, increaseStep: 0.5 }
    };
    
    const info = exerciseInfo[exerciseType as keyof typeof exerciseInfo];
    const score = consistencyScores[exerciseType as keyof typeof consistencyScores];
    const currentTrend = score.trendChange;
    const characteristics = exerciseCharacteristics[exerciseType as keyof typeof exerciseCharacteristics];
    
    // 1. 사용자 패턴 분석 - 최근 운동 데이터 수집
    const today = new Date();
    
    // 최근 28일(4주) 데이터 수집
    const last28Days = Array.from({ length: 28 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return getKoreanDateString(date);
    });
    
    // 주별 데이터 분리 (4주)
    const weeklyData = [
      last28Days.slice(0, 7),    // 최근 1주
      last28Days.slice(7, 14),   // 최근 2주
      last28Days.slice(14, 21),  // 최근 3주
      last28Days.slice(21, 28)   // 최근 4주
    ];
    
    // 각 주별 운동 횟수 계산
    const weeklyFrequencies = weeklyData.map(week => 
      week.filter(date => {
        const value = exerciseData[date]?.[exerciseType as keyof Exercise];
        return typeof value === 'number' && value > 0;
      }).length
    );
    
    // 평균 주간 운동 빈도
    const avgWeeklyFrequency = weeklyFrequencies.reduce((sum, freq) => sum + freq, 0) / 
      weeklyFrequencies.length;
    
    // 선호 요일 분석 코드 제거 (요일 추천 없앰)
    
    // 현재 연속 일수
    const currentStreakDays = score.streakDays;
    
    // 최근 7일간 운동한 날의 평균값
    const exerciseValues = last28Days.slice(0, 7)
      .map(date => {
        const value = exerciseData[date]?.[exerciseType as keyof Exercise];
        return typeof value === 'number' ? value : 0;
      })
      .filter(val => val > 0);
    
    const currentAvg = exerciseValues.length > 0 
      ? Math.round((exerciseValues.reduce((a, b) => a + b, 0) / exerciseValues.length) * 10) / 10
      : 0;
      
    // 최근 30일 데이터 계산
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return getKoreanDateString(date);
    });
    
    // 모든 날의 평균 (0 포함)
    const dailyAvg30Days = last30Days
      .map(date => {
        const value = exerciseData[date]?.[exerciseType as keyof Exercise];
        return typeof value === 'number' ? value : 0;
      })
      .reduce((sum, val) => sum + val, 0) / 30;
    
    // 실제 운동한 날만의 평균
    const exerciseValues30Days = last30Days
      .map(date => {
        const value = exerciseData[date]?.[exerciseType as keyof Exercise];
        return typeof value === 'number' ? value : 0;
      })
      .filter(val => val > 0);
    
    const exerciseDayAvg30Days = exerciseValues30Days.length > 0
      ? exerciseValues30Days.reduce((sum, val) => sum + val, 0) / exerciseValues30Days.length
      : 0;
    
    // 전체 기간 평균 (averageStats에서)
    const longTermDailyAvg = exerciseType === 'pushups' ? averageStats.pushups : 
                           exerciseType === 'pullups' ? averageStats.pullups :
                           exerciseType === 'dips' ? averageStats.dips :
                           exerciseType === 'running' ? averageStats.running : 0;
    
    // 실제 운동일만 고려한 평균 (달리기의 경우)
    const activeExerciseDayAvg = 
      exerciseType === 'running' && averageStats.runningDaysCount > 0 
        ? averageStats.runningDaysAvg 
        : 0;
    
    // 콘솔에 계산값 출력 (디버깅용)
    console.log(`${exerciseType} 목표 계산:`, {
      운동일평균: activeExerciseDayAvg,
      전체일일평균: longTermDailyAvg,
      최근7일평균: currentAvg,
      최근30일운동일평균: exerciseDayAvg30Days,
      최근30일일일평균: dailyAvg30Days,
      주간운동빈도: avgWeeklyFrequency
    });
    
    // 2. 점진적 목표 계산
    
    // 현재 운동 빈도 수준에 따른 권장 빈도 계산
    let recommendedFrequency = characteristics.optimalFrequency;
    
    if (avgWeeklyFrequency < 1) {
      // 거의 운동하지 않는 경우 주 1-2회부터 시작
      recommendedFrequency = Math.min(2, characteristics.optimalFrequency);
    } else if (avgWeeklyFrequency < characteristics.optimalFrequency) {
      // 현재보다 1회 증가 (최적 빈도까지 점진적 증가)
      recommendedFrequency = Math.min(Math.ceil(avgWeeklyFrequency) + 1, characteristics.optimalFrequency);
    }
    
    // 목표 기간
    let goalDays = 7; // 기본 1주일
    
    // 목표 운동량 계산
    let targetPerDay = 0;
    let desiredTrend = 0;
    let recommendations: string[] = [];
    
    // 운동 목표량 설정 - 더 현실적이고 달성 가능한 목표로 개선
    let baseTarget = info.defaultTarget;
    
    if (longTermDailyAvg > 0) {
      // 전체 기간 평균이 있으면 기본값과 평균 중 더 현실적인 값 선택
      baseTarget = Math.max(info.defaultTarget * 0.7, longTermDailyAvg);
    } else if (currentAvg > 0) {
      // 최근 7일 평균이 있으면 활용
      baseTarget = Math.max(info.defaultTarget * 0.5, currentAvg);
    } else if (exerciseDayAvg30Days > 0) {
      // 30일 운동일 평균이 있으면 활용
      baseTarget = Math.max(info.defaultTarget * 0.3, exerciseDayAvg30Days);
    }
    
    // 추세에 따른 목표 조정 (더 관대하게)
    if (currentTrend < -10) {
      // 크게 하락한 경우: 현재 수준 유지가 목표
      targetPerDay = baseTarget * 0.8;
    } else if (currentTrend < 0) {
      // 약간 하락한 경우: 소폭 개선 목표
      targetPerDay = baseTarget * 0.9;
    } else if (currentTrend > 10) {
      // 크게 상승한 경우: 적당한 증가 목표
      targetPerDay = baseTarget * 1.1;
    } else {
      // 안정적인 경우: 현재 수준 유지
      targetPerDay = baseTarget;
    }
    
    // 최소값 보장 (너무 낮은 목표 방지)
    const minimumTargets = {
      pushups: 5,
      pullups: 2,
      dips: 3,
      running: 1
    };
    targetPerDay = Math.max(targetPerDay, minimumTargets[exerciseType as keyof typeof minimumTargets] || info.defaultTarget * 0.3);
    
    // 합리적인 최대치 설정 (더 관대하게)
    targetPerDay = Math.min(targetPerDay, characteristics.maxRecommended * 0.8);
    
    // 반올림하여 깔끔한 숫자로 표시
    if (exerciseType === 'running') {
      // 달리기는 소수점 첫째 자리까지 표시
      targetPerDay = Math.round(targetPerDay * 10) / 10;
    } else {
      // 기타 운동은 정수로 반올림
      targetPerDay = Math.round(targetPerDay);
    }
    
    // 3. 현실적이고 동기부여되는 추천사항 생성
    const targetDays = Math.min(goalDays, Math.ceil(recommendedFrequency));
    desiredTrend = currentTrend < -10 ? 5 : currentTrend < 0 ? 10 : currentTrend + 5; // 목표 개선율
    
    if (currentTrend < -10) { // 크게 하락한 추세
      recommendations = [
        `💪 다시 시작하는 것만으로도 대단해요! 일주일에 ${Math.min(2, recommendedFrequency)}회부터 천천히 시작하세요`,
        `🎯 처음엔 ${targetPerDay}${info.unit}를 목표로 하되, 할 수 있는 만큼만 해도 충분합니다`,
        `⭐ 완벽하지 않아도 괜찮아요. 꾸준함이 완벽함보다 중요합니다`,
        `🔥 작은 성공을 쌓아가며 자신감을 회복해보세요`
      ];
    } else if (currentTrend < 0) { // 약간 하락한 추세
      recommendations = [
        `🚀 일주일에 ${recommendedFrequency}회 운동으로 리듬을 되찾아보세요`,
        `🎯 매 운동마다 ${targetPerDay}${info.unit}를 목표로 하되, 무리하지 마세요`,
        characteristics.recoveryNeeded 
          ? `💤 ${characteristics.intensityType} 운동 후엔 충분한 휴식을 취하세요` 
          : `🌱 조금씩이라도 꾸준히 하는 것이 가장 중요해요`,
        `📅 주간 목표: ${Math.round(targetPerDay * recommendedFrequency)}${info.unit} (${recommendedFrequency}회로 나눠서)`
      ];
    } else { // 개선 추세 또는 유지
      recommendations = [
        `🎉 현재 페이스가 훌륭해요! 주 ${recommendedFrequency}회 리듬을 유지하세요`,
        `⚡ 매 운동마다 ${targetPerDay}${info.unit}를 기본으로, 컨디션 좋은 날엔 더 도전해보세요`,
        `🏆 가끔은 목표보다 ${info.increaseStep}${info.unit} 더 높게 도전해서 성취감을 느껴보세요`,
        `🔥 주간 목표: ${Math.round(targetPerDay * recommendedFrequency)}${info.unit} 이상 (${recommendedFrequency}회 분산)`
      ];
    }
    
    // 현재 연속 기록 중인 경우 추가 격려 메시지
    if (score.streakDays > 0) {
      const nextMilestone = score.streakDays < 3 ? 3 : 
                          score.streakDays < 7 ? 7 : 
                          score.streakDays < 14 ? 14 : 
                          score.streakDays < 30 ? 30 : 
                          score.streakDays + 7;
                          
      recommendations.push(`🔥 현재 ${score.streakDays}일 연속 기록 중! ${nextMilestone}일 연속 달성까지 화이팅!`);
    } else {
      // 연속 기록이 없을 때 격려
      recommendations.push(`🌟 새로운 연속 기록을 시작해보세요. 3일 연속이 첫 목표입니다!`);
    }
    
    // 4. 다이얼로그 내용 설정
    setGuideContent({
      title: `${info.name} 맞춤 가이드`,
      description: currentTrend < -10 
        ? `${info.name} 습관을 다시 시작하는 당신을 응원합니다! 천천히 함께 만들어가요.`
        : currentTrend < 0 
        ? `${info.name} 리듬을 되찾을 수 있는 현실적인 방법을 제안드려요.`
        : `${info.name} 습관이 훌륭하게 자리잡고 있어요! 지속가능한 발전 방향을 알려드릴게요.`,
      recommendations,
      goalDays,
      targetPerDay,
      currentTrend,
      desiredTrend
    });
    
    setOpenGuideDialog(true);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper elevation={3} sx={{ 
        p: 3, 
        width: '100%',
        borderRadius: 2,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      }}>
        <Typography variant="h5" gutterBottom sx={{
          fontWeight: 600,
          color: 'primary.main',
          mb: 3
        }}>
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
                placeholder="날짜"
                value={selectedDate}
                onChange={handleDateChange}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="푸시업"
                name="pushups"
                type="number"
                value={formData.pushups}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="풀업"
                name="pullups"
                type="number"
                value={formData.pullups}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="딥스"
                name="dips"
                type="number"
                value={formData.dips}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="사이드 래터럴 레이즈"
                name="lateralRaise"
                type="number"
                value={formData.lateralRaise}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="달리기 (km)"
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
                name="avgPace"
                placeholder="평균 페이스 (mm:ss) 예: 05:30"
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
                sx={{
                  mt: 1,
                  fontFamily: theme === 'retro-pixel' ? "'Press Start 2P', cursive" : 'inherit',
                  fontSize: theme === 'retro-pixel' ? '0.75rem' : 'inherit',
                  letterSpacing: theme === 'retro-pixel' ? '0.1em' : 'inherit',
                  textTransform: theme === 'retro-pixel' ? 'uppercase' : 'inherit',
                }}
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
        width: '100%',
        borderRadius: 2,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
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
          {/* 주차 네비게이션 컨트롤 */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <IconButton
              onClick={goToPreviousWeek}
              color="primary"
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <ChevronLeftIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {getSelectedWeekRangeText()}
              </Typography>
              {selectedWeekOffset !== 0 && (
                <Button
                  size="small"
                  startIcon={<TodayIcon />}
                  onClick={goToCurrentWeek}
                  variant="outlined"
                  sx={{
                    minWidth: '100px',
                    borderRadius: 2
                  }}
                >
                  이번 주
                </Button>
              )}
            </Box>

            <IconButton
              onClick={goToNextWeek}
              color="primary"
              disabled={selectedWeekOffset >= 0}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
            주간 운동 현황
          </Typography>
          <Grid container spacing={3}>
            {(['pushups', 'pullups', 'dips', 'lateralRaise', 'running'] as const).map((exerciseType) => {
              const data = prepareCardData(exerciseType);
              const exerciseInfo = {
                pushups: { title: '푸시업', color: '#8884d8', unit: '회' },
                pullups: { title: '풀업', color: '#82ca9d', unit: '회' },
                dips: { title: '딥스', color: '#ffc658', unit: '회' },
                lateralRaise: { title: '사이드 래터럴 레이즈', color: '#ff7043', unit: '회' },
                running: { title: '달리기', color: '#e91e63', unit: 'km' }
              };
              
              return (
                <Grid item xs={12} sm={6} key={exerciseType}>
                  <ExerciseCard
                    title={exerciseInfo[exerciseType].title}
                    color={exerciseInfo[exerciseType].color}
                    data={data.chartData}
                    currentValue={data.currentValue}
                    thisWeekAverage={data.thisWeekAverage}
                    lastWeekAverage={data.lastWeekAverage}
                    weeklyGoal={data.weeklyGoal}
                    totalThisWeek={data.totalThisWeek}
                    unit={exerciseInfo[exerciseType].unit}
                    bestRecord={data.bestRecord}
                    averageValue={data.averageValue}
                    todayRecommendation={data.todayRecommendation}
                  />
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* 월간 운동 현황 */}
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
            월간 운동 현황
          </Typography>
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {(['pushups', 'pullups', 'dips', 'running'] as const).map((exerciseType) => {
              const data = prepareMonthlyCardData(exerciseType);
              const exerciseInfo = {
                pushups: { title: '푸시업', color: '#8884d8', unit: '회' },
                pullups: { title: '풀업', color: '#82ca9d', unit: '회' },
                dips: { title: '딥스', color: '#ffc658', unit: '회' },
                running: { title: '달리기', color: '#e91e63', unit: 'km' }
              };
              
              return (
                <Grid item xs={12} sm={6} key={exerciseType}>
                  <MonthlyExerciseCard
                    title={exerciseInfo[exerciseType].title}
                    color={exerciseInfo[exerciseType].color}
                    data={data.chartData}
                    currentValue={data.currentValue}
                    lastMonthAverage={data.lastMonthAverage}
                    thisMonthAverage={data.thisMonthAverage}
                    monthlyGoal={data.monthlyGoal}
                    totalThisMonth={data.totalThisMonth}
                    unit={exerciseInfo[exerciseType].unit}
                    bestRecord={data.bestRecord}
                    averageValue={data.averageValue}
                  />
                </Grid>
              );
            })}
          </Grid>

          {/* 일관성 점수 섹션 */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                운동 일관성 점수
              </Typography>
              <MuiTooltip title="운동 일관성 점수란?">
                <span><HelpOutlineIcon fontSize="small" sx={{ ml: 1, cursor: 'pointer', opacity: 0.7 }} /></span>
              </MuiTooltip>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              운동의 꾸준함을 측정하는 점수입니다. 규칙적으로 운동할수록 점수가 높아집니다.
            </Typography>
            <Grid container spacing={2}>
              {(['pushups', 'pullups', 'dips', 'running'] as const).map((type) => (
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
                            <MuiTooltip title="향상된 추세">
                              <span>
                                <Box display="flex" alignItems="center">
                                  <TrendingUpIcon sx={{ color: '#4caf50', mr: 0.5 }} />
                                  <Typography variant="body2" color="#4caf50" fontWeight="bold">
                                    +{consistencyScores[type].trendChange.toFixed(1)}%
                                  </Typography>
                                </Box>
                              </span>
                            </MuiTooltip>
                          ) : consistencyScores[type].trendChange < 0 ? (
                            <MuiTooltip title="하락된 추세">
                              <span>
                                <Box display="flex" alignItems="center">
                                  <TrendingDownIcon sx={{ color: '#f44336', mr: 0.5 }} />
                                  <Typography variant="body2" color="#f44336" fontWeight="bold">
                                    {consistencyScores[type].trendChange.toFixed(1)}%
                                  </Typography>
                                </Box>
                              </span>
                            </MuiTooltip>
                          ) : (
                            <MuiTooltip title="안정적인 추세">
                              <span>
                                <Box display="flex" alignItems="center">
                                  <Typography variant="body2" color="#fff" fontWeight="bold">
                                    변화 없음
                                  </Typography>
                                </Box>
                              </span>
                            </MuiTooltip>
                          )}
                        </Box>
                        {consistencyScores[type].streakDays > 0 && (
                          <MuiTooltip title={`연속 ${consistencyScores[type].streakDays}일 운동`}>
                            <span>
                              <Box display="flex" alignItems="center" ml={2}>
                                <LocalFireDepartmentIcon
                                  sx={{
                                    color: consistencyScores[type].streakDays > 3 ? '#ff9800' : '#757575',
                                    mr: 0.5
                                  }}
                                />
                                <Typography variant="body2" fontWeight="bold">
                                  {consistencyScores[type].streakDays}일
                                </Typography>
                              </Box>
                            </span>
                          </MuiTooltip>
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
                          justifyContent: 'center',
                          mb: 1
                        }}
                      >
                        {consistencyScores[type].message}
                      </Typography>

                      {/* 가이드 버튼 추가 */}
                      <Button
                        size="small"
                        startIcon={<RecommendIcon />}
                        onClick={() => handleOpenGuide(type)}
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.75rem',
                          borderColor: consistencyScores[type].color,
                          color: consistencyScores[type].color,
                          '&:hover': {
                            borderColor: consistencyScores[type].color,
                            backgroundColor: `${consistencyScores[type].color}10`
                          }
                        }}
                      >
                        개선 가이드
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
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

      {/* 개선 가이드 다이얼로그 */}
      <Dialog
        open={openGuideDialog}
        onClose={() => setOpenGuideDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: selectedExerciseType && consistencyScores[selectedExerciseType as keyof typeof consistencyScores]?.color,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {guideContent.title}
          <MuiTooltip title="개선 가이드는 현재 추세를 기반으로 제공되는 맞춤형 조언입니다">
            <span><HelpOutlineIcon fontSize="small" sx={{ color: 'white', opacity: 0.7 }} /></span>
          </MuiTooltip>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" gutterBottom>
            {guideContent.description}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
            <Chip 
              label={`현재 추세: ${guideContent.currentTrend > 0 ? '+' : ''}${guideContent.currentTrend}%`} 
              color={guideContent.currentTrend >= 0 ? "success" : "error"}
              size="small"
              icon={guideContent.currentTrend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
            />
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>→</Typography>
            <Chip 
              label={`목표 추세: +${guideContent.desiredTrend}%`} 
              color="primary"
              variant="outlined"
              size="small"
              icon={<TrendingUpIcon />}
            />
          </Box>
          
          <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
              다음 {guideContent.goalDays}일간 목표
            </Typography>
            <Typography variant="body2" gutterBottom>
              하루 평균 {guideContent.targetPerDay}{selectedExerciseType === 'running' ? 'km' : '회'} 이상
            </Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            추천 사항
          </Typography>
          
          <ul style={{ paddingLeft: '1.5rem' }}>
            {guideContent.recommendations.map((rec, idx) => (
              <li key={idx}>
                <Typography variant="body2" gutterBottom>
                  {rec}
                </Typography>
              </li>
            ))}
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGuideDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExerciseTracker;
