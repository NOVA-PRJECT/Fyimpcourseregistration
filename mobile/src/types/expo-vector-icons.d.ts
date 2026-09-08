declare module '@expo/vector-icons' {
  import * as React from 'react';
  import { TextStyle, ViewStyle } from 'react-native';

  export interface IconProps<T extends string = string> {
    name: T;
    size?: number;
    color?: string;
    style?: TextStyle | ViewStyle | (TextStyle | ViewStyle)[];
  }

  export interface IconComponent<T extends string = string> {
    (props: IconProps<T>): React.ReactElement | null;
    glyphMap: Record<T, any>;
  }

  export const Ionicons: IconComponent<any>;
  export const MaterialIcons: IconComponent<any>;
  export const FontAwesome: IconComponent<any>;
  export const Feather: IconComponent<any>;
  export const AntDesign: IconComponent<any>;
  export const MaterialCommunityIcons: IconComponent<any>;
  export const Entypo: IconComponent<any>;
}
