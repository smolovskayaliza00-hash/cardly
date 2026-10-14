import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Toaster } from '../components/Toast';
import { useApplyTheme } from '../lib/theme';
import { useTelegramBackButton } from '../lib/useTelegramButtons';
import { useUi } from '../store/ui';

const ROOT_TABS = ['/', '/cards', '/history', '/profile'];

export function AppShell() {
  useApplyTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const onboarded = useUi((s) => s.onboarded);
  const isRoot = ROOT_TABS.includes(location.pathname);

  useTelegramBackButton(!isRoot, () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (!onboarded) return <Navigate to="/onboarding" replace />;

  return (
    <div className="app-glow mx-auto min-h-dvh max-w-[520px]">
      <Toaster />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={isRoot ? 'pb-28' : 'pb-6'}
      >
        {outlet}
      </motion.main>
      {isRoot && <BottomNav />}
    </div>
  );
}
