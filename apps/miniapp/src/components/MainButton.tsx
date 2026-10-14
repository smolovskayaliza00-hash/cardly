import { useResolvedTheme } from '../lib/theme';
import { useTelegramMainButton } from '../lib/useTelegramButtons';
import { Button } from './ui';

const GOLD = { dark: { bg: '#D4B072', fg: '#1A1408' }, light: { bg: '#A8823F', fg: '#FFFFFF' } };

/**
 * Главная кнопка экрана.
 * В Telegram — нативная MainButton (внизу экрана, с индикатором загрузки).
 * В браузере — собственная закреплённая кнопка с тем же поведением.
 */
export function MainButton(props: {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  visible?: boolean;
}) {
  const theme = useResolvedTheme();
  const native = useTelegramMainButton({ ...props, color: GOLD[theme].bg, textColor: GOLD[theme].fg });
  if (native || props.visible === false) return null;

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[520px] bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-6">
      <Button size="lg" block onClick={props.onClick} disabled={props.disabled} loading={props.loading}>
        {props.text}
      </Button>
    </div>
  );
}

/** Отступ снизу под закреплённую кнопку, чтобы контент не перекрывался */
export function MainButtonSpacer() {
  return <div className="h-28" />;
}
