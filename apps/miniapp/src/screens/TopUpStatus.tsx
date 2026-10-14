import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, Loader2, Smartphone, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TOPUP_METHODS, formatMoney } from '@cardapp/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useSimulatePayment, useTopUp } from '../api/hooks';
import { FakeQr } from '../components/FakeQr';
import { MainButton, MainButtonSpacer } from '../components/MainButton';
import { PageHeader } from '../components/PageHeader';
import { Button, Panel, Skeleton } from '../components/ui';
import { haptic } from '../lib/telegram';
import { toast } from '../store/ui';

function useCountdown(iso?: string) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setLeft(Math.max(0, Date.parse(iso) - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  const m = Math.floor(left / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TopUpStatus() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: t } = useTopUp(id);
  const simulate = useSimulatePayment();
  const countdown = useCountdown(t?.expiresAt);

  useEffect(() => {
    if (t?.status === 'succeeded') {
      haptic.success();
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  }, [t?.status, qc]);

  if (!t) {
    return (
      <div className="px-5 pt-16">
        <Skeleton className="mx-auto size-[220px] rounded-2xl" />
      </div>
    );
  }

  const method = TOPUP_METHODS.find((m) => m.id === t.method);
  const cur = t.quote.currency;

  return (
    <div>
      <PageHeader back />
      <AnimatePresence mode="wait">
        <motion.div
          key={t.status}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center px-6 text-center"
        >
          {t.status === 'awaiting_payment' && (
            <>
              <h1 className="font-display text-[26px] font-bold tracking-tight">
                Оплатите {formatMoney(t.quote.amountRubMinor, 'RUB')}
              </h1>
              <p className="mt-1 text-[15px] text-muted">
                {t.method === 'sbp' ? 'Отсканируйте QR в приложении банка' : `Подтвердите оплату в ${method?.title}`}
              </p>
              <div className="relative mt-6 rounded-3xl bg-white p-4 shadow-2xl">
                <FakeQr seed={t.id} size={210} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rotate-[-18deg] rounded-lg border-4 border-danger/80 bg-white/85 px-3 py-1 text-[22px] font-black tracking-widest text-danger/90">
                    ДЕМО
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[14px] text-muted">
                <Clock className="size-4" /> Действует ещё {countdown}
              </div>
              <Button
                variant="surface"
                className="mt-5"
                icon={<Smartphone className="size-4" />}
                onClick={() => toast('В демо-режиме переход в банк недоступен')}
              >
                Открыть приложение банка
              </Button>
              <Panel className="mt-6 w-full divide-y divide-line text-left">
                <Row label="Способ" value={method?.title ?? ''} />
                <Row label="Комиссия" value={formatMoney(t.quote.feeRubMinor, 'RUB')} />
                <Row label="Зачислим" value={`≈ ${formatMoney(t.quote.creditedMinor, cur)}`} />
              </Panel>
              <p className="mt-4 text-[12px] leading-snug text-faint">
                Это прототип: QR-код декоративный, оплатить его невозможно. Нажмите кнопку ниже, чтобы симулировать
                поступление платежа.
              </p>
            </>
          )}

          {t.status === 'processing' && (
            <div className="pt-20">
              <Loader2 className="mx-auto size-14 animate-spin text-gold" />
              <h1 className="font-display mt-6 text-[26px] font-bold tracking-tight">Ждём подтверждение банка</h1>
              <p className="mt-2 text-[15px] text-muted">Обычно это занимает несколько секунд</p>
            </div>
          )}

          {t.status === 'succeeded' && (
            <div className="pt-16">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                className="mx-auto flex size-24 items-center justify-center rounded-full bg-success/15"
              >
                <CheckCircle2 className="size-14 text-success" />
              </motion.div>
              <h1 className="font-display mt-6 text-[26px] font-bold tracking-tight">Карта пополнена</h1>
              <div className="font-display tabular mt-2 text-[40px] font-bold text-success">
                +{formatMoney(t.quote.creditedMinor, cur)}
              </div>
              <p className="mt-1 text-[15px] text-muted">Списано {formatMoney(t.quote.amountRubMinor, 'RUB')}</p>
            </div>
          )}

          {(t.status === 'expired' || t.status === 'failed') && (
            <div className="pt-16">
              <XCircle className="mx-auto size-16 text-danger" />
              <h1 className="font-display mt-6 text-[26px] font-bold tracking-tight">
                {t.status === 'expired' ? 'Время оплаты истекло' : 'Платёж не прошёл'}
              </h1>
              <p className="mt-2 text-[15px] text-muted">Создайте новый платёж</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <MainButtonSpacer />
      {t.status === 'awaiting_payment' && (
        <MainButton text="Симулировать оплату" onClick={() => simulate.mutate(t.id)} loading={simulate.isPending} />
      )}
      {t.status === 'processing' && <MainButton text="Обработка…" onClick={() => {}} loading />}
      {t.status === 'succeeded' && (
        <MainButton text="Готово" onClick={() => navigate(`/cards/${t.cardId}`, { replace: true })} />
      )}
      {(t.status === 'expired' || t.status === 'failed') && (
        <MainButton text="Попробовать снова" onClick={() => navigate(`/topup?cardId=${t.cardId}`, { replace: true })} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-[15px]">
      <span className="text-muted">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}
