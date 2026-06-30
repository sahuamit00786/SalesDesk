# ConnexifyMobile — Setup Guide

## Prerequisites
- Node.js 20+
- React Native CLI: `npm install -g react-native`
- Android Studio (for Android) or Xcode (for iOS/Mac)
- JDK 17 (Android)

## Step 1 — Initialize Native Project

This folder contains only the JS source. You need to scaffold the native shell:

```bash
# In the parent folder (Connexify/)
npx react-native init ConnexifyMobileNative --version 0.73.6

# Copy the src/ folder, index.js, app.json, .env into the new project
# Or merge package.json dependencies into the scaffolded project
```

## Step 2 — Install Dependencies

```bash
cd ConnexifyMobile
npm install
```

## Step 3 — Android post-install setup

```bash
# Vector icons — add to android/app/build.gradle:
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"

# Reanimated — babel.config.js already has the plugin
# Gesture handler — already at top of index.js via GestureHandlerRootView

# For GPS permission add to AndroidManifest.xml:
# <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
# <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>

# For Call Log sync add to AndroidManifest.xml:
# <uses-permission android:name="android.permission.READ_CALL_LOG"/>
# <uses-permission android:name="android.permission.CALL_PHONE"/>

# react-native-call-log auto-links on RN 0.60+, but verify in android/settings.gradle:
# include ':react-native-call-log'
# project(':react-native-call-log').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-call-log/android')
```

## Step 4 — Environment

```bash
cp .env.example .env
# Edit API_BASE_URL:
#   Android Emulator → http://10.0.2.2:4000/api/v1
#   Physical device  → http://192.168.x.x:4000/api/v1 (your machine LAN IP)
```

## Step 5 — Run

```bash
# Start Metro bundler
npm start

# Android (new terminal)
npm run android

# iOS (Mac only)
cd ios && pod install && cd ..
npm run ios
```

## Architecture

```
src/
├── theme/          Colors, spacing, typography, dark mode context
├── services/       Axios API layer (api.js + per-domain services)
├── store/          Zustand stores (auth, lead, activity, attendance, ui)
├── navigation/     Root → Auth/App stacks → Bottom tabs
├── components/
│   ├── buttons/    PrimaryButton, SecondaryButton, GhostButton, IconButton, FAB, DangerButton
│   ├── inputs/     AppInput, SearchInput, SelectInput, DateInput, TextAreaInput
│   ├── cards/      LeadCard, ActivityCard, AttendanceCard, StatCard, TeamMemberCard
│   ├── feedback/   SkeletonCard, SkeletonList, EmptyState, ErrorState, LoaderOverlay
│   ├── filters/    FilterBottomSheet, FilterChip, FilterBadge, ActiveFiltersRow
│   ├── misc/       Avatar, StatusBadge, SwipeableRow, ConfirmSheet, KeyboardAware, Divider
│   └── navigation/ AppHeader, BottomTabBar
└── screens/
    ├── auth/       LoginScreen
    ├── dashboard/  DashboardScreen
    ├── leads/      LeadsListScreen, LeadDetailScreen, AddLeadScreen, EditLeadScreen, AddActivitySheet
    ├── activity/   ActivityListScreen
    ├── attendance/ AttendanceDashboardScreen, AttendanceDetailScreen
    └── profile/    ProfileScreen, TeamListScreen, TeamMemberDetailScreen
```

## API Connection

All API calls go through `src/services/api.js`:
- Auto-attaches `Authorization: Bearer <token>` from AsyncStorage
- Auto-attaches `x-workspace-id` header
- 401 → clears storage → redirects to Login
- 15s timeout
- Normalized error shape: `{ success, data, message, errors, status }`

## State Management

Zustand stores — no boilerplate, direct mutation pattern:
- `useAuthStore` — login, logout, role checks (`isManager()`, `isAdmin()`)
- `useLeadStore` — leads list with pagination + filters + CRUD
- `useActivityStore` — activities list with pagination + filters
- `useAttendanceStore` — check-in/out + today status + team attendance
- `useUIStore` — dark mode (persisted to AsyncStorage) + global loader
