import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';

export default function CoursesStackLayout() {
  const { colors, typography } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          ...typography.h3,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Enrolled Courses',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Course Details',
        }}
      />
    </Stack>
  );
}
