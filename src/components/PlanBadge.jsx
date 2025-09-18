// src/components/PlanBadge.jsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffectivePlan } from '../hooks/useEffectivePlan';

export const PlanBadge = ({ 
  showLimit = false, 
  currentCount = 0, 
  style = {},
  textStyle = {},
  showLoading = true 
}) => {
  const { plan, loading } = useEffectivePlan();

  if (loading && showLoading) {
    return (
      <View style={[styles.badge, style]}>
        <ActivityIndicator size="small" color="#ffffff" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.badge, styles.errorBadge, style]}>
        <Text style={[styles.badgeText, textStyle]}>FALLBACK</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>
        {plan.planName.toUpperCase()}
        {showLimit && ` • ${currentCount}/${plan.songLimit}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBadge: {
    backgroundColor: '#ff6b6b',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default PlanBadge;
