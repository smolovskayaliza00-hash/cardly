import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ApiError } from '../api';
import { toast } from '../store/ui';
import { AppShell } from './AppShell';
import { Onboarding } from '../screens/Onboarding';
import { Home } from '../screens/Home';
import { Cards } from '../screens/Cards';
import { CardDetails } from '../screens/CardDetails';
import { IssueCard } from '../screens/IssueCard';
import { TopUp } from '../screens/TopUp';
import { TopUpStatus } from '../screens/TopUpStatus';
import { History } from '../screens/History';
import { Tariffs } from '../screens/Tariffs';
import { Profile } from '../screens/Profile';
import { Kyc } from '../screens/Kyc';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
    mutations: {
      onError: (e) => toast(e instanceof ApiError ? e.message : 'Что-то пошло не так', 'error'),
    },
  },
});

// Hash-роутинг: стабильно работает в Telegram WebView и на статическом хостинге
const router = createHashRouter([
  { path: '/onboarding', element: <Onboarding /> },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/cards', element: <Cards /> },
      { path: '/cards/:id', element: <CardDetails /> },
      { path: '/issue', element: <IssueCard /> },
      { path: '/topup', element: <TopUp /> },
      { path: '/topup/:id', element: <TopUpStatus /> },
      { path: '/history', element: <History /> },
      { path: '/tariffs', element: <Tariffs /> },
      { path: '/profile', element: <Profile /> },
      { path: '/kyc', element: <Kyc /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
