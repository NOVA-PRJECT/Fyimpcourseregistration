import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useSemester } from '../../src/hooks/useSemester';
import { useTheme } from '../../src/hooks/useTheme';
import { useOfflineQueue } from '../../src/hooks/useOfflineQueue';
import { apiClient } from '../../src/api/client';
import { API_ENDPOINTS } from '../../src/api/endpoints';
import { queryClient, queryKeys } from '../../src/lib/query-client';
import { StudentAttendanceListSchema } from '../../src/api/schemas/attendance.schema';
import { ScreenContainer } from '../../src/components/layout/ScreenContainer';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Badge } from '../../src/components/common/Badge';
import { Skeleton } from '../../src/components/common/Skeleton';
import { ErrorView } from '../../src/components/common/ErrorView';

interface CampusStatusResponse {
  date: string;
  current_time_ist: string;
  campus: {
    id: string;
    name: string;
    radius_meters: number;
    morning_cutoff?: string;
    midday_split?: string;
    evening_cutoff?: string;
    day_end?: string;
  };
  morning: {
    state: 'completed' | 'pending' | 'absent';
    status: 'on_time' | 'late' | null;
    signed_in_at: string | null;
  };
  evening: {
    state: 'completed' | 'pending' | 'absent';
    status: 'on_time' | 'early_leave' | null;
    signed_in_at: string | null;
  };
}

