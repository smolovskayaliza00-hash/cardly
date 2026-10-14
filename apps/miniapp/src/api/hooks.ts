import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CardLimits, DemoResetMode, IssueCardRequest, TopUpRequest, TransactionsQuery } from '@cardapp/shared';
import { api } from './index';

export const qk = {
  me: ['me'] as const,
  tariffs: ['tariffs'] as const,
  methods: ['topup-methods'] as const,
  cards: ['cards'] as const,
  card: (id: string) => ['cards', id] as const,
  transactions: (q: TransactionsQuery = {}) => ['transactions', q] as const,
  topUp: (id: string) => ['topups', id] as const,
};

export const useMe = () =>
  useQuery({
    queryKey: qk.me,
    queryFn: api.getMe,
    refetchInterval: (q) => (q.state.data?.kycStatus === 'pending' ? 1_500 : false),
  });

export const useTariffs = () => useQuery({ queryKey: qk.tariffs, queryFn: api.getTariffs, staleTime: Infinity });
export const useTopUpMethods = () =>
  useQuery({ queryKey: qk.methods, queryFn: api.getTopUpMethods, staleTime: Infinity });

export const useCards = () =>
  useQuery({
    queryKey: qk.cards,
    queryFn: api.getCards,
    refetchInterval: (q) => (q.state.data?.some((c) => c.status === 'issuing') ? 1_000 : false),
  });

export const useCard = (id: string) =>
  useQuery({
    queryKey: qk.card(id),
    queryFn: () => api.getCard(id),
    refetchInterval: (q) => (q.state.data?.status === 'issuing' ? 1_000 : false),
  });

export const useTransactions = (q: TransactionsQuery = {}) =>
  useQuery({ queryKey: qk.transactions(q), queryFn: () => api.getTransactions(q) });

export const useTopUp = (id: string) =>
  useQuery({
    queryKey: qk.topUp(id),
    queryFn: () => api.getTopUp(id),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'awaiting_payment' || s === 'processing' ? 1_200 : false;
    },
  });

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useIssueCard() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (req: IssueCardRequest) => api.issueCard(req), onSuccess: invalidate });
}

export function useCardAction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'freeze' | 'unfreeze' | 'close' }) =>
      action === 'freeze' ? api.freezeCard(id) : action === 'unfreeze' ? api.unfreezeCard(id) : api.closeCard(id),
    onSuccess: invalidate,
  });
}

export function useUpdateLimits() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, limits }: { id: string; limits: CardLimits }) => api.updateLimits(id, limits),
    onSuccess: invalidate,
  });
}

export const useRevealCard = () => useMutation({ mutationFn: (id: string) => api.revealCard(id) });

export function useCreateTopUp() {
  return useMutation({ mutationFn: (req: TopUpRequest) => api.createTopUp(req) });
}

export function useSimulatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.simulateTopUpPayment(id),
    onSuccess: (t) => qc.setQueryData(qk.topUp(t.id), t),
  });
}

export function useStartKyc() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.startKyc, onSuccess: (u) => qc.setQueryData(qk.me, u) });
}

export function useSetSubscription() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (active: boolean) => api.setSubscription(active), onSuccess: invalidate });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: DemoResetMode) => api.resetDemo(mode),
    onSuccess: () => qc.resetQueries(),
  });
}
