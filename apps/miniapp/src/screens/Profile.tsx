import {
  Crown,
  EyeOff,
  FileText,
  LifeBuoy,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Server,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { KycStatus } from '@cardapp/shared';
import { api } from '../api';
import { useMe, useResetDemo } from '../api/hooks';
import { BRAND } from '../app/brand';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { Badge, Divider, ListItem, Panel, SectionTitle, Segmented, Skeleton } from '../components/ui';
import { isTelegram, openTelegramChat } from '../lib/telegram';
import { toast, useUi, type ThemePref } from '../store/ui';
import { Avatar } from './Home';

const KYC_LABEL: Record<KycStatus, { text: string; tone: 'success' | 'warning' | 'danger' | 'default' }> = {
  approved: { text: 'Пройдена', tone: 'success' },
  pending: { text: 'Проверка', tone: 'warning' },
  rejected: { text: 'Отклонена', tone: 'danger' },
  none: { text: 'Не пройдена', tone: 'default' },
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-gold' : 'bg-surface-3'}`}
    >
      <span
        className={`absolute top-0.5 left-0 size-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const reset = useResetDemo();
  const { hideBalance, toggleHideBalance, theme, setTheme, setOnboarded } = useUi();
  const [docsOpen, setDocsOpen] = useState(false);

  const doReset = (mode: 'seeded' | 'fresh') =>
    reset.mutate(mode, {
      onSuccess: () => {
        toast(mode === 'fresh' ? 'Вы — новый пользователь' : 'Демо-данные восстановлены', 'success');
        navigate('/');
      },
    });

  return (
    <div>
      <PageHeader title="Профиль" />

      <div className="flex items-center gap-4 px-5 pt-1 pb-6">
        {me ? <Avatar name={me.firstName} photo={me.photoUrl} size={64} /> : <Skeleton className="size-16 rounded-full" />}
        <div className="min-w-0">
          <div className="truncate text-[20px] font-bold">
            {me ? [me.firstName, me.lastName].filter(Boolean).join(' ') : '…'}
          </div>
          <div className="text-[14px] text-muted">
            {me?.username ? `@${me.username}` : ''} {me ? `· ID ${me.telegramId}` : ''}
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4">
        <Panel className="overflow-hidden">
          <ListItem
            icon={<ShieldCheck className="size-5" />}
            title="Верификация"
            right={me && <Badge tone={KYC_LABEL[me.kycStatus].tone}>{KYC_LABEL[me.kycStatus].text}</Badge>}
            onClick={() => navigate('/kyc')}
          />
          <Divider />
          <ListItem
            icon={<Crown className="size-5" />}
            title="Тариф"
            right={me?.subscription.active ? 'Премиум' : 'Разовый'}
            onClick={() => navigate('/tariffs')}
          />
        </Panel>

        <div>
          <SectionTitle>Настройки</SectionTitle>
          <Panel className="overflow-hidden">
            <ListItem
              icon={<EyeOff className="size-5" />}
              title="Скрывать баланс"
              right={<Toggle on={hideBalance} onChange={toggleHideBalance} />}
            />
            <Divider />
            <div className="px-4 py-3.5">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-gold">
                  <Moon className="size-5" />
                </span>
                <span className="text-[15px] font-medium">Тема</span>
              </div>
              <Segmented<ThemePref>
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'dark', label: 'Тёмная' },
                  { value: 'light', label: 'Светлая' },
                  { value: 'auto', label: isTelegram ? 'Как в Telegram' : 'Системная' },
                ]}
              />
            </div>
          </Panel>
        </div>

        <div>
          <SectionTitle>Помощь</SectionTitle>
          <Panel className="overflow-hidden">
            <ListItem
              icon={<LifeBuoy className="size-5" />}
              title="Поддержка"
              subtitle={`@${BRAND.supportUsername}`}
              onClick={() => openTelegramChat(BRAND.supportUsername)}
            />
            <Divider />
            <ListItem icon={<FileText className="size-5" />} title="Документы и условия" onClick={() => setDocsOpen(true)} />
          </Panel>
        </div>

        <div>
          <SectionTitle>Демо-режим</SectionTitle>
          <Panel className="overflow-hidden">
            <ListItem
              icon={<Server className="size-5" />}
              title="Источник данных"
              right={api.mode === 'mock' ? 'Mock (в браузере)' : 'API сервер'}
            />
            <Divider />
            <ListItem icon={<RotateCcw className="size-5" />} title="Восстановить демо-данные" onClick={() => doReset('seeded')} />
            <Divider />
            <ListItem
              icon={<UserPlus className="size-5" />}
              title="Начать как новый пользователь"
              subtitle="Без карт и верификации"
              onClick={() => doReset('fresh')}
            />
            <Divider />
            <ListItem
              icon={<Sparkles className="size-5" />}
              title="Показать онбординг"
              onClick={() => {
                setOnboarded(false);
                navigate('/onboarding');
              }}
            />
          </Panel>
        </div>

        <div className="pt-2 pb-4 text-center text-[12px] text-faint">
          {BRAND.name} · {BRAND.version}
          <br />
          Прототип. Карты не выпускаются, платежи не проводятся.
        </div>
      </div>

      <Sheet open={docsOpen} onClose={() => setDocsOpen(false)} title="Документы">
        <div className="space-y-3 pb-4 text-[15px] leading-relaxed text-muted">
          <p>Здесь будут размещены:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Пользовательское соглашение</li>
            <li>Политика конфиденциальности и обработки персональных данных</li>
            <li>Условия выпуска и обслуживания карт партнёра-эмитента</li>
            <li>Тарифы и комиссии</li>
            <li>Правила AML/KYC</li>
          </ul>
          <p className="text-faint">Тексты готовятся юристами после выбора партнёра.</p>
        </div>
      </Sheet>
    </div>
  );
}
