import * as React from 'react';
import {
  Pressable,
  TextInput,
  View,
  type ColorSchemeName,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';

export type User = {
  _id: string | number;
  avatar?: string | number | React.ReactElement | null;
  name?: string;
};

export interface IMessage {
  _id: string | number;
  createdAt: Date | number;
  image?: string;
  pending?: boolean;
  quickReplies?: unknown;
  received?: boolean;
  sent?: boolean;
  system?: boolean;
  text: string;
  user: User;
  video?: string;
}

export type MessageProps<TMessage extends IMessage = IMessage> = {
  currentMessage?: TMessage;
  nextMessage?: TMessage;
  position?: 'left' | 'right';
  previousMessage?: TMessage;
  user?: User;
};

export type ComposerProps = {
  composerHeight?: number;
  placeholder?: string;
  text?: string;
  textInputProps?: TextInputProps;
  textInputStyle?: StyleProp<TextStyle>;
};

export type SendProps<TMessage extends IMessage = IMessage> = {
  children?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  onSend?: (
    messages: Partial<TMessage> | Partial<TMessage>[],
    shouldResetInputToolbar?: boolean
  ) => void;
  sendButtonProps?: Partial<TouchableOpacityProps>;
  text?: string;
  user?: User;
};

export type InputToolbarProps<TMessage extends IMessage = IMessage> = {
  children?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  primaryStyle?: StyleProp<ViewStyle>;
  renderAccessory?: () => React.ReactNode;
  renderComposer?: (props: ComposerProps) => React.ReactNode;
  renderSend?: (props: SendProps<TMessage>) => React.ReactNode;
};

export type GiftedChatProps<TMessage extends IMessage = IMessage> = {
  colorScheme?: ColorSchemeName | 'light' | 'dark';
  isAlignedTop?: boolean;
  isInverted?: boolean;
  isSendButtonAlwaysVisible?: boolean;
  keyboardAvoidingViewProps?: Record<string, unknown>;
  listProps?: Record<string, unknown>;
  messages?: TMessage[];
  messagesContainerStyle?: StyleProp<ViewStyle>;
  minComposerHeight?: number;
  minInputToolbarHeight?: number;
  onSend?: (messages: Partial<TMessage>[], shouldResetInputToolbar?: boolean) => void;
  renderAccessory?: () => React.ReactNode;
  renderAvatar?: null | ((props: MessageProps<TMessage>) => React.ReactNode);
  renderChatEmpty?: () => React.ReactNode;
  renderComposer?: (props: ComposerProps) => React.ReactNode;
  renderDay?: (props: MessageProps<TMessage>) => React.ReactNode;
  renderInputToolbar?: (props: InputToolbarProps<TMessage>) => React.ReactNode;
  renderMessage?: (props: MessageProps<TMessage>) => React.ReactElement;
  renderSend?: (props: SendProps<TMessage>) => React.ReactNode;
  renderTime?: (props: MessageProps<TMessage>) => React.ReactNode;
  scrollToBottom?: boolean;
  text?: string;
  textInputProps?: TextInputProps;
  user?: User;
};

export function Composer(props: ComposerProps) {
  return React.createElement(TextInput, {
    ...props.textInputProps,
    placeholder: props.placeholder,
    value: props.text,
  });
}

export function GiftedChat<TMessage extends IMessage = IMessage>(
  _props: GiftedChatProps<TMessage>
) {
  return React.createElement(View);
}

export function InputToolbar<TMessage extends IMessage = IMessage>(
  props: InputToolbarProps<TMessage>
) {
  return React.createElement(View, null, props.children);
}

export function Send<TMessage extends IMessage = IMessage>(props: SendProps<TMessage>) {
  return React.createElement(
    Pressable,
    {
      onPress: () => props.onSend?.([{ text: String(props.text ?? '') } as Partial<TMessage>], true),
      ...props.sendButtonProps,
    },
    props.children
  );
}
