import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { ScreenContainer } from '../../src/components/layout/ScreenContainer';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { Button } from '../../src/components/common/Button';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { user, role, profile, logout } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const roleLabel =
    role === 'campus_director'
      ? 'Campus Director'
      : role === 'superadmin'
      ? 'Super Administrator'
      : (role || 'Administrator');

  return (
    <ScreenContainer scrollable>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarText}>
            {(profile?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text
          style={[
            typography.h2,
            { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
          ]}
        >
          {profile?.full_name || user?.email}
        </Text>

        <View style={styles.roleContainer}>
          <Badge label={roleLabel} variant="primary" />
        </View>

        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
          ]}
        >
          {user?.email}
        </Text>
      </Card>

      <Card variant="outlined" style={styles.infoCard}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          Web Portal Access Only
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: 8, lineHeight: 22 },
          ]}
        >
          Administrative operations—including timetable solver generation, academic blueprint configuration, teacher-course assignment canvases, and campus data exports—are strictly conducted through the desktop web portal.
        </Text>
      </Card>

      <Button
        title="Sign Out of Mobile App"
        variant="danger"
        onPress={handleLogout}
        style={{ marginTop: 24 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 16,
  },
  avatarBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  roleContainer: {
    marginTop: 8,
  },
  infoCard: {
    padding: 16,
  },
});
