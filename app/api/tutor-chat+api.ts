import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';

import type { TutorProfile, TutorSession } from '@/lib/api/types';
import {
  buildTutorBookSummaryMarkdown,
  buildNextTutorSession,
  buildTutorAssistantReply,
  chunkText,
  detectTutorStepSuccess,
  extractTextFromUIMessage,
  type TutorChatEvaluationPart,
  TUTOR_ONE_TIME_DEMO_MODE,
  type TutorUIMessage,
} from '@/lib/tutor/mock-chat';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TutorChatRequestBody = {
  demoMode?: string;
  messages: UIMessage[];
  profile: TutorProfile;
  session: TutorSession;
};

export async function POST(request: Request) {
  const body = (await request.json()) as TutorChatRequestBody;
  const profile = body.profile;
  const session = body.session;

  if (!profile || !session) {
    return Response.json({ error: '缺少导学本上下文。' }, { status: 400 });
  }

  const userText = extractTextFromUIMessage(body.messages.at(-1) ?? {});
  const currentStep = profile.curriculum[session.currentStepIndex] ?? null;
  const shouldRunBookSummaryDemo = body.demoMode === TUTOR_ONE_TIME_DEMO_MODE;
  const detected = detectTutorStepSuccess(currentStep, userText);
  const evaluation: TutorChatEvaluationPart = {
    confidence: detected.confidence,
    meetsCriteria: detected.meetsCriteria,
    reasoning: detected.meetsCriteria
      ? '回答已经覆盖当前步骤的关键线索。'
      : '回答还偏短，可以继续补充概念、例子或判断依据。',
    stepIndex: session.currentStepIndex,
  };
  const assistantText = shouldRunBookSummaryDemo
    ? buildTutorBookSummaryMarkdown(profile, session)
    : buildTutorAssistantReply(profile, session, currentStep, evaluation);
  const nextSession = buildNextTutorSession(session, profile, evaluation);
  const textPartId = `assistant-${Date.now()}`;

  const stream = createUIMessageStream<TutorUIMessage>({
    execute: async ({ writer }) => {
      if (shouldRunBookSummaryDemo) {
        writer.write({
          data: {
            label: '思考中',
            phase: 'thinking',
          },
          transient: true,
          type: 'data-tutorThinking',
        });

        await sleep(1100);

        writer.write({
          data: {
            label: '思考中',
            phase: 'revealing',
          },
          transient: true,
          type: 'data-tutorThinking',
        });

        writer.write({ id: textPartId, type: 'text-start' });

        for (const chunk of chunkText(assistantText, 10)) {
          await sleep(42);
          writer.write({
            delta: chunk,
            id: textPartId,
            type: 'text-delta',
          });
        }

        writer.write({ id: textPartId, type: 'text-end' });
        writer.write({
          data: {
            label: '思考完成',
            phase: 'done',
          },
          transient: true,
          type: 'data-tutorThinking',
        });

        return;
      }

      writer.write({
        data: {
          label: '导师正在整理你的回答…',
          tone: 'info',
        },
        transient: true,
        type: 'data-tutorStatus',
      });

      writer.write({ id: textPartId, type: 'text-start' });

      for (const chunk of chunkText(assistantText, 16)) {
        await sleep(18);
        writer.write({
          delta: chunk,
          id: textPartId,
          type: 'text-delta',
        });
      }

      writer.write({ id: textPartId, type: 'text-end' });

      writer.write({
        data: evaluation,
        transient: true,
        type: 'data-tutorEvaluation',
      });

      writer.write({
        data: nextSession,
        transient: true,
        type: 'data-tutorSession',
      });

      writer.write({
        data: {
          label: evaluation.meetsCriteria ? '这一轮已推进到下一步' : '这一轮保留在当前步骤',
          tone: evaluation.meetsCriteria ? 'success' : 'warning',
        },
        transient: true,
        type: 'data-tutorStatus',
      });
    },
  });

  return createUIMessageStreamResponse({
    headers: {
      'Content-Encoding': 'none',
      'Content-Type': 'application/octet-stream',
    },
    stream,
  });
}
