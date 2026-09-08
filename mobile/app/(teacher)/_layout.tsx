import React from 'react';
import { Tabs } from 'expo-router';
import { useTabScreenOptions } from '../../src/hooks/useTabScreenOptions';
import { TabBarIcon } from '../../src/components/layout/TabBarIcon';

export default function TeacherLayout() {
  const screenOptions = useTabScreenOptions();

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Faculty Portal',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mark"
        options={{
          title: 'Mark',
          headerTitle: 'Period Attendance',
          tabBarLabel: 'Mark',
          tabBarIcon: ({ color }) => <TabBarIcon name="checkbox-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: 'Notices',
          headerTitle: 'Department Notices',
          tabBarLabel: 'Notices',
          tabBarIcon: ({ color }) => <TabBarIcon name="notifications-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
