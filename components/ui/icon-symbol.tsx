// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'figure.run': 'directions-run',
  'dumbbell.fill': 'fitness-center',
  'sportscourt.fill': 'sports-baseball',
  'message.fill': 'message',
  'text.bubble.fill': 'chat-bubble',
  'bubble.left.fill': 'chat-bubble',
  'person.fill': 'person',
  'chart.bar.fill': 'bar-chart',
  'person.circle.fill': 'account-circle',
  'star.fill': 'star',
  'trophy.fill': 'emoji-events',
  'dollarsign.circle.fill': 'attach-money',
  'arrow.up.right': 'trending-up',
  'arrow.down.right': 'trending-down',
  'minus': 'remove',
  'gearshape.fill': 'settings',
  'bell.fill': 'notifications',
  'questionmark.circle.fill': 'help',
  'bolt.fill': 'bolt',
  'location.fill': 'location-on',
  'checkmark.circle.fill': 'check-circle',
  'checkmark': 'check',
  'person.2.fill': 'people',
  'person.3.fill': 'group',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