export default function StudentAttendanceScreen() {
  const { user } = useAuth();
  const { activeSemester } = useSemester();
  const { colors, typography, spacing } = useTheme();
  const { isOnline, enqueueAction, pendingActions } = useOfflineQueue();

  const userId = user?.id || '';
  const todayStr = new Date().toISOString().split('T')[0];

  const [locating, setLocating] = useState(false);

  // 1. Fetch campus verification status for today
  const {
    data: campusStatus,
    isLoading: loadingStatus,
    refetch: refetchStatus,
    isRefetching: refetchingStatus,
  } = useQuery<CampusStatusResponse>({
    queryKey: queryKeys.student.campusStatus(userId, todayStr),
    queryFn: () =>
      apiClient.get<CampusStatusResponse>(`${API_ENDPOINTS.CAMPUS_STATUS}/${userId}`),
    enabled: !!userId,
  });

  // 2. Fetch student's course-level attendance list
  const {
    data: courseAttendanceData,
    isLoading: loadingCourses,
    error: courseError,
    refetch: refetchCourses,
    isRefetching: refetchingCourses,
  } = useQuery({
    queryKey: queryKeys.student.attendanceList(userId, activeSemester),
    queryFn: () =>
      apiClient.get(
        `${API_ENDPOINTS.STUDENT_ATTENDANCE}?semester=${activeSemester}`,
        { schema: StudentAttendanceListSchema }
      ),
    enabled: !!userId,
  });

  const refetchAll = () => {
    refetchStatus();
    refetchCourses();
  };

  // Determine current active session & button state based on IST time
  const currentTimeStr = campusStatus?.current_time_ist || '10:00:00';
  const [currentHours, currentMinutes] = currentTimeStr.split(':').map((v) => parseInt(v, 10));
  const currentTotalMin = currentHours * 60 + currentMinutes;

  const isMorningWindow = currentTotalMin < 13 * 60 + 30; // before 13:30 IST
  const isEveningWindow = currentTotalMin >= 13 * 60 + 30 && currentTotalMin <= 17 * 60; // 13:30 - 17:00 IST
  const isDayClosed = currentTotalMin > 17 * 60;

  const morningCompleted = campusStatus?.morning.state === 'completed';
  const eveningCompleted = campusStatus?.evening.state === 'completed';

  // 3. Campus Sign-in Mutation
  const signInMutation = useMutation({
    mutationFn: async () => {
      setLocating(true);

      // Step 1: Request foreground location permission
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        setLocating(false);
        throw new Error(
          'Location access is required to verify that you are physically on campus.'
        );
      }

      // Step 2: Get high accuracy position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Step 3: Check client-side accuracy (< 50m required)
      const accuracy = position.coords.accuracy || 0;
      if (accuracy > 50) {
        setLocating(false);
        throw new Error(
          `GPS signal accuracy is low (±${Math.round(accuracy)}m). Please step into an open area or near a window and try again.`
        );
      }

      const payload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: accuracy,
        client_timestamp: new Date().toISOString(),
      };

      if (!isOnline) {
        await enqueueAction(
          'CAMPUS_SIGN_IN',
          API_ENDPOINTS.CAMPUS_SIGN_IN,
          payload
        );
        setLocating(false);
        return { queued: true };
      }

      const res = await apiClient.post(API_ENDPOINTS.CAMPUS_SIGN_IN, payload);
      setLocating(false);
      return res;
    },
    onSuccess: (res: any) => {
      if (res?.queued) {
        Alert.alert(
          'Saved Offline',
          'Your campus sign-in was verified and recorded offline. It will automatically synchronize when your network connection is restored.'
        );
      } else {
        Alert.alert(
          'Campus Verified',
          res?.message || 'Your presence on campus was successfully verified!'
        );
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.student.campusStatus(userId, todayStr),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.student.dashboard(userId),
      });
    },
    onError: (err: any) => {
      setLocating(false);
      Alert.alert('Sign-In Check Failed', err?.message || 'Unable to record campus attendance.');
    },
  });

  // Decide button properties
  let buttonTitle = 'Sign In (Morning Arrival)';
  let buttonDisabled = false;
  let buttonVariant: 'primary' | 'outline' = 'primary';

  if (isMorningWindow) {
    if (morningCompleted) {
      buttonTitle = '✓ Morning Arrival Verified';
      buttonDisabled = true;
    } else {
      buttonTitle = 'Sign In (Morning Arrival)';
      buttonDisabled = false;
    }
  } else if (isEveningWindow) {
    if (eveningCompleted) {
      buttonTitle = '✓ Evening Departure Verified';
      buttonDisabled = true;
    } else {
      buttonTitle = 'End-of-Day Check (Evening Departure)';
      buttonDisabled = false;
    }
  } else if (isDayClosed) {
    buttonTitle = 'Campus Checkpoints Closed for Today';
    buttonDisabled = true;
  }

  return (
    <ScreenContainer
      scrollable
      refreshing={refetchingStatus || refetchingCourses}
      onRefresh={refetchAll}
    >
      {/* Campus Sign-In Action Card */}
      <Card variant="elevated" style={styles.actionCard}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              Campus Attendance Checkpoint
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              {campusStatus?.campus?.name || 'University Campus'} • 400m GPS Geofence
            </Text>
          </View>
          <View style={styles.gpsBadge}>
            <Ionicons name="navigate" size={14} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginLeft: 4 }]}>
              GPS
            </Text>
          </View>
        </View>

        <Text style={[typography.body, { color: colors.textSecondary, marginVertical: 12, lineHeight: 20 }]}>
          Verify your physical presence on campus. Raw GPS coordinates are evaluated in memory and are{' '}
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>never stored</Text>.
        </Text>

        {/* Action Button */}
        <Button
          title={locating ? 'Acquiring GPS Signal...' : buttonTitle}
          onPress={() => signInMutation.mutate()}
          loading={signInMutation.isPending || locating}
          disabled={buttonDisabled || signInMutation.isPending || locating}
          variant={buttonVariant}
          style={{ marginBottom: 12 }}
        />

        {pendingActions.CAMPUS_SIGN_IN && (
          <View style={[styles.pendingBanner, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="cloud-offline" size={16} color={colors.warning} />
            <Text style={[typography.caption, { color: colors.warning, marginLeft: 6, flex: 1 }]}>
              Offline check recorded locally — auto-syncing upon reconnection.
            </Text>
          </View>
        )}

        {/* Checkpoint Status Readout Grid */}
        <View style={styles.statusReadoutGrid}>
          {/* Morning Checkpoint */}
          <View style={[styles.statusBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
              MORNING ARRIVAL
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, marginTop: 1 }]}>
              Cutoff: 09:30 AM
            </Text>
            <View style={{ marginTop: 6 }}>
              {campusStatus?.morning.state === 'completed' ? (
                <Badge
                  label={campusStatus.morning.status === 'on_time' ? 'ON TIME' : 'LATE'}
                  variant={campusStatus.morning.status === 'on_time' ? 'success' : 'warning'}
                />
              ) : campusStatus?.morning.state === 'pending' ? (
                <Badge label="PENDING" variant="neutral" />
              ) : (
                <Badge label="ABSENT" variant="danger" />
              )}
            </View>
            {campusStatus?.morning.signed_in_at && (
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, marginTop: 4 }]}>
                {new Date(campusStatus.morning.signed_in_at).toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>

          {/* Evening Checkpoint */}
          <View style={[styles.statusBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
              EVENING CHECKPOINT
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, marginTop: 1 }]}>
              Cutoff: 03:30 PM
            </Text>
            <View style={{ marginTop: 6 }}>
              {campusStatus?.evening.state === 'completed' ? (
                <Badge
                  label={campusStatus.evening.status === 'on_time' ? 'ON TIME' : 'EARLY LEAVE'}
                  variant={campusStatus.evening.status === 'on_time' ? 'success' : 'warning'}
                />
              ) : campusStatus?.evening.state === 'pending' ? (
                <Badge label="PENDING" variant="neutral" />
              ) : (
                <Badge label="ABSENT" variant="danger" />
              )}
            </View>
            {campusStatus?.evening.signed_in_at && (
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, marginTop: 4 }]}>
                {new Date(campusStatus.evening.signed_in_at).toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>
        </View>
      </Card>

      {/* Course Attendance Header */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          Course Attendance (Semester {activeSemester})
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Period-wise in-class lecture attendance
        </Text>
      </View>

      {courseError ? (
        <ErrorView
          message={courseError instanceof Error ? courseError.message : 'Failed to load course attendance.'}
          onRetry={refetchCourses}
        />
      ) : null}

      {loadingCourses ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={75} />
          <Skeleton height={75} />
          <Skeleton height={75} />
        </View>
      ) : courseAttendanceData?.courses && courseAttendanceData.courses.length > 0 ? (
        courseAttendanceData.courses.map((course: any) => {
          const isAdequate = course.percentage >= 75;
          return (
            <Card key={course.course_id} variant="outlined" style={styles.courseCard}>
              <View style={styles.courseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMedium, { color: colors.primary, fontWeight: '700' }]}>
                    {course.course_code}
                  </Text>
                  <Text style={[typography.bodyLarge, { color: colors.textPrimary, marginTop: 2 }]}>
                    {course.course_title}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                    {course.attended_classes} of {course.total_classes} classes attended
                  </Text>
                </View>

                <View style={styles.percentageContainer}>
                  <Text
                    style={[
                      typography.h2,
                      { color: isAdequate ? colors.success : colors.danger },
                    ]}
                  >
                    {course.percentage}%
                  </Text>
                  <Badge
                    label={isAdequate ? 'Eligible' : 'Low Attendance'}
                    variant={isAdequate ? 'success' : 'danger'}
                    style={{ marginTop: 4 }}
                  />
                </View>
              </View>
            </Card>
          );
        })
      ) : (
        <Card variant="flat" style={styles.emptyCard}>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            No course attendance records found for this semester.
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusReadoutGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statusBox: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  courseCard: {
    marginVertical: 4,
    padding: 14,
  },
  courseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
});
