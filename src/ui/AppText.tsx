import React from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, TextProps, TextInputProps } from 'react-native';

const fontFor = (style: TextProps['style'] | TextInputProps['style']) => {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  if (weight === '700' || weight === 'bold' || weight === 700 || weight === '800' || weight === 800 || weight === '900' || weight === 900) return 'GoogleSans_700Bold';
  if (weight === '600' || weight === 600) return 'GoogleSans_600SemiBold';
  if (weight === '500' || weight === 500) return 'GoogleSans_500Medium';
  return 'GoogleSans_400Regular';
};

export function AppText({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: fontFor(style) }, style]} />;
}

export const AppTextInput = React.forwardRef<NativeTextInput, TextInputProps>(function AppTextInput({ style, ...props }, ref) {
  return <NativeTextInput ref={ref} {...props} style={[{ fontFamily: fontFor(style) }, style]} />;
});
