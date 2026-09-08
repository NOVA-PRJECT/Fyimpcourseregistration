import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  message,
  onRetry,
  title = 'Something went wrong',
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.danger,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={24} color={colors.danger} />
        <Text
          style={[
            typography.h3,
            { color: colors.danger, marginLeft: spacing.sm },
          ]}
        >
          {title}
        </Text>
      </View>

      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginVertical: spacing.sm },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="outline"
          style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
