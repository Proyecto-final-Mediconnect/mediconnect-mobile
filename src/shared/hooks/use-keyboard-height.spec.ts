import { act, renderHook } from '@testing-library/react';
import { Animated, Keyboard, Platform, type LayoutChangeEvent } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKeyboardHeight } from './use-keyboard-height';

let barraInferior = 0;
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: barraInferior, left: 0 }),
}));

type Handler = (e: { endCoordinates: { height: number }; duration: number }) => void;

const original = Platform.OS;
let handlers: Record<string, Handler>;
let valores: number[];

beforeEach(() => {
  barraInferior = 0;
  handlers = {};
  valores = [];
  vi.spyOn(Keyboard, 'addListener').mockImplementation(((evento: string, h: Handler) => {
    handlers[evento] = h;
    return { remove: () => {} };
  }) as unknown as typeof Keyboard.addListener);
  vi.spyOn(Animated, 'timing').mockImplementation(((
    _v: Animated.Value,
    config: { toValue: number },
  ) => {
    valores.push(config.toValue);
    return { start: () => {}, stop: () => {}, reset: () => {} };
  }) as unknown as typeof Animated.timing);
});

afterEach(() => {
  Platform.OS = original;
  vi.restoreAllMocks();
});

const layout = (height: number) =>
  ({ nativeEvent: { layout: { x: 0, y: 0, width: 400, height } } }) as LayoutChangeEvent;

const ultimo = () => valores.at(-1);

describe('useKeyboardHeight', () => {
  it('en iOS el margen es el alto del teclado', () => {
    Platform.OS = 'ios';
    renderHook(() => useKeyboardHeight());

    act(() => handlers.keyboardWillShow?.({ endCoordinates: { height: 300 }, duration: 250 }));
    expect(ultimo()).toBe(300);
  });

  it('en Android, si la ventana no se achica (APK de borde a borde), el margen es el teclado', () => {
    Platform.OS = 'android';
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => result.current.onLayout(layout(800)));
    act(() => handlers.keyboardDidShow?.({ endCoordinates: { height: 300 }, duration: 0 }));
    expect(ultimo()).toBe(300);
    expect(result.current.abierto).toBe(true);

    act(() => handlers.keyboardDidHide?.({ endCoordinates: { height: 0 }, duration: 0 }));
    expect(ultimo()).toBe(0);
  });

  it('en Android, si la ventana se achica sola (Expo Go), no agrega margen', () => {
    Platform.OS = 'android';
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => result.current.onLayout(layout(800)));
    act(() => handlers.keyboardDidShow?.({ endCoordinates: { height: 300 }, duration: 0 }));
    act(() => result.current.onLayout(layout(500)));
    expect(ultimo()).toBe(0);
  });

  it('en Android tampoco agrega margen si la ventana se achicó antes del aviso del teclado', () => {
    Platform.OS = 'android';
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => result.current.onLayout(layout(800)));
    act(() => result.current.onLayout(layout(500)));
    act(() => handlers.keyboardDidShow?.({ endCoordinates: { height: 300 }, duration: 0 }));
    expect(ultimo()).toBe(0);
  });

  it('en el APK suma la barra de navegación, que el alto informado del teclado no incluye', () => {
    Platform.OS = 'android';
    barraInferior = 48;
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => result.current.onLayout(layout(800)));
    act(() => handlers.keyboardDidShow?.({ endCoordinates: { height: 300 }, duration: 0 }));
    expect(ultimo()).toBe(348);

    act(() => handlers.keyboardDidHide?.({ endCoordinates: { height: 0 }, duration: 0 }));
    expect(ultimo()).toBe(0);
  });
});
