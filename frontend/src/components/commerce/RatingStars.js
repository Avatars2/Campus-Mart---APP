import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RatingStars({ value = 0, count = 0, size = 14, showCount = true }) {
  const roundedValue = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= roundedValue ? 'star' : 'star-outline'}
            size={size}
            color="#F59E0B"
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
      {showCount && (
        <Text style={{ color: '#8792A2', fontSize: Math.max(11, size - 2), fontWeight: '600', marginLeft: 4 }}>
          {count ? `${Number(value).toFixed(1)} (${count})` : 'No ratings yet'}
        </Text>
      )}
    </View>
  );
}
