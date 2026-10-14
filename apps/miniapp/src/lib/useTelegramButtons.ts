import { useEffect, useRef } from 'react';
import { isTelegram, tg } from './telegram';

/** Показывает нативную кнопку «Назад» Telegram, пока компонент смонтирован. */
export function useTelegramBackButton(visible: boolean, onBack: () => void) {
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    const app = tg;
    if (!app || !isTelegram) return;
    const cb = () => handler.current();
    if (visible) {
      app.BackButton.onClick(cb);
      app.BackButton.show();
    } else {
      app.BackButton.hide();
    }
    return () => {
      app.BackButton.offClick(cb);
    };
  }, [visible]);
}

export interface MainButtonOptions {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  visible?: boolean;
  color?: string;
  textColor?: string;
}

/** Управляет нативной MainButton Telegram. Возвращает false, если её нет (браузер). */
export function useTelegramMainButton(opts: MainButtonOptions): boolean {
  const handler = useRef(opts.onClick);
  handler.current = opts.onClick;
  const { text, disabled, loading, visible = true, color, textColor } = opts;

  useEffect(() => {
    const app = tg;
    if (!app || !isTelegram) return;
    const cb = () => handler.current();
    app.MainButton.onClick(cb);
    return () => {
      app.MainButton.offClick(cb);
      app.MainButton.hideProgress();
      app.MainButton.hide();
    };
  }, []);

  useEffect(() => {
    if (!tg || !isTelegram) return;
    tg.MainButton.setParams({
      text,
      color,
      text_color: textColor,
      is_active: !disabled && !loading,
      is_visible: visible,
    });
    if (loading) tg.MainButton.showProgress(false);
    else tg.MainButton.hideProgress();
  }, [text, disabled, loading, visible, color, textColor]);

  return isTelegram;
}
