import { renderHook } from '@testing-library/react';
import { AccessibilityInfo, Platform } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TYPING_ANNOUNCEMENT, useTypingAnnouncement } from './use-typing-announcement';

const original = Platform.OS;
afterEach(() => {
  Platform.OS = original;
  vi.restoreAllMocks();
});

describe('useTypingAnnouncement', () => {
  it('en iOS anuncia al empezar a escribir, una sola vez mientras siga escribiendo', () => {
    Platform.OS = 'ios';
    const anunciar = vi
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
    const { rerender } = renderHook(({ escribiendo }) => useTypingAnnouncement(escribiendo), {
      initialProps: { escribiendo: false },
    });
    expect(anunciar).not.toHaveBeenCalled();

    rerender({ escribiendo: true });
    rerender({ escribiendo: true });
    expect(anunciar).toHaveBeenCalledTimes(1);
    expect(anunciar).toHaveBeenCalledWith(TYPING_ANNOUNCEMENT);

    rerender({ escribiendo: false });
    rerender({ escribiendo: true });
    expect(anunciar).toHaveBeenCalledTimes(2);
  });

  it('en Android no anuncia: lo cubre la región viva del texto', () => {
    Platform.OS = 'android';
    const anunciar = vi
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});

    renderHook(() => useTypingAnnouncement(true));

    expect(anunciar).not.toHaveBeenCalled();
  });
});
