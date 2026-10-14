import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useToast } from '../store/ui';

export function Toaster() {
  const { message, tone, hide } = useToast();
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? XCircle : Info;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(env(safe-area-inset-top),12px)]">
      <AnimatePresence>
        {message && (
          <motion.button
            key={message}
            onClick={hide}
            initial={{ y: -40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            className="pointer-events-auto flex max-w-[440px] items-center gap-2.5 rounded-2xl border border-line bg-surface-2/95 px-4 py-3 text-left text-[14px] font-medium shadow-2xl backdrop-blur-xl"
          >
            <Icon
              className={clsx(
                'size-5 shrink-0',
                tone === 'success' ? 'text-success' : tone === 'error' ? 'text-danger' : 'text-gold',
              )}
            />
            {message}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
