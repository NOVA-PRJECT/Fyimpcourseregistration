import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { role } = await login(email, password);

      // Route based on authenticated role
      if (role === 'student') {
        router.replace('/(student)');
      } else if (role === 'teaching_staff') {
        router.replace('/(teacher)');
      } else if (role === 'hod') {
        router.replace('/(hod)');
      } else {
        router.replace('/(admin)/profile');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View
            style={[
              styles.logoBadge,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.logoText}>FYIMP</Text>
          </View>
          <Text
            style={[
              typography.h1,
              { color: colors.textPrimary, marginTop: spacing.md },
            ]}
          >
            Welcome Back
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: spacing.xs },
            ]}
          >
            Sign in with your university account credentials
          </Text>
        </View>

        <Card variant="elevated" style={styles.formCard}>
          {error ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: colors.dangerLight,
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text style={[typography.bodySmall, { color: colors.danger }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Input
            label="University Email"
            placeholder="student@university.edu"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail-outline"
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
            isPassword
            leftIcon="lock-closed-outline"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        <View style={styles.footerContainer}>
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, textAlign: 'center' },
            ]}
          >
            Four-Year Integrated Multidisciplinary Program (FYIMP)
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, textAlign: 'center', marginTop: 4 },
            ]}
          >
            Need help? Contact your campus administrative desk.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  formCard: {
    padding: 20,
  },
  errorBanner: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  footerContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
});
