import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

import { colors, radius, spacing } from "./theme";

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}>;

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : children}
    </Pressable>
  );
}

type LabelProps = PropsWithChildren<{
  tone?: "default" | "muted" | "danger" | "success" | "warning" | "info";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  weight?: TextStyle["fontWeight"];
  style?: TextStyle;
}>;

export function Label({
  children,
  tone = "default",
  size = "md",
  weight = "500",
  style,
}: LabelProps) {
  return (
    <Text style={[styles.label, styles[`label_${tone}`], styles[`text_${size}`], { fontWeight: weight }, style]}>
      {children}
    </Text>
  );
}

type BadgeProps = PropsWithChildren<{
  tone?: "neutral" | "danger" | "success" | "warning" | "info";
}>;

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`badge_${tone}`]]}>
      <Label size="xs" weight="800" tone={tone === "neutral" ? "muted" : tone}>
        {children}
      </Label>
    </View>
  );
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textSubtle} {...props} style={[styles.field, props.style]} />;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Label size="xs" tone="muted" weight="800" style={styles.sectionTitle}>
        {title}
      </Label>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  button_primary: {
    backgroundColor: colors.primary,
  },
  button_secondary: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
  },
  button_danger: {
    backgroundColor: colors.danger,
  },
  button_ghost: {
    backgroundColor: "transparent",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  label: {
    color: colors.text,
    letterSpacing: 0,
  },
  label_default: {
    color: colors.text,
  },
  label_muted: {
    color: colors.textMuted,
  },
  label_danger: {
    color: colors.danger,
  },
  label_success: {
    color: colors.success,
  },
  label_warning: {
    color: colors.warning,
  },
  label_info: {
    color: colors.info,
  },
  text_xs: {
    fontSize: 11,
  },
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 15,
  },
  text_lg: {
    fontSize: 18,
  },
  text_xl: {
    fontSize: 24,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badge_neutral: {
    backgroundColor: colors.surfaceMuted,
  },
  badge_danger: {
    backgroundColor: "#450A0A",
  },
  badge_success: {
    backgroundColor: "#052E16",
  },
  badge_warning: {
    backgroundColor: "#451A03",
  },
  badge_info: {
    backgroundColor: "#172554",
  },
  field: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    textTransform: "uppercase",
  },
});
