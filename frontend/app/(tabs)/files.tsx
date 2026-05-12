import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { fetchAPI } from '../../constants/api';
import { Colors, Spacing, Radius, StatusColors, StatusLabels } from '../../constants/theme';
import { consumePendingFilter, hasPendingFilter } from '../../constants/filterStore';

export default function FilesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFiles = useCallback(async (statusVal: string, priorityVal: string, searchVal: string, deptVal?: string) => {
    try {
      let url = '/files?limit=100';
      if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
      if (statusVal !== 'all') url += `&status=${statusVal}`;
      if (priorityVal !== 'all') url += `&priority=${priorityVal}`;
      if (deptVal && deptVal !== 'all') url += `&pending_dept=${deptVal}`;
      const data = await fetchAPI(url);
      setFiles(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    // Check if dashboard set a pending filter
    if (hasPendingFilter()) {
      const pending = consumePendingFilter();
      const newStatus = pending.status || 'all';
      const newPriority = pending.priority || 'all';
      const newDept = pending.pendingDept || 'all';
      setFilter(newStatus);
      setPriorityFilter(newPriority);
      setDeptFilter(newDept);
      setLoading(true);
      fetchFiles(newStatus, newPriority, search, newDept);
    } else {
      setLoading(true);
      fetchFiles(filter, priorityFilter, search, deptFilter);
    }
  }, []));

  // Re-fetch when filter/priority/search/dept changes via UI
  React.useEffect(() => {
    setLoading(true);
    fetchFiles(filter, priorityFilter, search, deptFilter);
  }, [filter, priorityFilter, search, deptFilter]);

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'dc_approved', label: 'Approved' },
    { key: 'dc_rejected', label: 'Rejected' },
    { key: 'delayed', label: 'Delayed' },
    { key: 'draft', label: 'Draft' },
  ];

  const role = user?.role || '';

  const getDaysLeft = (deadline: string) => Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 86400));

  return (
    <SafeAreaView style={s.container}>
      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={Colors.mutedForeground} />
          <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search file number..." placeholderTextColor={Colors.mutedForeground} />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={Colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 6 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[s.filterChip, filter === f.key && deptFilter === 'all' && priorityFilter === 'all' && s.filterChipActive]} onPress={() => { setFilter(f.key); setPriorityFilter('all'); setDeptFilter('all'); }}>
            <Text style={[s.filterText, filter === f.key && deptFilter === 'all' && priorityFilter === 'all' && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        {/* Priority filter chip */}
        <TouchableOpacity
          style={[s.filterChip, priorityFilter === 'high' && { backgroundColor: '#DC2626', borderColor: '#DC2626' }]}
          onPress={() => { setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high'); setFilter('all'); setDeptFilter('all'); }}
        >
          <Text style={[s.filterText, priorityFilter === 'high' && { color: '#FFF' }]}>🔴 High Priority</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Active department filter indicator */}
      {deptFilter !== 'all' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: 8, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, gap: 6 }}>
            <Text style={{ color: '#1E40AF', fontSize: 13, fontWeight: '600' }}>Dept: {deptFilter.charAt(0).toUpperCase() + deptFilter.slice(1)} Pending</Text>
            <TouchableOpacity onPress={() => { setDeptFilter('all'); setFilter('all'); }}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#1E40AF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFiles(filter, priorityFilter, search, deptFilter); }} />} contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}>
          {files.length === 0 ? (
            <Text style={s.emptyText}>No files found</Text>
          ) : (
            files.map(item => {
              const isHigh = item.priority === 'high';
              const daysLeft = item.deadline ? getDaysLeft(item.deadline) : null;
              const isOverdue = daysLeft !== null && daysLeft < 0 && item.status === 'submitted';
              return (
                <TouchableOpacity key={item.id} style={[s.fileCard, isHigh && s.highPriority]} onPress={() => router.push({ pathname: '/file-detail', params: { id: item.id } })} activeOpacity={0.7}>
                  <View style={s.fileRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.fileNumber}>{item.file_number}</Text>
                        {isHigh && <View style={s.priorityBadge}><Text style={s.priorityText}>HIGH</Text></View>}
                      </View>
                      <Text style={s.desc} numberOfLines={1}>{item.description}</Text>
                      <Text style={s.meta}>{item.tahsildar_location} | {new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[s.statusBadge, { backgroundColor: (StatusColors[item.status] || '#94A3B8') + '20' }]}>
                        <Text style={[s.statusText, { color: StatusColors[item.status] || '#94A3B8' }]}>{StatusLabels[item.status] || item.status}</Text>
                      </View>
                      {daysLeft !== null && item.status === 'submitted' && (
                        <Text style={[s.deadlineText, isOverdue && { color: '#DC2626' }]}>
                          {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: { paddingHorizontal: Spacing.md, paddingTop: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.sm, paddingHorizontal: 12, height: 40, gap: 8, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.foreground },
  filterRow: { maxHeight: 44, marginVertical: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground },
  filterTextActive: { color: '#FFF' },
  emptyText: { textAlign: 'center', color: Colors.mutedForeground, paddingVertical: 40 },
  fileCard: { backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  highPriority: { borderLeftWidth: 3, borderLeftColor: '#DC2626', borderColor: '#DC262640' },
  fileRow: { flexDirection: 'row', alignItems: 'flex-start' },
  fileNumber: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  priorityBadge: { backgroundColor: '#DC262620', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  priorityText: { fontSize: 9, fontWeight: '800', color: '#DC2626' },
  desc: { fontSize: 13, color: Colors.foreground, marginTop: 2 },
  meta: { fontSize: 11, color: Colors.mutedForeground, marginTop: 2 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  deadlineText: { fontSize: 10, color: Colors.mutedForeground, fontWeight: '600' },
});
