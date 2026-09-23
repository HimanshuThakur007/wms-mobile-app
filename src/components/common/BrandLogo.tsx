import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  rounded?: boolean;
  onPress?: () => void;
  disableNavigation?: boolean;
}

const sizeMap = {
  sm: 24,
  md: 36,
  lg: 56,
  xl: 72,
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  style,
  containerStyle,
  rounded = true,
  onPress,
  disableNavigation = false,
}) => {
  const router = useRouter();
  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 36;
  const radius = rounded ? Math.round(pixelSize * 0.22) : 0;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!disableNavigation) {
      router.replace('/(tabs)');
    }
  };

  const image = (
    <Image
      source={require('../../../assets/logo1.png')}
      style={[
        {
          width: pixelSize,
          height: pixelSize,
          borderRadius: radius,
        },
        style,
      ]}
      resizeMode="contain"
    />
  );

  if (onPress || !disableNavigation) {
    return (
      <TouchableOpacity
        style={[styles.container, containerStyle]}
        onPress={handlePress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {image}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.container, containerStyle]}>{image}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
