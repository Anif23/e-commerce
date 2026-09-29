import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { supportApi, todosApi, type Query } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/queryKeys';
import { getErrorMessage } from '../../lib/api/client';
import type { ApiList, SupportTicket, Todo } from '../../types/api';

export const useSupportTickets = (params: Query = {}) =>
  useQuery<ApiList<SupportTicket>>({
    queryKey: queryKeys.supportTickets(params),
    queryFn: async () => (await supportApi.list(params)).data,
  });

export const useSupportTicket = (id?: number) =>
  useQuery({
    queryKey: queryKeys.supportTicket(id ?? 0),
    queryFn: async () => (await supportApi.detail(id!)).data.data,
    enabled: Boolean(id),
    refetchInterval: 20_000,
  });

export const useSupportFaq = () =>
  useQuery<{ question: string; answer: string }[]>({
    queryKey: queryKeys.supportFaq,
    queryFn: async () => (await supportApi.faq()).data.data,
    staleTime: 30 * 60_000,
  });

export const useSupportMutations = () => {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: { subject: string; message: string; orderId?: number; priority?: string }) =>
      supportApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Support request sent');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not send that request')),
  });

  const reply = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => supportApi.reply(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
      toast.success('Message sent');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not send that message')),
  });

  const close = useMutation({
    mutationFn: (id: number) => supportApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket closed');
    },
  });

  return { create, reply, close };
};

/* --------------------------------- todos --------------------------------- */

export const useTodos = () =>
  useQuery<Todo[]>({
    queryKey: queryKeys.todos,
    queryFn: async () => (await todosApi.list()).data.data,
  });

export const useTodoMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.todos });

  const create = useMutation({
    mutationFn: (payload: { title: string; priority?: number }) => todosApi.create(payload),
    onSuccess: invalidate,
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add that todo')),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { title?: string; completed?: boolean; priority?: number } }) =>
      todosApi.update(id, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => todosApi.remove(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
};
