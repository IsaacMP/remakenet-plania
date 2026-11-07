import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      indicatorColor={theme.tintSoft}
      iconColor={{ default: theme.textSecondary, selected: theme.tint }}
      labelStyle={{ default: { color: theme.textSecondary }, selected: { color: theme.tint } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.study')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="organize">
        <NativeTabs.Trigger.Label>{t('tabs.organize')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="dashboard" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pro">
        <NativeTabs.Trigger.Label>{t('tabs.pro')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
