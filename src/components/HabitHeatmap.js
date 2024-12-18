import React from 'react';
import { Paper, Box, Typography, Grid } from '@mui/material';

const HabitHeatmap = ({ habitData, month, year }) => {
  // 달력 데이터 생성
  const generateCalendarData = () => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendar = [];
    
    // 월의 첫 날 이전의 빈 셀 추가
    for (let i = 0; i < firstDay; i++) {
      calendar.push({ day: null, score: null });
    }
    
    // 월의 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      const score = habitData[day - 1];
      calendar.push({
        day,
        score: typeof score === 'number' ? score : 0,
        isToday: isToday(year, month, day)
      });
    }
    
    return calendar;
  };

  const isToday = (year, month, day) => {
    const today = new Date();
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === day;
  };

  const getScoreColor = (score) => {
    if (score === null) return 'transparent';
    if (score === 0) return '#ebedf0';
    if (score <= 1) return '#9be9a8';  // 연한 초록
    if (score <= 2) return '#40c463';  // 중간 초록
    if (score <= 3) return '#30a14e';  // 진한 초록
    return '#216e39';  // 매우 진한 초록
  };

  const getMonthName = (month) => {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', 
                   '7월', '8월', '9월', '10월', '11월', '12월'];
    return months[month];
  };

  const calendar = generateCalendarData();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Box sx={{ mt: 2, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, color: '#666' }}>
        {getMonthName(month)} 활동 기록
      </Typography>
      <Paper elevation={0} sx={{ 
        p: 2, 
        bgcolor: 'white',
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <Grid container spacing={1}>
          {/* 요일 헤더 */}
          {weekDays.map((day, index) => (
            <Grid item xs={12/7} key={day}>
              <Typography 
                variant="caption" 
                align="center" 
                sx={{ 
                  display: 'block',
                  color: index === 0 ? '#f44336' : index === 6 ? '#3f51b5' : '#666',
                  mb: 1,
                  fontWeight: 'medium'
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
          
          {/* 달력 셀 */}
          {calendar.map((item, index) => (
            <Grid item xs={12/7} key={index}>
              <Box
                sx={{
                  aspectRatio: '1',
                  bgcolor: getScoreColor(item.score),
                  border: item.isToday ? '2px solid #1976d2' : '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  minHeight: '32px',
                  ...(item.isToday && {
                    boxShadow: '0 0 0 1px #fff',
                  }),
                  '&:hover': {
                    cursor: item.day ? 'pointer' : 'default',
                    '& .score-tooltip': {
                      opacity: 1
                    }
                  }
                }}
              >
                {item.day && (
                  <>
                    <Typography
                      variant="caption"
                      sx={{
                        color: item.score > 1 ? 'white' : 'text.secondary',
                        fontWeight: item.isToday ? 'bold' : 'normal'
                      }}
                    >
                      {item.day}
                    </Typography>
                    <Typography
                      className="score-tooltip"
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        zIndex: 1,
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.day}일: {item.score}점
                    </Typography>
                  </>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default HabitHeatmap;