import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, RefreshControl, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { fetchAPI } from '../../constants/api';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { AppDialog } from '../../components/AppDialog';

type Tab = 'users' | 'config' | 'analytics' | 'audit';

export default function AdminScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User Edit state
  const [editUserModal, setEditUserModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editFields, setEditFields] = useState({ display_name: '', username: '', department: '' });

  // Password Reset state
  const [resetModal, setResetModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // Config Edit state
  const [editConfigModal, setEditConfigModal] = useState(false);
  const [editConfigType, setEditConfigType] = useState<'locations' | 'departments' | 'roles'>('locations');
  const [editConfigData, setEditConfigData] = useState<any>({});
  const [newLocationName, setNewLocationName] = useState('');

  // Dialog
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string; onOk?: () => void }>({ visible: false, title: '', message: '' });
  const showMsg = (title: string, message: string, onOk?: () => void) => setDialog({ visible: true, title, message, onOk });

  const loadData = useCallback(async () => {
    try {
      if (tab === 'users') {
        setUsers(await fetchAPI('/admin/users'));
      } else if (tab === 'config') {
        setConfig(await fetchAPI('/admin/config'));
      } else if (tab === 'analytics') {
        setAnalytics(await fetchAPI('/admin/analytics'));
      } else {
        setAuditLogs(await fetchAPI('/admin/audit-logs?limit=100'));
      }
    } catch (e: any) {
      showMsg('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData();
  }, [loadData]));

  // === USER MANAGEMENT ===
  const openEditUser = (u: any) => {
    setEditUser(u);
    setEditFields({ display_name: u.display_name, username: u.username, department: u.department || '' });
    setEditUserModal(true);
  };

  const saveEditUser = async () => {
    if (!editFields.display_name.trim() || !editFields.username.trim()) {
      showMsg('Validation', 'Display name and username are required');
      return;
    }
    try {
      await fetchAPI(`/admin/users/${editUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          display_name: editFields.display_name.trim(),
          username: editFields.username.trim(),
          department: editFields.department.trim(),
        }),
      });
      showMsg('Success', `User "${editFields.display_name}" updated`);
      setEditUserModal(false);
      loadData();
    } catch (e: any) {
      showMsg('Error', e.message);
    }
  };

  const toggleUser = async (userId: string) => {
    try {
      const res = await fetchAPI(`/admin/users/${userId}/toggle-active`, { method: 'POST' });
      showMsg('Success', res.message);
      loadData();
    } catch (e: any) {
      showMsg('Error', e.message);
    }
  };

  const resetPassword = async () => {
    if (!newPassword.trim()) { showMsg('Error', 'Enter a password'); return; }
    try {
      await fetchAPI(`/admin/users/${resetModal.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassword }),
      });
      showMsg('Success', `Password reset for ${resetModal.display_name}`);
      setResetModal(null);
      setNewPassword('');
    } catch (e: any) {
      showMsg('Error', e.message);
    }
  };

  // === CONFIG MANAGEMENT ===
  const openEditConfig = (type: 'locations' | 'departments' | 'roles') => {
    setEditConfigType(type);
    if (type === 'locations') {
      setEditConfigData({ locations: [...(config?.tahsildar_locations || [])] });
    } else if (type === 'departments') {
      setEditConfigData({ ...(config?.department_labels || {}) });
    } else {
      setEditConfigData({ ...(config?.role_labels || {}) });
    }
    setNewLocationName('');
    setEditConfigModal(true);
  };

  const saveConfig = async () => {
    try {
      let body: any = {};
      if (editConfigType === 'locations') {
        body.tahsildar_locations = editConfigData.locations;
      } else if (editConfigType === 'departments') {
        body.department_labels = editConfigData;
      } else {
        body.role_labels = editConfigData;
      }
      await fetchAPI('/admin/config', { method: 'PUT', body: JSON.stringify(body) });
      showMsg('Success', 'Configuration updated');
      setEditConfigModal(false);
      loadData();
    } catch (e: any) {
      showMsg('Error', e.message);
    }
  };

  const updateLocation = (idx: number, newName: string) => {
    const locs = [...editConfigData.locations];
    locs[idx] = newName;
    setEditConfigData({ locations: locs });
  };

  const removeLocation = (idx: number) => {
    const locs = [...editConfigData.locations];
    locs.splice(idx, 1);
    setEditConfigData({ locations: locs });
  };

  const addLocation = () => {
    if (!newLocationName.trim()) return;
    setEditConfigData({ locations: [...editConfigData.locations, newLocationName.trim()] });
    setNewLocationName('');
  };

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><Text style={s.emptyText}>Admin access only</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {(['users', 'config', 'analytics', 'audit'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tabItem, tab === t && s.tabActive]} onPress={() => { setTab(t); setLoading(true); }}>
            <MaterialCommunityIcons name={t === 'users' ? 'account-group' : t === 'config' ? 'cog' : t === 'analytics' ? 'chart-bar' : 'clipboard-text-clock'} size={16} color={tab === t ? Colors.primary : Colors.mutedForeground} />
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'config' ? 'Settings' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />} contentContainerStyle={s.content}>
          {/* ======= USERS TAB ======= */}
          {tab === 'users' && (
            <>
              <Text style={s.sectionTitle}>ALL USERS ({users.length})</Text>
              {users.map((u) => (
                <View key={u.id} style={[s.userCard, !u.is_active && { opacity: 0.5 }]}>
                  <TouchableOpacity style={s.userInfo} onPress={() => openEditUser(u)} activeOpacity={0.6}>
                    <View style={s.userTopRow}>
                      <Text style={s.userDisplay}>{u.display_name}</Text>
                      <MaterialCommunityIcons name="pencil-outline" size={14} color={Colors.primary} />
                    </View>
                    <Text style={s.userMeta}>@{u.username} · {u.role} · {u.department || 'N/A'}</Text>
                    <Text style={[s.userStatus, { color: u.is_active ? '#059669' : '#DC2626' }]}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </Text>
                  </TouchableOpacity>
                  <View style={s.userActions}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => { setResetModal(u); setNewPassword(''); }}>
                      <MaterialCommunityIcons name="lock-reset" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={() => toggleUser(u.id)}>
                      <MaterialCommunityIcons name={u.is_active ? 'account-off-outline' : 'account-check-outline'} size={18} color={u.is_active ? '#DC2626' : '#059669'} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ======= CONFIG TAB ======= */}
          {tab === 'config' && config && (
            <>
              {/* Tahsildar Locations */}
              <View style={s.configSection}>
                <View style={s.configHeader}>
                  <View>
                    <Text style={s.sectionTitle}>TAHSILDAR LOCATIONS</Text>
                    <Text style={s.configDesc}>{config.tahsildar_locations?.length || 0} locations configured</Text>
                  </View>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEditConfig('locations')}>
                    <MaterialCommunityIcons name="pencil" size={14} color="#FFF" />
                    <Text style={s.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.tagGrid}>
                  {(config.tahsildar_locations || []).map((loc: string, i: number) => (
                    <View key={i} style={s.tag}><Text style={s.tagText}>{loc}</Text></View>
                  ))}
                </View>
              </View>

              {/* Department Labels */}
              <View style={s.configSection}>
                <View style={s.configHeader}>
                  <View>
                    <Text style={s.sectionTitle}>DEPARTMENT LABELS</Text>
                    <Text style={s.configDesc}>Display names for departments</Text>
                  </View>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEditConfig('departments')}>
                    <MaterialCommunityIcons name="pencil" size={14} color="#FFF" />
                    <Text style={s.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                {Object.entries(config.department_labels || {}).map(([key, label]) => (
                  <View key={key} style={s.configRow}>
                    <Text style={s.configKey}>{key}</Text>
                    <Text style={s.configValue}>{label as string}</Text>
                  </View>
                ))}
              </View>

              {/* Role Labels */}
              <View style={s.configSection}>
                <View style={s.configHeader}>
                  <View>
                    <Text style={s.sectionTitle}>ROLE LABELS</Text>
                    <Text style={s.configDesc}>Display names for user roles</Text>
                  </View>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEditConfig('roles')}>
                    <MaterialCommunityIcons name="pencil" size={14} color="#FFF" />
                    <Text style={s.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                {Object.entries(config.role_labels || {}).map(([key, label]) => (
                  <View key={key} style={s.configRow}>
                    <Text style={s.configKey}>{key}</Text>
                    <Text style={s.configValue}>{label as string}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ======= ANALYTICS TAB ======= */}
          {tab === 'analytics' && analytics && (
            <>
              <Text style={s.sectionTitle}>FILE ANALYTICS</Text>
              <View style={s.analyticsGrid}>
                {[
                  { label: 'Total', value: analytics.total, color: Colors.primary },
                  { label: 'Draft', value: analytics.draft, color: '#94A3B8' },
                  { label: 'Pending', value: analytics.submitted, color: '#F59E0B' },
                  { label: 'Approved', value: analytics.approved, color: '#059669' },
                  { label: 'Rejected', value: analytics.rejected, color: '#DC2626' },
                  { label: 'Delayed', value: analytics.delayed, color: '#DC2626' },
                  { label: 'High Priority', value: analytics.high_priority, color: '#DC2626' },
                  { label: 'Overdue', value: analytics.overdue, color: '#DC2626' },
                ].map((item) => (
                  <View key={item.label} style={s.analyticsCard}>
                    <Text style={[s.analyticsValue, { color: item.color }]}>{item.value}</Text>
                    <Text style={s.analyticsLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <Text style={[s.sectionTitle, { marginTop: 20 }]}>DEPARTMENT PENDING</Text>
              {Object.entries(analytics.department_pending || {}).map(([dept, count]) => (
                <View key={dept} style={s.deptRow}>
                  <Text style={s.deptLabel}>{dept.toUpperCase()}</Text>
                  <View style={[s.deptBadge, { backgroundColor: (count as number) > 0 ? '#FEF3C7' : '#D1FAE5' }]}>
                    <Text style={[s.deptCount, { color: (count as number) > 0 ? '#92400E' : '#065F46' }]}>{count as number} pending</Text>
                  </View>
                </View>
              ))}

              <Text style={[s.sectionTitle, { marginTop: 20 }]}>AUTOMATIC REMINDERS</Text>
              <View style={s.reminderCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={20} color={Colors.primary} />
                  <Text style={s.reminderTitle}>2-Day Reminder System</Text>
                </View>
                <Text style={s.reminderDesc}>
                  Background job checks hourly. When a department&apos;s approval is pending more than 2 days, the system sends push + in-app notifications to:
                </Text>
                <Text style={s.reminderBullet}>• Department officer (Tahsildar/SP/Forest)</Text>
                <Text style={s.reminderBullet}>• ADC, DC, and Admin (oversight)</Text>
                <Text style={s.reminderBullet}>• Auto-escalates files crossing the 30-day deadline</Text>
                <TouchableOpacity
                  style={s.triggerBtn}
                  onPress={async () => {
                    try {
                      const res = await fetchAPI('/admin/trigger-reminders', { method: 'POST' });
                      showMsg('Reminders Sent', `${res.reminders_sent} reminder(s) dispatched.`);
                    } catch (e: any) {
                      showMsg('Error', e.message);
                    }
                  }}
                >
                  <MaterialCommunityIcons name="send" size={16} color="#FFF" />
                  <Text style={s.triggerBtnText}>Run Reminder Sweep Now</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ======= AUDIT TAB ======= */}
          {tab === 'audit' && (
            <>
              <Text style={s.sectionTitle}>AUDIT LOG ({auditLogs.length})</Text>
              {auditLogs.map((log) => (
                <View key={log.id} style={s.auditCard}>
                  <View style={s.auditHeader}>
                    <Text style={s.auditAction}>{log.action}</Text>
                    <Text style={s.auditTime}>{new Date(log.timestamp).toLocaleString()}</Text>
                  </View>
                  <Text style={s.auditUser}>{log.user_name} ({log.user_role})</Text>
                  {log.file_number ? <Text style={s.auditFile}>{log.file_number}</Text> : null}
                  {log.details ? <Text style={s.auditDetails}>{log.details}</Text> : null}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ======= EDIT USER MODAL ======= */}
      <Modal visible={editUserModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Edit User</Text>
              <Text style={s.modalSub}>Role: {editUser?.role}</Text>

              <Text style={s.fieldLabel}>DISPLAY NAME</Text>
              <TextInput style={s.modalInput} value={editFields.display_name} onChangeText={v => setEditFields({ ...editFields, display_name: v })} placeholder="Display name" placeholderTextColor={Colors.mutedForeground} />

              <Text style={s.fieldLabel}>USERNAME</Text>
              <TextInput style={s.modalInput} value={editFields.username} onChangeText={v => setEditFields({ ...editFields, username: v })} placeholder="Username" placeholderTextColor={Colors.mutedForeground} autoCapitalize="none" />

              <Text style={s.fieldLabel}>DEPARTMENT</Text>
              <TextInput style={s.modalInput} value={editFields.department} onChangeText={v => setEditFields({ ...editFields, department: v })} placeholder="Department" placeholderTextColor={Colors.mutedForeground} />

              <View style={s.modalActions}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setEditUserModal(false)}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modalConfirm} onPress={saveEditUser}>
                  <Text style={s.modalConfirmText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ======= RESET PASSWORD MODAL ======= */}
      <Modal visible={!!resetModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Reset Password</Text>
            <Text style={s.modalSub}>{resetModal?.display_name} (@{resetModal?.username})</Text>
            <TextInput style={s.modalInput} placeholder="New password" placeholderTextColor={Colors.mutedForeground} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setResetModal(null)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={resetPassword}>
                <Text style={s.modalConfirmText}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======= EDIT CONFIG MODAL ======= */}
      <Modal visible={editConfigModal} animationType="slide">
        <SafeAreaView style={s.container}>
          <View style={s.configModalHeader}>
            <TouchableOpacity onPress={() => setEditConfigModal(false)} style={{ padding: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.foreground} />
            </TouchableOpacity>
            <Text style={s.configModalTitle}>
              {editConfigType === 'locations' ? 'Edit Tahsildar Locations' : editConfigType === 'departments' ? 'Edit Department Labels' : 'Edit Role Labels'}
            </Text>
            <TouchableOpacity onPress={saveConfig} style={{ padding: 8 }}>
              <MaterialCommunityIcons name="check" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              {editConfigType === 'locations' && (
                <>
                  {(editConfigData.locations || []).map((loc: string, idx: number) => (
                    <View key={idx} style={s.locRow}>
                      <TextInput style={[s.modalInput, { flex: 1 }]} value={loc} onChangeText={v => updateLocation(idx, v)} />
                      <TouchableOpacity onPress={() => removeLocation(idx)} style={s.removeBtn}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={s.locRow}>
                    <TextInput style={[s.modalInput, { flex: 1 }]} value={newLocationName} onChangeText={setNewLocationName} placeholder="Add new location..." placeholderTextColor={Colors.mutedForeground} />
                    <TouchableOpacity onPress={addLocation} style={s.addBtn}>
                      <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {(editConfigType === 'departments' || editConfigType === 'roles') && (
                <>
                  {Object.entries(editConfigData).map(([key, value]) => (
                    <View key={key} style={s.configEditRow}>
                      <Text style={s.configEditKey}>{key}</Text>
                      <TextInput style={[s.modalInput, { flex: 1 }]} value={value as string} onChangeText={v => setEditConfigData({ ...editConfigData, [key]: v })} />
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Dialog */}
      <AppDialog visible={dialog.visible} title={dialog.title} message={dialog.message}
        buttons={[{ text: 'OK', onPress: () => { setDialog({ ...dialog, visible: false }); dialog.onOk?.(); } }]}
        onDismiss={() => { setDialog({ ...dialog, visible: false }); dialog.onOk?.(); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground },
  tabTextActive: { color: Colors.primary },
  content: { padding: Spacing.md, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.mutedForeground, letterSpacing: 1, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.mutedForeground },

  // Users
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  userInfo: { flex: 1 },
  userTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userDisplay: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  userMeta: { fontSize: 11, color: Colors.mutedForeground, marginTop: 2 },
  userStatus: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  userActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },

  // Config
  configSection: { backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  configHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  configDesc: { fontSize: 11, color: Colors.mutedForeground, marginTop: 2 },
  editBtn: { flexDirection: 'row', gap: 4, backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: Colors.primary + '15', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  configRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  configKey: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground, fontFamily: 'monospace' },
  configValue: { fontSize: 13, fontWeight: '600', color: Colors.foreground },

  // Analytics
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  analyticsCard: { minWidth: '30%', flex: 1, backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  analyticsValue: { fontSize: 24, fontWeight: '800' },
  analyticsLabel: { fontSize: 9, fontWeight: '700', color: Colors.mutedForeground, marginTop: 2, letterSpacing: 0.5 },
  deptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  deptLabel: { fontSize: 13, fontWeight: '700', color: Colors.foreground },
  deptBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  deptCount: { fontSize: 12, fontWeight: '700' },

  // Reminder card
  reminderCard: { backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  reminderTitle: { fontSize: 14, fontWeight: '700', color: Colors.foreground, marginLeft: 6 },
  reminderDesc: { fontSize: 12, color: Colors.mutedForeground, lineHeight: 18, marginBottom: 6 },
  reminderBullet: { fontSize: 12, color: Colors.foreground, marginLeft: 4, lineHeight: 20 },
  triggerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, marginTop: 12 },
  triggerBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Audit
  auditCard: { backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditAction: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  auditTime: { fontSize: 10, color: Colors.mutedForeground },
  auditUser: { fontSize: 11, color: Colors.mutedForeground, marginTop: 2 },
  auditFile: { fontSize: 11, fontWeight: '600', color: Colors.primary, marginTop: 2 },
  auditDetails: { fontSize: 11, color: Colors.foreground, marginTop: 2 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 360, backgroundColor: Colors.card, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.foreground },
  modalSub: { fontSize: 12, color: Colors.mutedForeground, marginTop: 2, marginBottom: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: Colors.mutedForeground, letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  modalInput: { height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: Colors.foreground, backgroundColor: Colors.background },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: Colors.mutedForeground },
  modalConfirm: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 },
  modalConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Config Modal
  configModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  configModalTitle: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  removeBtn: { width: 38, height: 44, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 38, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#059669', borderRadius: 8 },
  configEditRow: { marginBottom: 12 },
  configEditKey: { fontSize: 11, fontWeight: '700', color: Colors.mutedForeground, letterSpacing: 0.5, marginBottom: 4, fontFamily: 'monospace' },
});
