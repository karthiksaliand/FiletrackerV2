import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAPI } from '../../constants/api';
import { Colors, Spacing, Radius } from '../../constants/theme';

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  new_file: { icon: 'file-plus-outline', color: Colors.primary },
  reminder: { icon: 'bell-ring-outline', color: Colors.warning },
  escalation: { icon: 'alert-octagon', color: Colors.error },
  dc_decision: { icon: 'gavel', color: Colors.success },
  all_approvals_complete: { icon: 'check-all', color: Colors.success },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchAPI('/notifications');
      setNotifications(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData();
  }, [loadData]));

  const markAsRead = async (notifId: string) => {
    try {
      await fetchAPI(`/notifications/${notifId}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => n.id === notifId ? { ...n, is_read: true } : n)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetchAPI('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const typeInfo = TYPE_ICONS[item.type] || { icon: 'information-outline', color: Colors.mutedForeground };
    const timeAgo = getTimeAgo(item.created_at);

    return (
      <TouchableOpacity
        testID={`notif-item-${item.id}`}
        style={[s.notifCard, !item.is_read && s.unread]}
        onPress={() => {
          if (!item.is_read) markAsRead(item.id);
          if (item.file_id) router.push({ pathname: '/file-detail', params: { id: item.file_id } });
        }}
        activeOpacity={0.7}
      >
        <View style={[s.iconWrap, { backgroundColor: typeInfo.color + '15' }]}>
          <MaterialCommunityIcons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
        </View>
        <View style={s.notifContent}>
          <Text style={s.notifTitle}>{item.title}</Text>
          <Text style={s.notifMessage} numberOfLines={2}>{item.message}</Text>
          <View style={s.notifMeta}>
            {item.file_number && <Text style={s.fileRef}>{item.file_number}</Text>}
            <Text style={s.timeAgo}>{timeAgo}</Text>
          </View>
        </View>
        {!item.is_read && <View style={s.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Notifications</Text>
        {notifications.some((n) => !n.is_read) && (
          <TouchableOpacity testID="mark-all-read-btn" onPress={markAllRead}>
            <Text style={s.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <MaterialCommunityIcons name="bell-check-outline" size={48} color={Colors.muted} />
              <Text style={s.emptyText}>No notifications</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  markAllText: { fontSize: 13, fontWeight: '600', color: Colors.accent },
  list: { padding: Spacing.md },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: Colors.accent },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.secondaryForeground },
  notifMessage: { fontSize: 13, color: Colors.mutedForeground, marginTop: 2 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  fileRef: {
    fontSize: 11, fontWeight: '700', color: Colors.primary,
    backgroundColor: Colors.secondary, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  timeAgo: { fontSize: 11, color: Colors.mutedForeground },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
    marginLeft: 8, marginTop: 4,
  },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: Colors.mutedForeground, marginTop: Spacing.sm },
});
