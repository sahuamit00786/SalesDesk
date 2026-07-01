import React from 'react';
import { View } from 'react-native';
import SkeletonCard from './SkeletonCard';

const SkeletonList = ({ count = 6 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </View>
);

export default SkeletonList;
