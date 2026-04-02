type ReturnRequestTone = 'danger' | 'muted' | 'neutral' | 'success' | 'warning';

export type ReturnRequestStatusCopy = {
  description: string;
  label: string;
  tone: ReturnRequestTone;
};

const STATUS_COPY: Record<string, ReturnRequestStatusCopy> = {
  cancelled: {
    description: '本次归还请求已取消，图书仍按当前借阅状态继续保留。',
    label: '归还请求已取消',
    tone: 'muted',
  },
  completed: {
    description: '馆内已完成确认与入库，本次归还流程已经结束。',
    label: '归还已完成',
    tone: 'success',
  },
  created: {
    description: '馆内已收到你的归还申请，接下来会安排确认与入库处理。',
    label: '已发起归还请求',
    tone: 'warning',
  },
  pending: {
    description: '归还请求正在等待馆内确认，请稍后查看最新处理结果。',
    label: '等待馆内确认',
    tone: 'warning',
  },
  rejected: {
    description: '馆内暂时未能处理这次归还申请，请根据提示重新发起或联系馆员。',
    label: '归还请求未通过',
    tone: 'danger',
  },
};

export function describeReturnRequestStatus(status: string | null | undefined): ReturnRequestStatusCopy {
  if (!status) {
    return {
      description: '当前归还请求正在处理中，请稍后查看最新进展。',
      label: '处理中',
      tone: 'neutral',
    };
  }

  return (
    STATUS_COPY[status] ?? {
      description: '当前归还请求正在处理中，请稍后查看最新进展。',
      label: '处理中',
      tone: 'neutral',
    }
  );
}
