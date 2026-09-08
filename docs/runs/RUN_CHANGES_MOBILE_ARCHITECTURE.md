# Run Changes: FYIMP Mobile App Architecture Foundation

## Summary
Successfully established the complete foundational architecture for the **FYIMP Mobile App** using Expo (React Native), Expo Router v3 (file-based routing), TanStack Query v5, Supabase Auth with encrypted SecureStore session storage, offline action queue (AsyncStorage + NetInfo), centralized API client with Zod response validation, and navigation-level role enforcement.

---

## Files Created and Modified

### 1. Root Workspace Configuration
- **Modified [package.json](file:///c:/Users/windows/Fyimpcourseregistration/package.json)**:
  - Added `"mobile"` to `workspaces` array.
  - Added `"dev:mobile": "npm run start --workspace=mobile"` script.

### 2. Mobile App Setup & Tooling Configuration
- **Created [mobile/package.json](file:///c:/Users/windows/Fyimpcourseregistration/mobile/package.json)**:
  - Declared dependencies: `expo`, `expo-router`, `react-native`, `@supabase/supabase-js`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`, `@tanstack/react-query`, `zod`, `react-native-safe-area-context`, `react-native-screens`, `@expo/vector-icons`, `expo-status-bar`.
- **Created [mobile/app.json](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app.json)**:
  - Configured app slug (`fyimp-mobile`), bundle ID (`org.fyimp.mobile`), scheme (`fyimp`).
  - Added iOS `NSLocationWhenInUseUsageDescription` and Android `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` permissions for upcoming campus sign-in feature.
  - Configured plugins (`expo-router`, `expo-secure-store`) and typed routes.
- **Created [mobile/tsconfig.json](file:///c:/Users/windows/Fyimpcourseregistration/mobile/tsconfig.json)**:
  - Configured path aliases (`@/*` mapping to `./src/*`) and TypeScript compiler settings.
- **Created [mobile/babel.config.js](file:///c:/Users/windows/Fyimpcourseregistration/mobile/babel.config.js)**:
  - Configured `babel-preset-expo` and `babel-plugin-module-resolver`.
- **Created [mobile/metro.config.js](file:///c:/Users/windows/Fyimpcourseregistration/mobile/metro.config.js)**:
  - Configured Metro to watch monorepo root folders and resolve node modules across workspaces.
- **Created [mobile/.env.example](file:///c:/Users/windows/Fyimpcourseregistration/mobile/.env.example)**:
  - Provided configuration template for `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### 3. Core Libraries & Infrastructure (`mobile/src/`)
- **[mobile/src/config/env.ts](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/config/env.ts)**: Environment loader with defaults for Android emulator (`10.0.2.2:4000`) and production Supabase URL.
- **[mobile/src/config/constants.ts](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/config/constants.ts)**: Role definitions (`student`, `teaching_staff`, `hod`, `campus_director`, `superadmin`), storage keys, and minimum 44pt touch target metrics.
- **[mobile/src/lib/secure-store.ts](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/lib/secure-store.ts)**: Encrypted `SecureStore` storage adapter implementing `getItem`, `setItem`, `removeItem` for Supabase auth.
- **[mobile/src/lib/supabase.ts](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/lib/supabase.ts)**: Supabase client configured with encrypted `secureStorage`, `autoRefreshToken: true`, and `persistSession: true`.
- **[mobile/src/lib/query-client.ts](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/lib/query-client.ts)**: TanStack Query v5 client with 5-minute stale times, 24-hour GC times, and user-scoped query key conventions.
- **[mobile/src/api/client.ts](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/api/client.ts)**: Centralized API client with automatic Bearer token injection from Supabase session, 401 unauthorized session clearing callback, and runtime Zod validation.
- **[mobile/src/api/endpoints.ts](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/api/endpoints.ts)**: Centralized backend API endpoint paths.
- **[mobile/src/api/schemas/](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/api/schemas/)**:
  - `auth.schema.ts`: Profile and role validation.
  - `student.schema.ts`: Dashboard, timetable slots, and course models.
  - `attendance.schema.ts`: Campus sign-in status and per-course attendance percentage models.

### 4. Application Contexts & Hooks
- **[mobile/src/context/AuthContext.tsx](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/context/AuthContext.tsx)**: Manages session, user, role, and profile with automatic backend verification (`GET /api/auth/profile`), login, logout, and token refresh.
- **[mobile/src/context/SemesterContext.tsx](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/context/SemesterContext.tsx)**: Manages active semester context across queries with persistence.
- **[mobile/src/context/OfflineQueueContext.tsx](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/context/OfflineQueueContext.tsx)**: Offline action queue for attendance and period marking using AsyncStorage and `@react-native-community/netinfo` listener with auto-sync on reconnect.
- **[mobile/src/hooks/](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/hooks/)**:
  - `useTheme.ts`: Dynamic theme resolution (light & dark mode).
  - `useAuth.ts`: Typed AuthContext hook.
  - `useSemester.ts`: Active semester hook.
  - `useOfflineQueue.ts`: Offline action queue hook.

### 5. Design System & UI Components
- **[mobile/src/theme/](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/theme/)**:
  - `colors.ts`: University branding (academic navy `#1E3A8A`, gold `#F59E0B`, emerald `#10B981`, red `#EF4444`) with complete light and dark tokens.
  - `typography.ts`: Consistent font weights, line heights, and sizes.
  - `spacing.ts`: Standard spacing, border radii, and 44x44pt minimum touch targets.
- **[mobile/src/components/common/](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/components/common/)**:
  - `Button.tsx`: Minimum 44pt height, active opacity feedback, spinner loader.
  - `Input.tsx`: Form inputs with icons, error feedback, and password toggle.
  - `Card.tsx`: Standard card container with light/dark theme styling.
  - `Skeleton.tsx`: Animated pulsing placeholder for content-heavy views.
  - `ErrorView.tsx`: Inline error card with retry button.
  - `Badge.tsx`: Status and role tags.
- **[mobile/src/components/layout/](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/components/layout/)**:
  - `ScreenContainer.tsx`: Safe-area container with scroll, pull-to-refresh, and offline warning banner.
  - `TabBarIcon.tsx`: Ionicons helper for navigation tabs.

### 6. Role-Based Navigation Hierarchy (`mobile/app/`)
- **[mobile/app/_layout.tsx](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/_layout.tsx)**:
  - Mounts `SafeAreaProvider`, `QueryClientProvider`, `AuthProvider`, `SemesterProvider`, and `OfflineQueueProvider`.
  - Implements `NavigationGuard` enforcing navigation-level role isolation (unauthorized routes are unmounted/redirected).
- **[mobile/app/index.tsx](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/index.tsx)**:
  - Initial entry gate with splash indicator that delegates to role route.
- **[mobile/app/(auth)/login.tsx](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/(auth)/login.tsx)**:
  - Public login screen using university credentials.
- **[mobile/app/(student)/](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/(student)/)**:
  - `_layout.tsx`: 4 bottom tabs (Home, Attendance, Courses, Credits).
  - `index.tsx`: Student Home tab (today's slots, attendance %, latest announcements).
  - `attendance.tsx`: Campus sign-in (AM/PM) and course percentage list.
  - `courses/index.tsx` & `courses/[id].tsx`: Registered courses and syllabus details stack.
  - `credits.tsx`: Credit ledger progress and exit milestones.
- **[mobile/app/(teacher)/](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/(teacher)/)**:
  - `_layout.tsx`: 3 bottom tabs (Home, Mark, Notices).
  - `index.tsx`: Scheduled lectures for today.
  - `mark.tsx`: Period marking with slot selector, class roster, and absent toggles.
  - `notices.tsx`: Department notices feed.
- **[mobile/app/(hod)/](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/(hod)/)**:
  - `_layout.tsx`: 3 bottom tabs (Home, Attendance, Notices).
  - `index.tsx`: Department absence metrics and low-attendance alert flags.
  - `attendance.tsx`: Campus sign-in roster and period marking unlock override.
  - `notices.tsx`: Department notices feed and new announcement posting modal.
- **[mobile/app/(admin)/profile.tsx](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/(admin)/profile.tsx)**:
  - Minimal profile and sign-out screen for `campus_director` and `superadmin`.
