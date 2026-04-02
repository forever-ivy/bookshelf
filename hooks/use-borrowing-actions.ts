import React from 'react';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';

import type { BorrowOrderView } from '@/lib/api/types';
import { getLibraryErrorMessage } from '@/lib/api/client';
import {
  useRenewBorrowOrderMutation,
  useReturnRequestMutation,
} from '@/hooks/use-library-app-data';

export function useBorrowingActions() {
  const router = useRouter();
  const renewMutation = useRenewBorrowOrderMutation();
  const returnRequestMutation = useReturnRequestMutation();

  const handleCardAction = React.useCallback(
    async (order: BorrowOrderView) => {
      if (order.renewable) {
        try {
          await renewMutation.mutateAsync(order.id);
          toast.success('续借成功');
        } catch (error) {
          toast.error(getLibraryErrorMessage(error, '续借失败，请稍后重试。'));
        }
        return;
      }

      if (order.returnable) {
        try {
          await returnRequestMutation.mutateAsync(order.id);
          toast.success('归还请求已提交');
        } catch (error) {
          toast.error(getLibraryErrorMessage(error, '归还请求提交失败，请稍后重试。'));
        }
        return;
      }

      router.push(`/orders/${order.id}`);
    },
    [renewMutation, returnRequestMutation, router]
  );

  return {
    handleCardAction,
  };
}
