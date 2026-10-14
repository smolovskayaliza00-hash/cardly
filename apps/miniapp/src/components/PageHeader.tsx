import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { isTelegram } from '../lib/telegram';

/**
 * Заголовок экрана. Внутри Telegram «Назад» — нативная кнопка в шапке клиента,
 * в браузере рисуем свою стрелку.
 */
export function PageHeader({ title, back, right }: { title?: ReactNode; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate();
  const showBack = back && !isTelegram;
  return (
    <header className="flex min-h-12 items-center gap-2 px-4 pt-3 pb-2">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-ink active:bg-surface-2"
          aria-label="Назад"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}
      {title && <h1 className="font-display flex-1 truncate text-[28px] font-bold tracking-tight">{title}</h1>}
      {!title && <div className="flex-1" />}
      {right}
    </header>
  );
}
