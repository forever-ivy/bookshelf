import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Keyboard, ScrollView, Text } from 'react-native';

import { LearningConversationScroll } from '@/components/learning/learning-conversation-scroll';

const mockKeyboardListeners = {
  keyboardDidHide: new Set<(payload?: { duration?: number }) => void>(),
  keyboardDidShow: new Set<(payload?: { duration?: number }) => void>(),
  keyboardWillHide: new Set<(payload?: { duration?: number }) => void>(),
  keyboardWillShow: new Set<(payload?: { duration?: number }) => void>(),
};

function emitKeyboardEvent(
  event: keyof typeof mockKeyboardListeners,
  payload?: { duration?: number }
) {
  mockKeyboardListeners[event].forEach((listener) =>
    listener({
      duration: payload?.duration ?? 220,
    } as never)
  );
}

describe('LearningConversationScroll', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  let scrollToEndSpy: jest.SpyInstance;
  let scrollToSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof global.requestAnimationFrame;

    mockKeyboardListeners.keyboardDidHide.clear();
    mockKeyboardListeners.keyboardDidShow.clear();
    mockKeyboardListeners.keyboardWillHide.clear();
    mockKeyboardListeners.keyboardWillShow.clear();

    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
      if (
        event === 'keyboardDidShow' ||
        event === 'keyboardDidHide' ||
        event === 'keyboardWillShow' ||
        event === 'keyboardWillHide'
      ) {
        mockKeyboardListeners[event].add(listener as (payload?: { duration?: number }) => void);
      }

      return {
        remove: () => {
          if (
            event === 'keyboardDidShow' ||
            event === 'keyboardDidHide' ||
            event === 'keyboardWillShow' ||
            event === 'keyboardWillHide'
          ) {
            mockKeyboardListeners[event].delete(listener as (payload?: { duration?: number }) => void);
          }
        },
      } as ReturnType<typeof Keyboard.addListener>;
    });

    scrollToEndSpy = jest.spyOn(ScrollView.prototype as ScrollView, 'scrollToEnd').mockImplementation(() => {
      return undefined;
    });
    scrollToSpy = jest.spyOn(ScrollView.prototype as ScrollView, 'scrollTo').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    scrollToEndSpy.mockRestore();
    scrollToSpy.mockRestore();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('keeps short conversations pinned to the top instead of forcing bottom scroll', () => {
    render(
      <LearningConversationScroll testID="learning-conversation-scroll">
        <Text>更早的消息</Text>
        <Text>最新的消息</Text>
      </LearningConversationScroll>
    );

    const scrollView = screen.getByTestId('learning-conversation-scroll');

    act(() => {
      scrollView.props.onLayout?.({
        nativeEvent: {
          layout: {
            height: 640,
            width: 320,
            x: 0,
            y: 0,
          },
        },
      });
    });

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 360);
    });

    expect(scrollToEndSpy).not.toHaveBeenCalled();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('scrolls to the latest message only when the conversation overflows the viewport', () => {
    const view = render(
      <LearningConversationScroll testID="learning-conversation-scroll">
        <Text>更早的消息</Text>
        <Text>最新的消息</Text>
      </LearningConversationScroll>
    );

    const scrollView = screen.getByTestId('learning-conversation-scroll');

    act(() => {
      scrollView.props.onLayout?.({
        nativeEvent: {
          layout: {
            height: 640,
            width: 320,
            x: 0,
            y: 0,
          },
        },
      });
    });

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 960);
    });

    expect(scrollToEndSpy).toHaveBeenCalledWith({ animated: false });
    expect(scrollToEndSpy).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  it('anchors the latest turn near the top when a focus target is provided', () => {
    render(
      <LearningConversationScroll
        focusAnchorOffset={72}
        focusAnchorY={280}
        testID="learning-conversation-scroll">
        <Text>更早的消息</Text>
        <Text>最新一轮</Text>
      </LearningConversationScroll>
    );

    const scrollView = screen.getByTestId('learning-conversation-scroll');

    act(() => {
      scrollView.props.onLayout?.({
        nativeEvent: {
          layout: {
            height: 640,
            width: 320,
            x: 0,
            y: 0,
          },
        },
      });
    });

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 960);
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ animated: false, y: 208 });
    expect(scrollToEndSpy).not.toHaveBeenCalled();
  });

  it('keeps advancing the focus anchor upward as more content becomes scrollable', () => {
    render(
      <LearningConversationScroll
        focusAnchorOffset={72}
        focusAnchorY={1400}
        testID="learning-conversation-scroll">
        <Text>更早的消息</Text>
        <Text>最新一轮</Text>
      </LearningConversationScroll>
    );

    const scrollView = screen.getByTestId('learning-conversation-scroll');

    act(() => {
      scrollView.props.onLayout?.({
        nativeEvent: {
          layout: {
            height: 640,
            width: 320,
            x: 0,
            y: 0,
          },
        },
      });
    });

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 1500);
    });

    expect(scrollToSpy).toHaveBeenLastCalledWith({ animated: false, y: 1328 });

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 2200);
    });

    // The anchor target hasn't changed so the dedup guard prevents re-scrolling.
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToEndSpy).not.toHaveBeenCalled();
  });

  it('keeps the active turn anchored near the top after the keyboard opens', () => {
    render(
      <LearningConversationScroll
        focusAnchorOffset={72}
        focusAnchorY={280}
        testID="learning-conversation-scroll">
        <Text>更早的消息</Text>
        <Text>最新一轮</Text>
      </LearningConversationScroll>
    );

    const scrollView = screen.getByTestId('learning-conversation-scroll');

    act(() => {
      scrollView.props.onLayout?.({
        nativeEvent: {
          layout: {
            height: 640,
            width: 320,
            x: 0,
            y: 0,
          },
        },
      });
    });

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 960);
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ animated: false, y: 208 });

    scrollToSpy.mockClear();
    scrollToEndSpy.mockClear();

    act(() => {
      emitKeyboardEvent('keyboardWillShow');
      jest.advanceTimersByTime(100);
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(scrollToEndSpy).not.toHaveBeenCalled();

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 1200);
    });

    expect(scrollToEndSpy).not.toHaveBeenCalled();
  });

  it('keeps following the bottom after the keyboard opens when there is no active focus anchor', () => {
    render(
      <LearningConversationScroll testID="learning-conversation-scroll">
        <Text>更早的消息</Text>
        <Text>最新的消息</Text>
      </LearningConversationScroll>
    );

    const scrollView = screen.getByTestId('learning-conversation-scroll');

    act(() => {
      scrollView.props.onLayout?.({
        nativeEvent: {
          layout: {
            height: 640,
            width: 320,
            x: 0,
            y: 0,
          },
        },
      });
    });

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 960);
    });

    scrollToEndSpy.mockClear();

    act(() => {
      emitKeyboardEvent('keyboardWillShow');
      jest.advanceTimersByTime(100);
    });

    expect(scrollToEndSpy).toHaveBeenCalledWith({ animated: false });

    scrollToEndSpy.mockClear();

    act(() => {
      scrollView.props.onContentSizeChange?.(320, 1200);
    });

    expect(scrollToEndSpy).toHaveBeenCalledWith({ animated: false });
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
