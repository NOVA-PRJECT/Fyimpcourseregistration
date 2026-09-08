import React from 'react';
import { Tabs } from 'expo-router';
import { useTabScreenOptions } from '../../src/hooks/useTabScreenOptions';
import { TabBarIcon } from '../../src/components/layout/TabBarIcon';

export default function StudentLayout() {
  const screenOptions = useTabScreenOptions();

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Student Portal',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          headerTitle: 'Campus Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          headerTitle: 'Enrolled Courses',
          tabBarLabel: 'Courses',
          headerShown: false, // Nested stack in courses handles its own headers
          tabBarIcon: ({ color }) => <TabBarIcon name="book-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="credits"
        options={{
          title: 'Credits',
          headerTitle: 'Credit Ledger',
          tabBarLabel: 'Credits',
          tabBarIcon: ({ color }) => <TabBarIcon name="trophy-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
