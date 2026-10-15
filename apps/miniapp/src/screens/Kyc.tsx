import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, CheckCircle2, FileText, Home, LifeBuoy, Loader2, RotateCcw, ScanFace, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { KYC_LEVELS, formatMoney, type KycDocumentType, type KycLevel, type KycOutcome } from '@cardapp/shared';
import { BRAND } from '../app/brand';
import { notifyBot } from '../lib/notify';
import { openTelegramChat } from '../lib/telegram';
import { useCards, useMe, useStartKyc } from '../api/hooks';
import { MainButton, MainButtonSpacer } from '../components/MainButton';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { Button, DemoBadge, Panel, Skeleton } from '../components/ui';
import { haptic } from '../lib/telegram';

/**
 * Демо-флоу верификации. Камера не включается, файлы не создаются и никуда не отправляются.
 * В рабочей версии шаги «Фото документа» и «Селфи» заменяет SDK KYC-провайдера партнёра.
 */

const COUNTRIES = [
  { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  { code: 'BY', name: 'Беларусь', flag: '🇧🇾' },
  { code: 'AM', name: 'Армения', flag: '🇦🇲' },
  { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿' },
  { code: 'KG', name: 'Кыргызстан', flag: '🇰🇬' },
];

const DOCUMENTS: { id: KycDocumentType; title: string; hint: string; countries?: string[] }[] = [
  { id: 'passport_ru', title: 'Паспорт РФ', hint: 'Разворот с фотографией', countries: ['RU'] },
  { id: 'passport_intl', title: 'Загранпаспорт', hint: 'Страница с фотографией' },
  { id: 'id_card', title: 'ID-карта', hint: 'Лицевая и оборотная сторона' },
  { id: 'residence_permit', title: 'Вид на жительство', hint: 'Лицевая сторона' },
];

type Step = 'intro' | 'document' | 'photo' | 'selfie' | 'address' | 'review';

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={() => {
        haptic.selection();
        onClick();
      }}
      className={clsx(
        'flex w-full items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-3 text-left transition',
        selected ? 'border-gold' : 'border-line',
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <span
        className={clsx(
          'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'gold-fill border-transparent' : 'border-faint',
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

/** Демо-«видоискатель»: рамка и анимация съёмки без доступа к камере */
function DemoCapture({ kind, done, onCapture }: { kind: 'document' | 'selfie' | 'address'; done: boolean; onCapture: () => void }) {
  const [shooting, setShooting] = useState(false);
  const shoot = () => {
    if (done || shooting) return;
    setShooting(true);
    haptic.impact('medium');
    setTimeout(() => {
      setShooting(false);
      haptic.success();
      onCapture();
    }, 1200);
  };
  return (
    <button onClick={shoot} className="relative mx-auto flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,#2a2418,#000)]" />
      {kind === 'address' ? (
        <div className={clsx('relative aspect-[0.72] w-[42%] rounded-lg border-2 border-dashed p-3', done ? 'border-success' : 'border-gold/70')}>
          <div className="space-y-2">
            {[90, 70, 80, 50, 75, 60].map((w, i) => (
              <div key={i} className="h-1.5 rounded bg-white/15" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      ) : kind === 'document' ? (
        <div className={clsx('relative aspect-[1.42] w-[78%] rounded-xl border-2 border-dashed', done ? 'border-success' : 'border-gold/70')}>
          <div className="absolute top-3 left-3 h-[55%] w-[28%] rounded-md bg-white/10" />
          <div className="absolute top-4 right-4 left-[36%] space-y-2">
            <div className="h-2 rounded bg-white/15" />
            <div className="h-2 w-3/4 rounded bg-white/15" />
            <div className="h-2 w-1/2 rounded bg-white/15" />
          </div>
        </div>
      ) : (
        <div className={clsx('relative aspect-[3/4] w-[46%] rounded-[50%] border-2 border-dashed', done ? 'border-success' : 'border-gold/70')}>
          <ScanFace className="absolute inset-0 m-auto size-14 text-white/20" strokeWidth={1.2} />
        </div>
      )}
      {shooting && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[13px] font-semibold text-white">
          {done ? (
            <>
              <CheckCircle2 className="size-4 text-success" /> Принято
            </>
          ) : shooting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Проверяем качество…
            </>
          ) : (
            <>
              <Camera className="size-4" /> Нажмите, чтобы снять · демо
            </>
          )}
        </span>
      </div>
    </button>
  );
}

function LevelsPanel({ current }: { current?: KycLevel }) {
  return (
    <Panel className="divide-y divide-line">
      {(Object.keys(KYC_LEVELS) as KycLevel[]).map((lvl) => {
        const l = KYC_LEVELS[lvl];
        const active = current === lvl;
        return (
          <div key={lvl} className="px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold">{l.title}</span>
              {active ? (
                <span className="text-[12px] font-semibold text-success">● Ваш уровень</span>
              ) : (
                <span className="text-[12px] text-faint">{l.requirements}</span>
              )}
            </div>
            <div className="mt-1 text-[13px] text-muted">
              Пополнения до {formatMoney(l.topUpMonthlyRubMinor, 'RUB')} в месяц · баланс до {formatMoney(l.maxBalanceUsdMinor, 'USD')}
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

function StatusView() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: cards } = useCards();
  if (!me) return null;
  const pending = me.kycStatus === 'pending';
  const doc = DOCUMENTS.find((d) => d.id === me.kyc?.documentType);
  const country = COUNTRIES.find((c) => c.code === me.kyc?.country);

  return (
    <div>
      <PageHeader back right={<DemoBadge />} />
      <div className="flex flex-col items-center px-6 pt-4 text-center">
        <motion.div
          key={me.kycStatus}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={clsx('flex size-24 items-center justify-center rounded-[32px]', pending ? 'bg-gold/12 text-gold' : 'bg-success/15 text-success')}
        >
          {pending ? <Loader2 className="size-12 animate-spin" /> : <CheckCircle2 className="size-12" />}
        </motion.div>
        <h1 className="font-display mt-6 text-[28px] font-bold tracking-tight">
          {pending ? 'Проверяем документы' : 'Верификация пройдена'}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {pending
            ? 'Обычно до 5 минут. Можно закрыть приложение — бот пришлёт уведомление.'
            : `Уровень: ${KYC_LEVELS[me.kycLevel ?? 'basic'].title.toLowerCase()}`}
        </p>
      </div>
      <div className="space-y-4 px-5 pt-8">
        {me.kyc && pending && (
          <Panel className="divide-y divide-line">
            <Row label="Страна" value={country ? `${country.flag} ${country.name}` : me.kyc.country} />
            <Row label="Документ" value={doc?.title ?? '—'} />
            <Row label="Уровень" value={KYC_LEVELS[me.kyc.level].title} />
          </Panel>
        )}
        {!pending && (
          <>
            <LevelsPanel current={me.kycLevel} />
            {me.kycLevel === 'basic' && (
              <Button variant="surface" block icon={<Home className="size-4" />} onClick={() => navigate('/kyc?level=extended')}>
                Повысить до расширенного
              </Button>
            )}
          </>
        )}
      </div>
      <MainButtonSpacer />
      {!pending && (
        <MainButton
          text={cards?.length ? 'Готово' : 'Выпустить карту'}
          onClick={() => (cards?.length ? navigate(-1) : navigate('/issue', { replace: true }))}
        />
      )}
    </div>
  );
}

function RejectedView({ reason, onRetry }: { reason?: string; onRetry: () => void }) {
  return (
    <div>
      <PageHeader back right={<DemoBadge />} />
      <div className="flex flex-col items-center px-6 pt-4 text-center">
        <div className="flex size-24 items-center justify-center rounded-[32px] bg-danger/12 text-danger">
          <XCircle className="size-12" />
        </div>
        <h1 className="font-display mt-6 text-[28px] font-bold tracking-tight">Верификация не пройдена</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{reason}</p>
      </div>
      <div className="space-y-2 px-5 pt-8">
        <Button size="lg" block icon={<LifeBuoy className="size-5" />} onClick={() => openTelegramChat(BRAND.supportUsername)}>
          Написать в поддержку
        </Button>
        <Button size="lg" variant="surface" block icon={<RotateCcw className="size-5" />} onClick={onRetry}>
          Попробовать снова · демо
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const OUTCOMES: { id: KycOutcome; label: string }[] = [
  { id: 'approved', label: 'Одобрить' },
  { id: 'resubmission', label: 'Переснять' },
  { id: 'rejected', label: 'Отказ' },
];

/** Новый экземпляр мастера при смене параметров (?level=extended) — шаги начинаются заново */
export function KycRoute() {
  const { search } = useLocation();
  return <Kyc key={search} />;
}

export function Kyc() {
  const { data: me } = useMe();
  const start = useStartKyc();
  const [params] = useSearchParams();
  const upgrade = params.get('level') === 'extended';
  const [step, setStep] = useState<Step>('intro');
  const [outcome, setOutcome] = useState<KycOutcome>('approved');
  const [retry, setRetry] = useState(false);
  const [addressDone, setAddressDone] = useState(false);

  // Уведомление в боте, когда проверка завершилась (переход из pending)
  const prevStatus = useRef(me?.kycStatus);
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = me?.kycStatus;
    if (prev !== 'pending' || !me || me.kycStatus === 'pending') return;
    if (me.kycStatus === 'approved') notifyBot('kyc_approved', { level: me.kycLevel ?? 'basic' });
    if (me.kycStatus === 'resubmission') notifyBot('kyc_resubmission');
    if (me.kycStatus === 'rejected') notifyBot('kyc_rejected');
  }, [me]);

  // При «переснять» сразу ведём к фото, сохранив страну и документ
  useEffect(() => {
    if (me?.kycStatus === 'resubmission' && me.kyc) {
      setCountry(me.kyc.country);
      setDoc(me.kyc.documentType);
      setConsent(true);
      setPhotoDone(false);
      setSelfieDone(false);
      setStep('photo');
    }
  }, [me?.kycStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  const [consent, setConsent] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [country, setCountry] = useState('RU');
  const [doc, setDoc] = useState<KycDocumentType>('passport_ru');
  const [photoDone, setPhotoDone] = useState(false);
  const [selfieDone, setSelfieDone] = useState(false);

  if (!me) {
    return (
      <div className="px-5 pt-16">
        <Skeleton className="h-60 w-full rounded-3xl" />
      </div>
    );
  }
  if (me.kycStatus === 'pending') return <StatusView />;
  if (me.kycStatus === 'approved' && !(upgrade && me.kycLevel === 'basic')) return <StatusView />;
  if (me.kycStatus === 'rejected' && !retry) {
    return (
      <RejectedView
        reason={me.kyc?.reason}
        onRetry={() => {
          setStep('intro');
          setPhotoDone(false);
          setSelfieDone(false);
          setAddressDone(false);
          setRetry(true);
        }}
      />
    );
  }

  const level: KycLevel = upgrade || me.kyc?.level === 'extended' ? 'extended' : 'basic';
  const STEPS: Step[] = level === 'extended'
    ? ['intro', 'document', 'photo', 'selfie', 'address', 'review']
    : ['intro', 'document', 'photo', 'selfie', 'review'];
  const idx = STEPS.indexOf(step);
  const next = () => setStep(STEPS[idx + 1]!);
  const docs = DOCUMENTS.filter((d) => !d.countries || d.countries.includes(country));
  const docInfo = DOCUMENTS.find((d) => d.id === doc)!;

  const main: Record<Step, { text: string; disabled?: boolean; onClick: () => void }> = {
    intro: { text: 'Начать', disabled: !consent, onClick: next },
    document: { text: 'Далее', onClick: next },
    photo: { text: photoDone ? 'Далее' : 'Сначала сфотографируйте документ', disabled: !photoDone, onClick: next },
    selfie: { text: selfieDone ? 'Далее' : 'Сначала сделайте селфи', disabled: !selfieDone, onClick: next },
    address: { text: addressDone ? 'Далее' : 'Сначала загрузите документ', disabled: !addressDone, onClick: next },
    review: {
      text: 'Отправить на проверку',
      onClick: () =>
        start.mutate({ country, documentType: doc, consent: true, level, demoOutcome: outcome }, { onSuccess: () => haptic.success() }),
    },
  };

  return (
    <div>
      <PageHeader back title={level === 'extended' ? 'Расширенная' : 'Верификация'} right={<DemoBadge />} />
      {me.kycStatus === 'resubmission' && me.kyc?.reason && (
        <div className="mx-5 mb-4 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/8 p-4">
          <RotateCcw className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <div className="text-[15px] font-semibold">Нужно переснять</div>
            <div className="text-[13px] text-muted">{me.kyc.reason}</div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 px-5 pb-5">
        {STEPS.map((s, i) => (
          <div key={s} className={clsx('h-1 flex-1 rounded-full transition-colors', i <= idx ? 'bg-gold' : 'bg-surface-3')} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="px-5"
        >
          {step === 'intro' && (
            <div>
              <div className="flex flex-col items-center text-center">
                <div className="flex size-20 items-center justify-center rounded-[28px] bg-gold/12 text-gold">
                  <ShieldCheck className="size-10" />
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-muted">
                  Проверка личности обязательна по требованиям партнёра-эмитента и законодательства о противодействии
                  отмыванию денег. Займёт 2–3 минуты.
                </p>
              </div>
              <Panel className="mt-6 divide-y divide-line">
                {[
                  { icon: FileText, t: 'Документ', s: 'Выберите страну и тип документа' },
                  { icon: Camera, t: 'Фото документа', s: 'Без бликов, все углы в кадре' },
                  { icon: ScanFace, t: 'Селфи', s: 'Проверка, что это вы' },
                ].map(({ icon: Icon, t, s }) => (
                  <div key={t} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-gold">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <div className="text-[15px] font-medium">{t}</div>
                      <div className="text-[13px] text-muted">{s}</div>
                    </div>
                  </div>
                ))}
              </Panel>
              <button
                onClick={() => {
                  haptic.selection();
                  setConsent(!consent);
                }}
                className="mt-4 flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left"
              >
                <span
                  className={clsx(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                    consent ? 'gold-fill border-transparent' : 'border-faint',
                  )}
                >
                  {consent && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="text-[13px] leading-snug text-muted">
                  Я даю согласие на обработку персональных данных и биометрии в соответствии с{' '}
                  <span
                    className="text-gold underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPolicyOpen(true);
                    }}
                  >
                    политикой конфиденциальности
                  </span>
                </span>
              </button>
              <p className="mt-3 px-1 text-[12px] leading-snug text-faint">
                Прототип: камера не включается, документы не запрашиваются и никуда не отправляются.
              </p>
            </div>
          )}

          {step === 'document' && (
            <div className="space-y-6">
              <div>
                <div className="mb-2 text-[13px] font-semibold tracking-wider text-muted uppercase">Страна выдачи</div>
                <div className="grid grid-cols-2 gap-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        haptic.selection();
                        setCountry(c.code);
                        if (c.code !== 'RU' && doc === 'passport_ru') setDoc('passport_intl');
                      }}
                      className={clsx(
                        'flex items-center gap-2 rounded-2xl border-2 bg-surface px-3 py-3 text-left text-[15px] font-medium',
                        country === c.code ? 'border-gold' : 'border-line',
                      )}
                    >
                      <span className="text-[20px]">{c.flag}</span> {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[13px] font-semibold tracking-wider text-muted uppercase">Документ</div>
                <div className="space-y-2">
                  {docs.map((d) => (
                    <Choice key={d.id} selected={doc === d.id} onClick={() => setDoc(d.id)}>
                      <div className="text-[15px] font-medium">{d.title}</div>
                      <div className="text-[13px] text-muted">{d.hint}</div>
                    </Choice>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'photo' && (
            <div>
              <h2 className="text-[20px] font-semibold">{docInfo.title}</h2>
              <p className="mt-1 mb-4 text-[14px] text-muted">{docInfo.hint}. Положите документ на тёмную поверхность.</p>
              <DemoCapture kind="document" done={photoDone} onCapture={() => setPhotoDone(true)} />
              <ul className="mt-4 space-y-1.5 text-[13px] text-muted">
                <li>• Все четыре угла документа в кадре</li>
                <li>• Без бликов и размытия</li>
                <li>• Данные хорошо читаются</li>
              </ul>
            </div>
          )}

          {step === 'selfie' && (
            <div>
              <h2 className="text-[20px] font-semibold">Селфи</h2>
              <p className="mt-1 mb-4 text-[14px] text-muted">Поместите лицо в овал, снимите очки и головной убор.</p>
              <DemoCapture kind="selfie" done={selfieDone} onCapture={() => setSelfieDone(true)} />
            </div>
          )}

          {step === 'address' && (
            <div>
              <h2 className="text-[20px] font-semibold">Подтверждение адреса</h2>
              <p className="mt-1 mb-4 text-[14px] text-muted">
                Выписка из банка или квитанция ЖКУ не старше 3 месяцев, с вашим ФИО и адресом.
              </p>
              <DemoCapture kind="address" done={addressDone} onCapture={() => setAddressDone(true)} />
            </div>
          )}

          {step === 'review' && (
            <div>
              <h2 className="text-[20px] font-semibold">Проверьте данные</h2>
              <Panel className="mt-4 divide-y divide-line">
                <Row label="Страна" value={COUNTRIES.find((c) => c.code === country)!.name} />
                <Row label="Документ" value={docInfo.title} />
                <Row label="Фото документа" value="✓ Принято" />
                <Row label="Селфи" value="✓ Принято" />
                {level === 'extended' && <Row label="Адрес" value="✓ Принято" />}
                <Row label="Уровень" value={KYC_LEVELS[level].title} />
              </Panel>
              <div className="mt-5 rounded-2xl bg-surface-2 p-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-muted">
                  <DemoBadge /> Результат проверки
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        haptic.selection();
                        setOutcome(o.id);
                      }}
                      className={clsx(
                        'rounded-xl py-2 text-[13px] font-semibold',
                        outcome === o.id ? 'bg-gold/15 text-gold' : 'bg-surface-3 text-muted',
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-4 px-1 text-[12px] leading-snug text-faint">
                В рабочей версии фото передаются напрямую KYC-провайдеру и не хранятся на наших серверах.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <MainButtonSpacer />
      <MainButton text={main[step].text} disabled={main[step].disabled} onClick={main[step].onClick} loading={start.isPending} />

      <Sheet open={policyOpen} onClose={() => setPolicyOpen(false)} title="Персональные данные">
        <div className="space-y-3 pb-4 text-[15px] leading-relaxed text-muted">
          <p>Для верификации обрабатываются: ФИО, дата рождения, данные и изображение документа, фото лица.</p>
          <p>Цель — проверка личности по требованиям партнёра-эмитента и законодательства о ПОД/ФТ.</p>
          <p className="text-faint">Текст-заглушка. Финальную политику готовят юристы после выбора партнёра.</p>
        </div>
      </Sheet>
    </div>
  );
}
