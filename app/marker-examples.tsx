import React from 'react';
import { Text, View } from 'react-native';

import { MarkerHighlightText, type MarkerHighlightTone } from '@/components/base/marker-highlight-text';
import { SectionTitle } from '@/components/base/section-title';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';

const highlightExamples: readonly {
  description: string;
  highlight: string;
  text: string;
  title: string;
  tone?: MarkerHighlightTone;
  toneLabel: string;
}[] = [
  {
    description: '默认蓝色块状 marker，适合强调一句里的关键词。',
    highlight: '机器学习从零到一',
    text: '先借《机器学习从零到一》，今晚直接开始。',
    title: '蓝色课程名',
    tone: 'blue',
    toneLabel: 'highlight',
  },
  {
    description: '绿色更适合偏积极、完成感更强的句子。',
    highlight: '直接开始',
    text: '把配送、借阅和学习动作排好后，就能直接开始。',
    title: '绿色行动词',
    tone: 'green',
    toneLabel: 'highlight',
  },
  {
    description: '红色适合提醒、截止时间和风险信息。',
    highlight: '今晚 21:00 前',
    text: '这本书需要在今晚 21:00 前处理续借。',
    title: '红色提醒',
    tone: 'red',
    toneLabel: 'highlight',
  },
] as const;

const underlineExamples: readonly {
  description: string;
  highlight: string;
  text: string;
  title: string;
  tone?: MarkerHighlightTone;
  toneLabel: string;
}[] = [
  {
    description: '蓝色更适合信息提示和轻一点的说明语气。',
    highlight: '配送到座',
    text: '这本书支持配送到座，适合你下课后直接开始。',
    title: '蓝色信息',
    tone: 'blue',
    toneLabel: 'underline',
  },
  {
    description: '更接近你想要的底部手绘线，适合强调时长和数字。',
    highlight: '35 分钟',
    text: '预计 35 分钟可以完成一轮预习。',
    title: '黄色时长',
    tone: 'yellow',
    toneLabel: 'underline',
  },
  {
    description: '橙色下划线更像手写 marker，适合动作提示。',
    highlight: '最短路径',
    text: '把今晚要处理的书、配送和学习动作排成一条最短路径。',
    title: '橙色路径',
    tone: 'orange',
    toneLabel: 'underline',
  },
  {
    description: '绿色下划线适合表达完成感、推进感和积极反馈。',
    highlight: '已经准备好',
    text: '推荐书单、配送状态和练习题已经准备好，可以直接继续。',
    title: '绿色完成',
    tone: 'green',
    toneLabel: 'underline',
  },
  {
    description: '红色下划线更适合提醒、截止时间和风险信息。',
    highlight: '今天 21:00 前',
    text: '如果还想继续用这本书，记得在今天 21:00 前处理续借。',
    title: '红色提醒',
    tone: 'red',
    toneLabel: 'underline',
  },
] as const;

export default function MarkerExamplesRoute() {
  const { theme } = useAppTheme();

  return (
    <PageShell insetBottom={96} mode="workspace">
      <Text
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 14,
          lineHeight: 21,
        }}>
        这里集中放当前项目里可直接复用的 marker 文本样式，方便你快速比较
        {' '}
        `highlight`
        、
        `underline`
        、不同色调和自定义颜色。
      </Text>
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="块状高亮" />
        <View style={{ gap: theme.spacing.md }}>
          {highlightExamples.map((example) => (
            <View
              key={example.title}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              }}>
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    color: theme.colors.primaryStrong,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  {example.toneLabel}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                  }}>
                  {example.title}
                </Text>
              </View>
              <MarkerHighlightText
                highlight={example.highlight}
                highlightTone={example.tone}
                text={example.text}
                textStyle={{
                  color: theme.colors.text,
                  ...theme.typography.medium,
                  fontSize: 16,
                  lineHeight: 24,
                }}
              />
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.body,
                  fontSize: 13,
                  lineHeight: 20,
                }}>
                {example.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="底部下划线" />
        <View style={{ gap: theme.spacing.md }}>
          {underlineExamples.map((example) => (
            <View
              key={example.title}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              }}>
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    color: theme.colors.warning,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  {example.toneLabel}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                  }}>
                  {example.title}
                </Text>
              </View>
              <MarkerHighlightText
                highlight={example.highlight}
                highlightTone={example.tone}
                text={example.text}
                textStyle={{
                  color: theme.colors.text,
                  ...theme.typography.medium,
                  fontSize: 16,
                  lineHeight: 24,
                }}
                variant="underline"
              />
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.body,
                  fontSize: 13,
                  lineHeight: 20,
                }}>
                {example.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="自定义颜色" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
          }}>
          <Text
            style={{
              color: theme.colors.knowledgeStrong,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            highlightColor
          </Text>
          <MarkerHighlightText
            highlight="今晚最该开始的一章"
            highlightColor="#D46A4A"
            text="先把今晚最该开始的一章标出来，再决定借哪一本。"
            textStyle={{
              color: theme.colors.text,
              ...theme.typography.medium,
              fontSize: 16,
              lineHeight: 24,
            }}
          />
          <MarkerHighlightText
            highlight="直接开始"
            highlightColor="#5E9E6F"
            text="如果你更喜欢细一点的强调，也可以把直接开始换成绿色下划线。"
            textStyle={{
              color: theme.colors.text,
              ...theme.typography.medium,
              fontSize: 16,
              lineHeight: 24,
            }}
            variant="underline"
          />
          <Text
            style={{
              color: theme.colors.knowledgeStrong,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            自定义下划线
          </Text>
          <MarkerHighlightText
            highlight="馆内快取"
            highlightColor="#5A86C8"
            text="如果你想要更冷一点的语气，也可以把馆内快取做成自定义蓝色下划线。"
            textStyle={{
              color: theme.colors.text,
              ...theme.typography.medium,
              fontSize: 16,
              lineHeight: 24,
            }}
            variant="underline"
          />
        </View>
      </View>
    </PageShell>
  );
}
