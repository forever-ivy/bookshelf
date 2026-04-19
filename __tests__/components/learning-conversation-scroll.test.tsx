import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ScrollView, Text } from 'react-native';

import { LearningConversationScroll } from '@/components/learning/learning-conversation-scroll';

describe('LearningConversationScroll', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  let scrollToEndSpy: jest.SpyInstance;

  beforeEach(() => {
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof global.requestAnimationFrame;

    scrollToEndSpy = jest.spyOn(ScrollView.prototype as ScrollView, 'scrollToEnd').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    scrollToEndSpy.mockRestore();
  });

  afterAll(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('scrolls to the latest message when the conversation lays out and grows', () => {
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
    expect(scrollToEndSpy).toHaveBeenCalledTimes(2);

    view.unmount();
  });
});
