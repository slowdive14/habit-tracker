import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const generateHabitInsights = async (habitData, habitName) => {
  try {
    // 데이터 유효성 검사
    if (!habitData || typeof habitData !== 'object') {
      console.log('Invalid habit data:', habitData);
      return {
        error: true,
        message: '유효하지 않은 데이터입니다.'
      };
    }

    // 데이터 구조 검증
    const months = Object.keys(habitData);
    console.log('Available months:', months);

    if (months.length < 2) {
      console.log('Not enough months:', months);
      return {
        error: true,
        message: '최소 2개월의 데이터가 필요합니다.'
      };
    }

    // 각 월의 데이터 구조 검증
    const validMonths = months.filter(month => {
      const monthData = habitData[month];
      return monthData && 
             monthData.days && 
             Array.isArray(monthData.days) && 
             monthData.days.length > 0;
    });

    console.log('Valid months with data:', validMonths);

    if (validMonths.length < 2) {
      console.log('Not enough valid months with data');
      return {
        error: true,
        message: '최소 2개월의 유효한 데이터가 필요합니다.'
      };
    }

    // 실제 데이터가 있는지 검증
    const hasData = validMonths.some(month => 
      habitData[month].days.some(score => score > 0)
    );

    if (!hasData) {
      console.log('No actual data found in the months');
      return {
        error: true,
        message: '분석할 데이터가 없습니다.'
      };
    }

    // API 호출 재시도 로직
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;

    while (retryCount < maxRetries) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `당신은 습관 분석 전문가입니다. 주어진 데이터를 분석하여 사용자의 습관에 대한 통찰력 있는 피드백을 제공해주세요.
각 날짜별로 0점(미수행)에서 3점(매우 잘함) 사이의 점수로 기록되어 있습니다.
답변은 한국어로 해주시고, 500자 이내로 작성해주세요.
다음 내용을 포함해주세요:
1. 전반적인 습관 수행 패턴
2. 가장 실천이 잘 되는 요일과 저조한 요일 분석
3. 두 달 동안의 습관 변화 추이
4. 강점과 개선이 필요한 부분
5. 구체적인 개선 제안

답변 형식:
[전반적인 패턴]
- 주요 패턴 설명

[요일별 분석]
- 강한 요일/약한 요일
- 요일별 특징

[변화 추이]
- 월별 비교
- 개선/퇴보 여부

[강점과 개선점]
- 주요 강점
- 개선이 필요한 부분

[개선 제안]
- 구체적인 실천 방안
- 약한 요일 개선 전략`
            },
            {
              role: "user",
              content: generatePrompt(habitData, habitName)
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });

        return {
          error: false,
          content: response.choices[0].message.content
        };
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        lastError = error;
        
        if (error.status === 429) {
          return {
            error: true,
            message: 'AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.'
          };
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          // 재시도 전 대기 시간 (1초, 2초, 4초...)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }

    return {
      error: true,
      message: '서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
    };
  } catch (error) {
    console.error('Error in generateHabitInsights:', error);
    return {
      error: true,
      message: '분석 중 오류가 발생했습니다.'
    };
  }
};

