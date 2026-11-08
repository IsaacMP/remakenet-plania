// Organizador: notas, ideas, proyectos y eventos. El botón + pregunta "¿Qué quieres crear?".
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { formatDay, formatTime, ItemCard, KIND_ICON } from '@/components/organizer';
import { Card, Chip, EmptyState, SectionTitle, T, tap } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listItems, upcomingEvents } from '@/lib/api';
import type { ItemKind } from '@/lib/types';

type Filter = 'all' | ItemKind;
const FILTERS: Filter[] = ['all', 'note', 'idea', 'project', 'event'];

export default function Organize() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>('all');

  const items = useQuery({ queryKey: ['items', filter], queryFn: () => listItems(filter === 'all' ? undefined : filter) });
  const upcoming = useQuery({ queryKey: ['upcoming'], queryFn: () => upcomingEvents(5), enabled: filter === 'all' });

  // En "Todo" los eventos futuros van arriba, así que no se repiten en la lista
  const upcomingIds = new Set((upcoming.data ?? []).map((e) => e.id));
  const list = (items.data ?? []).filter((i) => filter !== 'all' || !upcomingIds.has(i.id));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={items.isRefetching}
            onRefresh={() => {
              items.refetch();
              upcoming.refetch();
            }}
            tintColor={theme.tint}
          />
        }>
        <View style={{ gap: Space.xs }}>
          <T style={[styles.title, { color: theme.text }]}>{t('organize.title')}</T>
          <T color={theme.textSecondary}>{t('organize.subtitle')}</T>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm }}>
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={t(`organize.filters.${f}`)}
              icon={f === 'all' ? undefined : KIND_ICON[f]}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>

        {filter === 'all' && upcoming.data?.length ? (
          <>
            <SectionTitle>{t('organize.upcoming')}</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.md }}>
              {upcoming.data.map((e) => {
                const start = new Date(e.starts_at!);
                return (
                  <Card key={e.id} onPress={() => router.push(`/item/${e.id}`)} style={[styles.eventCard, { backgroundColor: theme.coralSoft, borderColor: theme.coralSoft }]}>
                    <T variant="caption" color={theme.coral} style={{ textTransform: 'uppercase' }}>
                      {formatDay(start, t)}
                    </T>
                    <T variant="heading" numberOfLines={2} style={{ fontSize: 17 }}>
                      {e.title}
                    </T>
                    <T variant="small" color={theme.textSecondary} numberOfLines={1}>
                      {e.all_day ? t('organize.allDay') : formatTime(start)}
                      {e.location_name ? ` · ${e.location_name}` : ''}
                    </T>
                  </Card>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {items.isSuccess && list.length === 0 && !(filter === 'all' && upcoming.data?.length) ? (
          <EmptyState icon={filter === 'all' ? 'checklist' : KIND_ICON[filter]} title={t('organize.emptyTitle')} body={t('organize.emptyBody')} />
        ) : null}

        {list.length ? (
          <View style={{ gap: Space.sm }}>
            {filter === 'all' && upcoming.data?.length ? <SectionTitle>{t('organize.filters.all')}</SectionTitle> : null}
            {list.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </View>
        ) : null}

        {items.isError ? <T color={theme.danger}>{t('common.error')}</T> : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('organize.ask')}
        onPress={() => {
          tap();
          router.push(filter === 'all' ? '/create' : `/item/new?kind=${filter}`);
        }}
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.tint, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
        <Icon name="plus" size={28} color={theme.onTint} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.lg, gap: Space.lg, paddingBottom: 140 },
  title: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  eventCard: { width: 200, gap: 4 },
  fab: {
    position: 'absolute',
    right: Space.xl,
    bottom: Space.xl,
    width: 62,
    height: 62,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

