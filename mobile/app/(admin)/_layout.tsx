import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function AdminLayout() {
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
        name="profile"
        options={{
          title: 'Administrative Account',
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}
