import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, FileText, Loader2, ScanFace, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCards, useMe, useStartKyc } from '../api/hooks';
import { MainButton, MainButtonSpacer } from '../components/MainButton';
import { PageHeader } from '../components/PageHeader';
import { DemoBadge, Panel, Skeleton } from '../components/ui';

const STEPS = [
  { icon: FileText, title: 'Документ', text: 'Паспорт или ID-карта' },
  { icon: Camera, title: 'Фото документа', text: 'Разворот с фотографией' },
  { icon: ScanFace, title: 'Селфи', text: 'Проверка, что это вы' },
];

export function Kyc() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: cards } = useCards();
  const start = useStartKyc();

  if (!me) {
    return (
      <div className="px-5 pt-16">
        <Skeleton className="h-60 w-full rounded-3xl" />
      </div>
    );
  }

  const status = me.kycStatus;

  return (
    <div>
      <PageHeader back right={<DemoBadge />} />
      <div className="flex flex-col items-center px-6 text-center">
        <motion.div
          key={status}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={clsx(
            'flex size-24 items-center justify-center rounded-[32px]',
            status === 'approved' ? 'bg-success/15 text-success' : 'bg-gold/12 text-gold',
          )}
        >
          {status === 'approved' ? (
            <CheckCircle2 className="size-12" />
          ) : status === 'pending' ? (
            <Loader2 className="size-12 animate-spin" />
          ) : (
            <ShieldCheck className="size-12" />
          )}
        </motion.div>

        <h1 className="font-display mt-6 text-[28px] font-bold tracking-tight">
          {status === 'approved' ? 'Верификация пройдена' : status === 'pending' ? 'Проверяем данные' : 'Верификация'}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {status === 'approved'
            ? 'Теперь вы можете выпускать карты'
            : status === 'pending'
              ? 'Обычно это занимает до 5 минут. Можно закрыть приложение — мы пришлём уведомление.'
              : 'Проверка личности обязательна по требованиям партнёра-эмитента и законодательства о противодействии отмыванию денег.'}
        </p>
      </div>

      {status !== 'approved' && (
        <div className="px-5 pt-8">
          <Panel className="divide-y divide-line">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-gold">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <div className="text-[15px] font-medium">{title}</div>
                  <div className="text-[13px] text-muted">{text}</div>
                </div>
                {status === 'pending' && <CheckCircle2 className="size-5 text-success" style={{ opacity: 1 - i * 0.25 }} />}
              </div>
            ))}
          </Panel>
          <p className="mt-4 px-1 text-[12px] leading-snug text-faint">
            Прототип: документы не запрашиваются и не загружаются. В рабочей версии здесь откроется SDK
            KYC-провайдера, которого использует партнёр.
          </p>
        </div>
      )}

      <MainButtonSpacer />
      {status === 'none' || status === 'rejected' ? (
        <MainButton text="Пройти верификацию · демо" onClick={() => start.mutate()} loading={start.isPending} />
      ) : status === 'approved' ? (
        <MainButton
          text={cards?.length ? 'Готово' : 'Выпустить карту'}
          onClick={() => (cards?.length ? navigate(-1) : navigate('/issue', { replace: true }))}
        />
      ) : null}
    </div>
  );
}
