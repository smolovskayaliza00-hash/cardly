import clsx from 'clsx';
import { motion } from 'framer-motion';
import { CreditCard, History, Home, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { haptic } from '../lib/telegram';

const TABS = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/cards', label: 'Карты', icon: CreditCard },
  { to: '/history', label: 'История', icon: History },
  { to: '/profile', label: 'Профиль', icon: UserRound },
];

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[520px] border-t border-line bg-bg/85 px-3 pt-2 backdrop-blur-xl">
      <div className="flex">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => haptic.selection()}
            className="relative flex flex-1 flex-col items-center gap-1 py-1"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute top-0 h-8 w-14 rounded-full bg-gold/12"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className={clsx('relative mt-1 size-[22px]', isActive ? 'text-gold' : 'text-muted')} strokeWidth={2} />
                <span className={clsx('text-[11px] font-semibold', isActive ? 'text-ink' : 'text-muted')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
