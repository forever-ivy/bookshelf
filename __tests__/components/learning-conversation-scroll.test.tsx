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

  const emitScrollLayout = (scrollView: ReturnType<typeof screen.getByTestId>, height: number) => {
    act(() => {
      scrollView.props.onLayout?.({
        nativeEvent: {
          layout: {
            height,
            width: 320,
            x: 0,
            y: 0,
          },
        },
      });
    });
  };

  const emitContentLayout = (height: number) => {
    const content = screen.getByTestId('learning-conversation-scroll-content');

    act(() => {
      content.props.onLayout?.({
        nativeEvent: {
          layout: {
            height,
            width: 320,
            x: 0,
            y: 0,
          },
        },
      });
    });
  };

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

    emitScrollLayout(scrollView, 640);
    emitContentLayout(360);

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

    emitScrollLayout(scrollView, 640);
    emitContentLayout(960);

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

    emitScrollLayout(scrollView, 640);
    emitContentLayout(960);

    expect(scrollToSpy).toHaveBeenCalledWith({ animated: false, y: 208 });
    expect(scrollToEndSpy).not.toHaveBeenCalled();
  });

  it('lifts the content when the anchor needs more room than scrolling alone can provide', () => {
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

    emitScrollLayout(scrollView, 640);
    emitContentLayout(720);

    expect(scrollToSpy).toHaveBeenLastCalledWith({ animated: false, y: 80 });
    expect(scrollView.props.bounces).toBe(false);
    expect(screen.getByTestId('learning-conversation-scroll-content').props.style).toEqual({
      transform: [{ translateY: -128 }],
    });
  });

  it('keeps the focus anchor pinned while the lift shrinks away as content grows', () => {
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

    emitScrollLayout(scrollView, 640);
    emitContentLayout(1500);

    expect(scrollToSpy).toHaveBeenLastCalledWith({ animated: false, y: 860 });
    expect(screen.getByTestId('learning-conversation-scroll-content').props.style).toEqual({
      transform: [{ translateY: -468 }],
    });

    emitContentLayout(2200);

    expect(scrollToSpy).toHaveBeenCalledTimes(2);
    expect(scrollToSpy).toHaveBeenLastCalledWith({ animated: false, y: 1328 });
    expect(screen.getByTestId('learning-conversation-scroll-content').props.style).toBeUndefined();
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

    emitScrollLayout(scrollView, 640);
    emitContentLayout(960);

    expect(scrollToSpy).toHaveBeenCalledWith({ animated: false, y: 208 });

    scrollToSpy.mockClear();
    scrollToEndSpy.mockClear();

    act(() => {
      emitKeyboardEvent('keyboardWillShow');
      jest.advanceTimersByTime(100);
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(scrollToEndSpy).not.toHaveBeenCalled();

    emitContentLayout(1200);

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

    emitScrollLayout(scrollView, 640);
    emitContentLayout(960);

    scrollToEndSpy.mockClear();

    act(() => {
      emitKeyboardEvent('keyboardWillShow');
      jest.advanceTimersByTime(100);
    });

    expect(scrollToEndSpy).toHaveBeenCalledWith({ animated: false });

    scrollToEndSpy.mockClear();

    emitContentLayout(1200);

    expect(scrollToEndSpy).toHaveBeenCalledWith({ animated: false });
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
