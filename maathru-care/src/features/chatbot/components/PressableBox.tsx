import { useState, type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

type PressState = { pressed: boolean };
type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle> | ((state: PressState) => StyleProp<ViewStyle>);
  children?: ReactNode | ((state: PressState) => ReactNode);
};

// Pressable with the same `style` / `children` callbacks, resolved here from tracked press state.
// NativeWind (the app's JSX transform) drops Pressable's function `style` on native, which lost
// every row layout and pressed colour on Android while web looked right.
export function PressableBox({ style, children, onPressIn, onPressOut, ...rest }: Props) {
  const [pressed, setPressed] = useState(false);
  const state = { pressed };
  return <Pressable
    {...rest}
    onPressIn={e => { setPressed(true); onPressIn?.(e); }}
    onPressOut={e => { setPressed(false); onPressOut?.(e); }}
    style={typeof style === "function" ? style(state) : style}
  >
    {typeof children === "function" ? children(state) : children}
  </Pressable>;
}