const generatePrompt = (habitData, habitName) => {
  try {
    const months = Object.keys(habitData);
    
    // 데이터 집계
    const stats = months.reduce((acc, month) => {
      const monthData = habitData[month];
      if (!monthData || !monthData.days) return acc;

      const days = monthData.days;
      const validDays = days.filter(day => typeof day === 'number');
      const completedDays = validDays.filter(day => day > 0);
      const totalScore = validDays.reduce((sum, day) => sum + day, 0);

      // 월 이름을 숫자로 변환 (0-based index)
      const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);

      // 요일별 점수 합산
      days.forEach((score, dayIndex) => {
        if (typeof score === 'number') {
          const date = new Date(2024, monthIndex, dayIndex + 1);
          const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

          if (!acc.weekdayStats[weekday]) {
            acc.weekdayStats[weekday] = { total: 0, count: 0 };
          }
          acc.weekdayStats[weekday].total += score;
          if (score > 0) acc.weekdayStats[weekday].count++;
        }
      });

      // 월별 총점 저장
      if (!acc.monthlyStats[month]) {
        acc.monthlyStats[month] = { total: 0, days: 0 };
      }
      acc.monthlyStats[month].total = totalScore;
      acc.monthlyStats[month].days = completedDays.length;

      return {
        totalDays: acc.totalDays + validDays.length,
        completedDays: acc.completedDays + completedDays.length,
        totalScore: acc.totalScore + totalScore,
        weekdayStats: acc.weekdayStats,
        monthlyStats: acc.monthlyStats
      };
    }, {
      totalDays: 0,
      completedDays: 0,
      totalScore: 0,
      weekdayStats: {},
      monthlyStats: {}
    });

    // 요일별 통계 정렬 (총점 기준)
    const weekdayStats = Object.entries(stats.weekdayStats)
      .map(([day, data]) => ({
        day,
        total: data.total,
        count: data.count
      }))
      .sort((a, b) => b.total - a.total);

    const bestDay = weekdayStats[0];
    const worstDay = weekdayStats[weekdayStats.length - 1];

    return `
      "${habitName}" 습관의 최근 2개월(${months.join(', ')}) 데이터를 분석했습니다.

      기본 통계:
      - 전체 기간: ${stats.totalDays}일
      - 실천한 날: ${stats.completedDays}일
      - 총 점수: ${stats.totalScore}점
      - 실천율: ${((stats.completedDays / stats.totalDays) * 100).toFixed(1)}%

      요일별 실천 현황 (총점 기준):
      ${weekdayStats.map(({day, total, count}) => 
        `${day}요일: ${total}점 (${count}회 실천)`).join('\n      ')}

      주목할 만한 패턴:
      - 가장 높은 점수 요일: ${bestDay.day}요일 (${bestDay.total}점, ${bestDay.count}회 실천)
      - 가장 낮은 점수 요일: ${worstDay.day}요일 (${worstDay.total}점, ${worstDay.count}회 실천)

      월별 실천 현황:
      ${Object.entries(stats.monthlyStats).map(([month, data]) => 
        `${month}: ${data.days}일 실천, ${data.total}점`).join('\n      ')}

      이 데이터를 바탕으로 습관 수행 패턴을 분석하고, 요일별 특징과 변화 추이를 파악한 후, 구체적인 개선 방안을 제시해주세요.
      특히 ${worstDay.day}요일의 점수를 높이기 위한 전략을 제안해주세요.
    `;
  } catch (error) {
    console.error('Error in generatePrompt:', error);
    throw error;
  }
};

const calculateWeekdayStats = (habitData) => {
  const weekdayStats = {
    '일': { total: 0, sum: 0 },
    '월': { total: 0, sum: 0 },
    '화': { total: 0, sum: 0 },
    '수': { total: 0, sum: 0 },
    '목': { total: 0, sum: 0 },
    '금': { total: 0, sum: 0 },
    '토': { total: 0, sum: 0 }
  };

  const currentYear = new Date().getFullYear();
  const monthToNumber = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  Object.entries(habitData).forEach(([month, days]) => {
    if (!Array.isArray(days)) return;
    
    days.forEach((value, dayIndex) => {
      if (value === undefined) return;
      
      const date = new Date(currentYear, monthToNumber[month], dayIndex + 1);
      const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      weekdayStats[weekday].total++;
      weekdayStats[weekday].sum += value;
    });
  });

  return Object.entries(weekdayStats).reduce((acc, [day, stats]) => {
    acc[day] = stats.total > 0 ? stats.sum / stats.total : 0;
    return acc;
  }, {});
};

const analyzeBreakPatterns = (habitData) => {
  const streaks = [];
  let currentStreak = 0;
  let breakDays = 0;
  let totalDays = 0;

  Object.entries(habitData).forEach(([month, days]) => {
    days.forEach((value) => {
      totalDays++;
      if (value > 0) {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          streaks.push(currentStreak);
        }
        currentStreak = 0;
        breakDays++;
      }
    });
  });

  // 마지막 스트릭 추가
  if (currentStreak > 0) {
    streaks.push(currentStreak);
  }

  const averageStreakLength = streaks.length > 0 ?
    Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length) : 0;
  
  const breakFrequency = breakDays > 0 ? 
    Math.round(totalDays / breakDays) : totalDays;

  return {
    averageStreakLength,
    breakFrequency
  };
};

const analyzeMonthlyPatterns = (habitData) => {
  const patterns = { early: 0, mid: 0, late: 0 };
  const counts = { early: 0, mid: 0, late: 0 };

  Object.entries(habitData).forEach(([month, days]) => {
    days.forEach((value, dayIndex) => {
      const dayNum = dayIndex + 1;
      const period = dayNum <= 10 ? 'early' : dayNum <= 20 ? 'mid' : 'late';
      counts[period]++;
      patterns[period] += value;
    });
  });

  return {
    early: counts.early > 0 ? patterns.early / counts.early : 0,
    mid: counts.mid > 0 ? patterns.mid / counts.mid : 0,
    late: counts.late > 0 ? patterns.late / counts.late : 0
  };
};

const findMostFrequent = (arr) => {
  const frequency = {};
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([day]) => day)
    .slice(0, 1)
    .join(', ');
};

export default openai;
