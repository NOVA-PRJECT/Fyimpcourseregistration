import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { API_ENDPOINTS } from '../../src/api/endpoints';
import { queryClient, queryKeys } from '../../src/lib/query-client';
import { ScreenContainer } from '../../src/components/layout/ScreenContainer';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Badge } from '../../src/components/common/Badge';
import { Skeleton } from '../../src/components/common/Skeleton';
import { ErrorView } from '../../src/components/common/ErrorView';

export default function HodAttendanceScreen() {
  const { profile } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const deptId = profile?.department_id || '';
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch campus sign-in roster for department
  const { data: roster, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.hod.signInRoster(deptId, todayStr),
    queryFn: () =>
      apiClient.get(`${API_ENDPOINTS.HOD_SIGN_IN_ROSTER}?date=${todayStr}`),
    enabled: !!deptId,
  });

  // 2. Unlock period marking mutation
  const unlockMutation = useMutation({
    mutationFn: (facultyId?: string) =>
      apiClient.post(API_ENDPOINTS.HOD_UNLOCK_MARKING, {
        department_id: deptId,
        date: todayStr,
        faculty_id: facultyId,
      }),
    onSuccess: () => {
      Alert.alert(
        'Marking Window Unlocked',
        'Faculty members in your department have been granted an extension window to record period attendance.'
      );
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('Action Failed', err?.message || 'Unable to unlock period marking.');
    },
  });

  return (
    <ScreenContainer scrollable refreshing={isRefetching} onRefresh={refetch}>
      {/* Action Card: Unlock Period Marking */}
      <Card variant="elevated" style={styles.actionCard}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          Administrative Overrides
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
          If a faculty member was unable to submit period marking within the standard cutoff window, unlock marking for today.
        </Text>

        <Button
          title="Unlock Period Marking for Department"
          onPress={() => unlockMutation.mutate()}
          loading={unlockMutation.isPending}
          variant="outline"
          style={{ marginTop: 14 }}
        />
      </Card>

      {/* Campus Sign-In Department Roster */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          Student Campus Sign-In ({todayStr})
        </Text>
      </View>

      {error ? (
        <ErrorView
          message={error instanceof Error ? error.message : 'Failed to load sign-in roster.'}
          onRetry={refetch}
        />
      ) : null}

      {isLoading ? (
        <View>
          <Skeleton height={64} style={{ marginVertical: 4 }} />
          <Skeleton height={64} style={{ marginVertical: 4 }} />
          <Skeleton height={64} style={{ marginVertical: 4 }} />
        </View>
      ) : roster && roster.length > 0 ? (
        roster.map((record: any) => (
          <Card key={record.id} variant="outlined" style={styles.recordCard}>
            <View style={styles.recordRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {record.student_name}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Roll: {record.roll_number || 'N/A'} • Sem {record.semester}
                </Text>
              </View>

              <View style={styles.statusBadges}>
                <Badge
                  label={record.morning_signed_in ? 'AM Verified' : 'AM Missing'}
                  variant={record.morning_signed_in ? 'success' : 'danger'}
                />
                <Badge
                  label={record.evening_signed_in ? 'PM Verified' : 'PM Missing'}
                  variant={record.evening_signed_in ? 'success' : 'neutral'}
                  style={{ marginTop: 4 }}
                />
              </View>
            </View>
          </Card>
        ))
      ) : (
        <Card variant="flat" style={styles.emptyCard}>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            No campus sign-in records logged for today yet.
          </Text>
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  recordCard: {
    marginVertical: 4,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadges: {
    alignItems: 'flex-end',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
});
