# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based habit tracker application built with Firebase backend, featuring both habit tracking and exercise recording capabilities. The app uses Material-UI components and includes data visualization with charts and heatmaps.

## Key Technologies

- **Frontend**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Backend**: Firebase Firestore for data storage and authentication
- **Charts**: Recharts for data visualization
- **Heatmaps**: react-grid-heatmap for calendar-style visualizations
- **Build Tool**: Create React App with react-scripts

## Development Commands

```bash
# Start development server
npm start

# Build for production (ESLint disabled to prevent build failures)
npm run build

# Run tests
npm test

# Eject (not recommended)
npm run eject
```

## Architecture Overview

### Main Components Structure

- **App.tsx**: Main application shell with authentication, tab navigation, and Google sign-in
- **HabitTracker.tsx**: Core habit tracking functionality with scoring system (0-3 scale)
- **ExerciseTracker.tsx**: Exercise logging with consistency scoring and trends
- **components/**: Reusable UI components
  - **HabitStats.tsx**: Statistics and analytics display
  - **WeeklyTrend.tsx**: Weekly trend visualization
  - **HabitInsight.tsx**: AI-powered insights

### Data Models

#### Habit Data Structure
```typescript
interface HabitData {
  [year: string]: {
    [month: string]: Array<HabitBase & { days: number[]; weekNumbers: number[] }>;
  };
}
```

#### Exercise Data Structure
```typescript
interface Exercise {
  timestamp: Timestamp;
  pushups: number;
  pullups: number;
  dips: number;
  steps: number;
  running: number;
  avgPace: string;  // mm:ss format
}
```

### Authentication & Security

- **Google OAuth**: Single email allowlist (`spacekatb@gmail.com`)
- **Firebase Security**: Firestore rules configured for user-specific data access
- **Obsidian Integration**: Special handling for Obsidian webview environment

### Core Features

1. **Habit Tracking**: 7 predefined habits with 0-3 scoring system
2. **Exercise Logging**: Push-ups, pull-ups, dips, steps, and running
3. **Data Visualization**: Heatmaps, trend charts, and progress tracking
4. **Consistency Scoring**: Algorithm-based scoring with streak tracking
5. **Social Sharing**: Twitter integration for progress sharing
6. **AI Insights**: OpenAI integration for personalized recommendations

## Important Implementation Details

### Date Handling
- All dates use Korean timezone (UTC+9)
- Data tracking starts from February 1, 2025
- Calendar heatmaps use 6x7 grid with proper week alignment

### Habit Scoring System
- **0**: No activity
- **1**: Light activity (e.g., 5 min reading, 10 push-ups)
- **2**: Moderate activity (e.g., 10 min reading, 50 push-ups)
- **3**: Full activity (e.g., 15+ min reading, 100+ push-ups)

### Consistency Algorithm
- Uses "forgiving" scoring that allows up to 2 skip days in streak calculation
- Weights: 60% frequency, 20% trend improvement, 20% streak length
- Grading scale: A+ (85+), A (70+), B+ (60+), B (50+), down to F (<15)

### Data Migration
- Built-in data migration from old user accounts
- Handles legacy data format conversion
- Preserves historical records during account transitions

## Firebase Configuration

The app uses Firebase for:
- **Firestore**: User data storage with offline persistence
- **Authentication**: Google OAuth with email restrictions
- **Security Rules**: User-scoped data access control

## Build Notes

- ESLint is disabled during build (`DISABLE_ESLINT_PLUGIN=true`) to prevent build failures
- TypeScript strict mode enabled
- Custom type definitions in `src/types/`

## Testing

- Uses React Testing Library with Jest
- Test files follow `.test.js` pattern
- Setup configured in `setupTests.js`

## Development Tips

- The app is optimized for mobile-first responsive design
- All habit data is cached locally for offline functionality
- Calendar components require careful date handling due to timezone considerations
- Consistency scores recalculate on every data change for real-time feedback