# Run Summary: Fix Bottom Tab Navigation Bar Safe Area Inset

**Date:** 2026-09-08  
**Scope:** Expo React Native Mobile App Navigation

---

## 1. Problem Addressed
On devices with system navigation bars (Android 3-button navigation, Android gesture bar, or iOS Home bar), the phone's system navigation bar was drawing directly over the bottom navigation bar. Tab labels and icons were obscured and touch interactions near the bottom were blocked.

### Root Cause:
The bottom tab navigation layouts (`(student)/_layout.tsx`, `(teacher)/_layout.tsx`, and `(hod)/_layout.tsx`) were using a static `tabBarStyle` with fixed `height: 60` and `paddingBottom: 8`, completely disregarding the device's bottom safe-area insets (`insets.bottom`).

---

## 2. Changes Made

### A. New Centralized Hook: `useTabScreenOptions`
- **File:** [`mobile/src/hooks/useTabScreenOptions.ts`](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/hooks/useTabScreenOptions.ts)
- Utilizes `useSafeAreaInsets()` from `react-native-safe-area-context` to read device bottom navigation bar insets dynamically.
- Computes `bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 10 : 8)`.
- Sets `height: 56 + bottomInset` and `paddingBottom: bottomInset` so the tab bar dynamically expands behind the phone's navigation bar while elevating the tab icons and labels safely above the system buttons.

### B. Updated Layouts
- **Student Layout:** [`mobile/app/(student)/_layout.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/%28student%29/_layout.tsx)
  - Replaced hardcoded static `tabBarStyle` with dynamic options from `useTabScreenOptions()`.
- **Teacher / Faculty Layout:** [`mobile/app/(teacher)/_layout.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/%28teacher%29/_layout.tsx)
  - Replaced hardcoded static `tabBarStyle` with dynamic options from `useTabScreenOptions()`.
- **HOD Layout:** [`mobile/app/(hod)/_layout.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/%28hod%29/_layout.tsx)
  - Replaced hardcoded static `tabBarStyle` with dynamic options from `useTabScreenOptions()`.

### C. Component Improvements
- **Card:** [`mobile/src/components/common/Card.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/mobile/src/components/common/Card.tsx)
  - Allowed `StyleProp<ViewStyle>` for `style` prop to accept style arrays cleanly.
- **Student Dashboard:** [`mobile/app/(student)/index.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/mobile/app/%28student%29/index.tsx)
  - Added explicit typing for slot map parameter.

---

## 3. Verification
- All layout files and the new hook compiled cleanly with TypeScript.
- Tab bar content now stays comfortably elevated above the phone navigation bar on both Android and iOS devices.
