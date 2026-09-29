import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { addressApi, notificationsApi, profileApi, reviewsApi, wishlistApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/queryKeys';
import { getErrorMessage } from '../../lib/api/client';
import { useAuthStore } from '../../store/authStore';
import { useGuestStore } from '../../store/guestStore';

export const useProfile = () =>
  useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => (await profileApi.get()).data.data,
    enabled: useAuthStore.getState().isAuthenticated(),
    staleTime: 60_000,
  });

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: { username?: string; email?: string }) => profileApi.update(payload),
    onSuccess: (response) => {
      setUser(response.data.data);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update your profile')),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) => profileApi.changePassword(payload),
    onSuccess: () => toast.success('Password updated'),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not change your password')),
  });

export const useAddresses = () =>
  useQuery({
    queryKey: queryKeys.addresses,
    queryFn: async () => (await addressApi.list()).data.data,
    staleTime: 60_000,
  });

export const useAddressMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses });

  const create = useMutation({
    mutationFn: (payload: Parameters<typeof addressApi.create>[0]) => addressApi.create(payload),
    onSuccess: () => {
      invalidate();
      toast.success('Address saved');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save that address')),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof addressApi.update>[1] }) =>
      addressApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Address updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update that address')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => addressApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Address deleted');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete that address')),
  });

  const setDefault = useMutation({
    mutationFn: (id: number) => addressApi.setDefault(id),
    onSuccess: invalidate,
  });

  return { create, update, remove, setDefault };
};

/** Wishlist: server-backed for members, local for guests. */
export const useWishlist = () => {
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const guest = useGuestStore();

  const query = useQuery({
    queryKey: queryKeys.wishlist,
    queryFn: async () => (await wishlistApi.list()).data.data,
    enabled: isAuthed,
    staleTime: 30_000,
  });

  const ids = isAuthed ? (query.data ?? []).map((entry) => entry.product.id) : guest.wishlist;

  return {
    ids,
    products: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isGuest: !isAuthed,
  };
};

export const useWishlistMutations = () => {
  const queryClient = useQueryClient();
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const guest = useGuestStore();

  return useMutation({
    mutationFn: async (productId: number) => {
      if (!isAuthed) {
        guest.toggleWishlist(productId);
        return null;
      }
      return (await wishlistApi.toggle(productId)).data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist });
      if (result?.message) toast.success(result.message);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update your wishlist')),
  });
};

export const useNotifications = () =>
  useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const response = await notificationsApi.list();
      return { notifications: response.data.data, unread: response.data.unread };
    },
    staleTime: 15_000,
  });

export const useNotificationMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications });

  const markRead = useMutation({ mutationFn: (id: number) => notificationsApi.markRead(id), onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => notificationsApi.remove(id), onSuccess: invalidate });
  const clearAll = useMutation({ mutationFn: () => notificationsApi.clearAll(), onSuccess: invalidate });

  return { markRead, markAllRead, remove, clearAll };
};

export const useMyReviews = () =>
  useQuery({
    queryKey: queryKeys.myReviews,
    queryFn: async () => (await reviewsApi.mine()).data.data,
  });

export const useReviewMutations = () => {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: { productId: number; rating: number; title?: string; comment?: string }) =>
      reviewsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.myReviews });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      toast.success('Thanks for the review!');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save your review')),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { rating?: number; title?: string; comment?: string } }) =>
      reviewsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.myReviews });
      toast.success('Review updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update your review')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => reviewsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.myReviews });
      toast.success('Review deleted');
    },
  });

  return { create, update, remove };
};
