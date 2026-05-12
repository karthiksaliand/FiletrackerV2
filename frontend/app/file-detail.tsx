import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAPI } from '../constants/api';
import { Colors, Spacing, Radius, StatusColors, StatusLabels } from '../constants/theme';
import { AppDialog } from '../components/AppDialog';

const LOCATIONS = ["Mangaluru","Bantwal","Mulki","Moodabidri","Puttur","Sulya","Kadaba","Ullala","Belthangady"];
const ALL_STATUSES = ["draft","submitted","delayed","dc_approved","dc_rejected"];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value || 'N/A'}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { width: 100, fontSize: 12, fontWeight: '600', color: Colors.mutedForeground },
  value: { flex: 1, fontSize: 13, color: Colors.foreground },
});

export default function FileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string; onOk?: () => void }>({ visible: false, title: '', message: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSubmitFile, setConfirmSubmitFile] = useState(false);
  const [confirmDC, setConfirmDC] = useState<{ visible: boolean; decision: string }>({ visible: false, decision: '' });
  const [confirmADC, setConfirmADC] = useState<{ visible: boolean; decision: string }>({ visible: false, decision: '' });

  const showMsg = (title: string, message: string, onOk?: () => void) => {
    setDialog({ visible: true, title, message, onOk });
  };

  const loadFile = async () => {
    try {
      const data = await fetchAPI(`/files/${id}`);
      setFile(data);
    } catch (e: any) { showMsg('Error', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadFile(); }, [id]);

  const role = user?.role || '';
  const isAdmin = role === 'admin';

  // Admin Edit
  const openEditModal = () => {
    setEditData({
      file_no: file.file_no || '', year: file.year || '', description: file.description,
      tahsildar_location: file.tahsildar_location, status: file.status,
      is_locked: file.is_locked, priority: file.priority || 'normal',
      dc_decision: file.dc_decision || '', dc_remark: file.dc_remark || '',
      adc_remark: file.adc_remark || '', adc_decision: file.adc_decision || '',
    });
    setEditModal(true);
  };

  const saveAdminEdit = async () => {
    setActionLoading(true);
    try {
      await fetchAPI(`/admin/files/${id}`, { method: 'PUT', body: JSON.stringify(editData) });
      showMsg('Success', 'File updated');
      setEditModal(false);
      loadFile();
    } catch (e: any) { showMsg('Error', e.message); }
    finally { setActionLoading(false); }
  };

  const doDeleteFile = async () => {
    setConfirmDelete(false);
    setActionLoading(true);
    try {
      await fetchAPI(`/admin/files/${id}`, { method: 'DELETE' });
      showMsg('Deleted', 'File deleted', () => router.back());
    } catch (e: any) { showMsg('Error', e.message); }
    finally { setActionLoading(false); }
  };

  // Dept Approval
  const submitApproval = async (decision: string) => {
    setActionLoading(true);
    try {
      await fetchAPI(`/files/${id}/approval`, { method: 'POST', body: JSON.stringify({ decision, remark }) });
      showMsg('Success', `${decision.charAt(0).toUpperCase() + decision.slice(1)}d`);
      setRemark('');
      loadFile();
    } catch (e: any) { showMsg('Error', e.message); }
    finally { setActionLoading(false); }
  };

  // ADC
  const submitADCRemark = async () => {
    if (!remark.trim()) { showMsg('Error', 'Enter a remark'); return; }
    setActionLoading(true);
    try {
      await fetchAPI(`/files/${id}/adc-remark`, { method: 'POST', body: JSON.stringify({ remark }) });
      showMsg('Success', 'Remark added');
      setRemark(''); loadFile();
    } catch (e: any) { showMsg('Error', e.message); }
    finally { setActionLoading(false); }
  };

  const doADCDecision = async () => {
    const decision = confirmADC.decision;
    setConfirmADC({ visible: false, decision: '' });
    setActionLoading(true);
    try {
      await fetchAPI(`/files/${id}/adc-decision`, { method: 'POST', body: JSON.stringify({ decision, remark }) });
      showMsg('Success', `ADC ${decision}d`);
      setRemark(''); loadFile();
    } catch (e: any) { showMsg('Error', e.message); }
    finally { setActionLoading(false); }
  };

  // DC
  const doDCDecision = async () => {
    const decision = confirmDC.decision;
    setConfirmDC({ visible: false, decision: '' });
    setActionLoading(true);
    try {
      await fetchAPI(`/files/${id}/dc-decision`, { method: 'POST', body: JSON.stringify({ decision, remark }) });
      showMsg('Success', `File ${decision}ed`);
      setRemark(''); loadFile();
    } catch (e: any) { showMsg('Error', e.message); }
    finally { setActionLoading(false); }
  };

  // Submit file
  const doSubmitFile = async () => {
    setConfirmSubmitFile(false);
    setActionLoading(true);
    try {
      await fetchAPI(`/files/${id}/submit`, { method: 'POST' });
      showMsg('Success', 'File submitted');
      loadFile();
    } catch (e: any) { showMsg('Error', e.message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View></SafeAreaView>;
  if (!file) return <SafeAreaView style={s.container}><View style={s.center}><Text>File not found</Text></View></SafeAreaView>;

  const isHighPriority = file.priority === 'high';
  const daysLeft = file.deadline ? Math.ceil((new Date(file.deadline).getTime() - Date.now()) / (1000 * 86400)) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const myApproval = file.approvals?.find((a: any) => {
    if (role === 'tahsildar') return a.department === 'tahsildar' && a.department_detail === user?.department;
    if (role === 'sp') return a.department === 'sp';
    if (role === 'forest_officer') return a.department === 'forest';
    return false;
  });

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.fileNumber}>{file.file_number}</Text>
        </View>
        {isAdmin && (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={openEditModal} style={s.iconBtn}>
              <MaterialCommunityIcons name="pencil" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConfirmDelete(true)} style={s.iconBtn}>
              <MaterialCommunityIcons name="delete" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {actionLoading && <View style={s.loadingBar}><ActivityIndicator color={Colors.primary} /></View>}

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Priority + Status Banner */}
        <View style={[s.statusBanner, { backgroundColor: StatusColors[file.status] + '15' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isHighPriority && <MaterialCommunityIcons name="alert-circle" size={16} color="#DC2626" />}
            <Text style={[s.statusText, { color: StatusColors[file.status] }]}>{StatusLabels[file.status] || file.status}</Text>
            {isHighPriority && <View style={s.priorityTag}><Text style={s.priorityTagText}>HIGH PRIORITY</Text></View>}
          </View>
          {daysLeft !== null && file.status === 'submitted' && (
            <Text style={[s.deadlineText, isOverdue && { color: '#DC2626' }]}>
              {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
            </Text>
          )}
        </View>

        {/* File Details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>FILE DETAILS</Text>
          <InfoRow label="File No" value={file.file_no || 'N/A'} />
          <InfoRow label="Year" value={file.year || 'N/A'} />
          <InfoRow label="Description" value={file.description} />
          <InfoRow label="Tahsildar" value={file.tahsildar_location} />
          <InfoRow label="Departments" value={(file.departments || []).join(', ').toUpperCase()} />
          <InfoRow label="Priority" value={(file.priority || 'normal').toUpperCase()} />
          <InfoRow label="Created By" value={file.created_by_name} />
          <InfoRow label="Created" value={new Date(file.created_at).toLocaleString()} />
          {file.deadline && <InfoRow label="Deadline" value={new Date(file.deadline).toLocaleDateString()} />}
        </View>

        {/* Submit Button (Draft) */}
        {file.status === 'draft' && (role === 'case_worker' || isAdmin) && (
          <TouchableOpacity style={s.actionBtn} onPress={() => setConfirmSubmitFile(true)}>
            <MaterialCommunityIcons name="send" size={18} color="#FFF" />
            <Text style={s.actionBtnText}>Submit to Departments</Text>
          </TouchableOpacity>
        )}

        {/* Approvals */}
        {file.approvals && file.approvals.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>
              {(role === 'tahsildar' || role === 'sp' || role === 'forest_officer') ? 'YOUR APPROVAL STATUS' : 'DEPARTMENT APPROVALS'}
            </Text>
            {file.approvals.map((a: any) => {
              const decColor = a.decision === 'approve' ? '#059669' : a.decision === 'reject' ? '#DC2626' : a.decision === 'na' ? '#94A3B8' : '#F59E0B';
              const decLabel = a.decision === 'approve' ? 'APPROVED' : a.decision === 'reject' ? 'REJECTED' : a.decision === 'na' ? 'N/A' : 'PENDING';
              const deadlineDays = file.deadline ? Math.ceil((new Date(file.deadline).getTime() - Date.now()) / (1000 * 86400)) : null;
              return (
                <View key={a.id} style={ap.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={ap.dept}>{a.department.toUpperCase()} {a.department_detail ? `(${a.department_detail})` : ''}</Text>
                    {a.remark ? <Text style={ap.remark}>Remark: {a.remark}</Text> : null}
                    {a.decided_at ? <Text style={ap.date}>{new Date(a.decided_at).toLocaleString()}</Text> : null}
                    {!a.decision && deadlineDays !== null && (
                      <Text style={[ap.deadline, deadlineDays < 0 && { color: '#DC2626' }]}>
                        {deadlineDays < 0 ? `${Math.abs(deadlineDays)}d overdue` : `${deadlineDays}d left`}
                      </Text>
                    )}
                  </View>
                  <View style={[ap.badge, { backgroundColor: decColor + '20' }]}>
                    <Text style={[ap.badgeText, { color: decColor }]}>{decLabel}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* My Approval Action (Tahsildar / SP / Forest) */}
        {myApproval && !myApproval.is_locked && (
          <View style={s.card}>
            <Text style={s.cardTitle}>YOUR ACTION REQUIRED</Text>
            <TextInput style={s.remarkInput} value={remark} onChangeText={setRemark} placeholder="Add remark (optional)" placeholderTextColor={Colors.mutedForeground} multiline />
            <View style={s.approvalBtns}>
              <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#059669' }]} onPress={() => submitApproval('approve')}>
                <MaterialCommunityIcons name="check-bold" size={16} color="#FFF" />
                <Text style={s.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#DC2626' }]} onPress={() => submitApproval('reject')}>
                <MaterialCommunityIcons name="close-thick" size={16} color="#FFF" />
                <Text style={s.approveBtnText}>Reject</Text>
              </TouchableOpacity>
              {role === 'forest_officer' && (
                <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#94A3B8' }]} onPress={() => submitApproval('na')}>
                  <Text style={s.approveBtnText}>N/A</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ADC Section */}
        {(role === 'adc' || isAdmin) && file.status !== 'draft' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>ADC DECISION</Text>
            {file.adc_decision && (
              <View style={[ap.badge, { backgroundColor: file.adc_decision === 'approve' ? '#05966920' : '#DC262620', alignSelf: 'flex-start', marginBottom: 8 }]}>
                <Text style={[ap.badgeText, { color: file.adc_decision === 'approve' ? '#059669' : '#DC2626' }]}>
                  {file.adc_decision === 'approve' ? 'APPROVED' : 'REJECTED'}
                </Text>
              </View>
            )}
            {file.adc_remark ? <Text style={s.existingRemark}>Remark: {file.adc_remark}</Text> : null}

            {!file.adc_decision && role === 'adc' && (
              <>
                <TextInput style={s.remarkInput} value={remark} onChangeText={setRemark} placeholder="Add remark" placeholderTextColor={Colors.mutedForeground} multiline />
                <View style={s.approvalBtns}>
                  <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#059669' }]} onPress={() => setConfirmADC({ visible: true, decision: 'approve' })}>
                    <MaterialCommunityIcons name="check-bold" size={16} color="#FFF" />
                    <Text style={s.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#DC2626' }]} onPress={() => setConfirmADC({ visible: true, decision: 'reject' })}>
                    <MaterialCommunityIcons name="close-thick" size={16} color="#FFF" />
                    <Text style={s.approveBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[s.approveBtn, { backgroundColor: Colors.primary, marginTop: 8, alignSelf: 'stretch' }]} onPress={submitADCRemark}>
                  <Text style={s.approveBtnText}>Add Remark Only</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* DC Section */}
        {(role === 'dc' || isAdmin) && file.status !== 'draft' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>DC FINAL DECISION</Text>
            {file.dc_decision ? (
              <View style={[ap.badge, { backgroundColor: file.dc_decision === 'accept' ? '#05966920' : '#DC262620', alignSelf: 'flex-start' }]}>
                <Text style={[ap.badgeText, { color: file.dc_decision === 'accept' ? '#059669' : '#DC2626' }]}>
                  {file.dc_decision === 'accept' ? 'ACCEPTED' : 'REJECTED'}
                </Text>
              </View>
            ) : role === 'dc' ? (
              <>
                <TextInput style={s.remarkInput} value={remark} onChangeText={setRemark} placeholder="Add remark (optional)" placeholderTextColor={Colors.mutedForeground} multiline />
                <View style={s.approvalBtns}>
                  <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#059669' }]} onPress={() => setConfirmDC({ visible: true, decision: 'accept' })}>
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#FFF" />
                    <Text style={s.approveBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#DC2626' }]} onPress={() => setConfirmDC({ visible: true, decision: 'reject' })}>
                    <MaterialCommunityIcons name="close-octagon" size={16} color="#FFF" />
                    <Text style={s.approveBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={s.existingRemark}>No decision yet</Text>
            )}
            {file.dc_remark ? <Text style={s.existingRemark}>DC Remark: {file.dc_remark}</Text> : null}
          </View>
        )}

        {/* Audit Log - Admin only */}
        {role === 'admin' && file.audit_log && file.audit_log.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>AUDIT LOG</Text>
            {file.audit_log.slice(0, 10).map((log: any) => (
              <View key={log.id} style={al.row}>
                <Text style={al.action}>{log.action}</Text>
                <Text style={al.detail}>{log.details}</Text>
                <Text style={al.time}>{log.user_name} | {new Date(log.timestamp).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Admin Edit Modal */}
      <Modal visible={editModal} animationType="slide">
        <SafeAreaView style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => setEditModal(false)} style={s.backBtn}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.foreground} />
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: Colors.foreground, textAlign: 'center' }}>Admin Edit</Text>
            <TouchableOpacity onPress={saveAdminEdit} style={s.iconBtn}>
              <MaterialCommunityIcons name="check" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={s.editField}><Text style={s.editLabel}>FILE NO</Text><TextInput style={s.editInput} value={editData.file_no} onChangeText={v => setEditData({ ...editData, file_no: v })} /></View>
              <View style={s.editField}><Text style={s.editLabel}>YEAR</Text><TextInput style={s.editInput} value={editData.year} onChangeText={v => setEditData({ ...editData, year: v })} /></View>
              <View style={s.editField}><Text style={s.editLabel}>DESCRIPTION</Text><TextInput style={[s.editInput, { height: 80, textAlignVertical: 'top' }]} value={editData.description} onChangeText={v => setEditData({ ...editData, description: v })} multiline /></View>
              <View style={s.editField}><Text style={s.editLabel}>PRIORITY</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['normal', 'high'].map(p => (
                    <TouchableOpacity key={p} style={[s.editInput, { flex: 1, alignItems: 'center' }, editData.priority === p && { borderColor: p === 'high' ? '#DC2626' : Colors.primary }]} onPress={() => setEditData({ ...editData, priority: p })}>
                      <Text style={{ color: editData.priority === p ? (p === 'high' ? '#DC2626' : Colors.primary) : Colors.mutedForeground, fontWeight: '600' }}>{p.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.editField}><Text style={s.editLabel}>STATUS</Text>
                <TouchableOpacity style={s.editInput} onPress={() => setShowStatusPicker(true)}>
                  <Text style={{ color: Colors.foreground }}>{StatusLabels[editData.status] || editData.status}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.editField}><Text style={s.editLabel}>LOCATION</Text>
                <TouchableOpacity style={s.editInput} onPress={() => setShowLocPicker(true)}>
                  <Text style={{ color: Colors.foreground }}>{editData.tahsildar_location}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#DC2626', marginTop: 16 }]} onPress={() => { setEditModal(false); setTimeout(() => setConfirmDelete(true), 300); }}>
                <MaterialCommunityIcons name="delete-forever" size={18} color="#FFF" />
                <Text style={s.actionBtnText}>Delete File</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>

          <Modal visible={showLocPicker} transparent animationType="slide">
            <View style={s.pickerOverlay}><View style={s.pickerContent}>
              <Text style={s.pickerTitle}>Select Location</Text>
              <FlatList data={LOCATIONS} keyExtractor={i => i} renderItem={({ item }) => (
                <TouchableOpacity style={s.pickerItem} onPress={() => { setEditData({ ...editData, tahsildar_location: item }); setShowLocPicker(false); }}>
                  <Text style={[s.pickerItemText, editData.tahsildar_location === item && { fontWeight: '700', color: Colors.primary }]}>{item}</Text>
                </TouchableOpacity>
              )} />
              <TouchableOpacity style={s.pickerClose} onPress={() => setShowLocPicker(false)}><Text style={s.pickerCloseText}>Cancel</Text></TouchableOpacity>
            </View></View>
          </Modal>

          <Modal visible={showStatusPicker} transparent animationType="slide">
            <View style={s.pickerOverlay}><View style={s.pickerContent}>
              <Text style={s.pickerTitle}>Select Status</Text>
              <FlatList data={ALL_STATUSES} keyExtractor={i => i} renderItem={({ item }) => (
                <TouchableOpacity style={s.pickerItem} onPress={() => { setEditData({ ...editData, status: item }); setShowStatusPicker(false); }}>
                  <Text style={[s.pickerItemText, editData.status === item && { fontWeight: '700', color: Colors.primary }]}>{StatusLabels[item] || item}</Text>
                </TouchableOpacity>
              )} />
              <TouchableOpacity style={s.pickerClose} onPress={() => setShowStatusPicker(false)}><Text style={s.pickerCloseText}>Cancel</Text></TouchableOpacity>
            </View></View>
          </Modal>
        </SafeAreaView>
      </Modal>

      {/* Dialogs */}
      <AppDialog visible={dialog.visible} title={dialog.title} message={dialog.message}
        buttons={[{ text: 'OK', onPress: () => { setDialog({ ...dialog, visible: false }); dialog.onOk?.(); } }]}
        onDismiss={() => { setDialog({ ...dialog, visible: false }); dialog.onOk?.(); }} />
      <AppDialog visible={confirmDelete} title="Delete File" message={`Permanently delete ${file?.file_number}?`}
        buttons={[{ text: 'Cancel', style: 'cancel', onPress: () => setConfirmDelete(false) }, { text: 'Delete', style: 'destructive', onPress: doDeleteFile }]}
        onDismiss={() => setConfirmDelete(false)} />
      <AppDialog visible={confirmSubmitFile} title="Submit File" message="Lock and send to departments?"
        buttons={[{ text: 'Cancel', style: 'cancel', onPress: () => setConfirmSubmitFile(false) }, { text: 'Submit', onPress: doSubmitFile }]}
        onDismiss={() => setConfirmSubmitFile(false)} />
      <AppDialog visible={confirmDC.visible} title="DC Decision" message={`${confirmDC.decision} this file?`}
        buttons={[{ text: 'Cancel', style: 'cancel', onPress: () => setConfirmDC({ visible: false, decision: '' }) }, { text: confirmDC.decision === 'reject' ? 'Reject' : 'Accept', style: confirmDC.decision === 'reject' ? 'destructive' : 'default', onPress: doDCDecision }]}
        onDismiss={() => setConfirmDC({ visible: false, decision: '' })} />
      <AppDialog visible={confirmADC.visible} title="ADC Decision" message={`${confirmADC.decision} this file?`}
        buttons={[{ text: 'Cancel', style: 'cancel', onPress: () => setConfirmADC({ visible: false, decision: '' }) }, { text: confirmADC.decision === 'reject' ? 'Reject' : 'Approve', style: confirmADC.decision === 'reject' ? 'destructive' : 'default', onPress: doADCDecision }]}
        onDismiss={() => setConfirmADC({ visible: false, decision: '' })} />
    </SafeAreaView>
  );
}

const ap = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dept: { fontSize: 12, fontWeight: '700', color: Colors.foreground },
  remark: { fontSize: 11, color: Colors.mutedForeground, marginTop: 2 },
  date: { fontSize: 10, color: Colors.mutedForeground, marginTop: 2 },
  deadline: { fontSize: 10, color: '#F59E0B', fontWeight: '600', marginTop: 2 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
});

const al = StyleSheet.create({
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  action: { fontSize: 12, fontWeight: '700', color: Colors.foreground },
  detail: { fontSize: 11, color: Colors.mutedForeground, marginTop: 1 },
  time: { fontSize: 10, color: Colors.mutedForeground, marginTop: 2 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 8 },
  backBtn: { padding: 8 },
  iconBtn: { padding: 8 },
  fileNumber: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  loadingBar: { paddingVertical: 4, alignItems: 'center' },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  statusBanner: { borderRadius: Radius.sm, padding: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '800' },
  priorityTag: { backgroundColor: '#DC262620', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  priorityTagText: { fontSize: 9, fontWeight: '800', color: '#DC2626' },
  deadlineText: { fontSize: 11, fontWeight: '600', color: Colors.mutedForeground },
  card: { backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 11, fontWeight: '700', color: Colors.mutedForeground, letterSpacing: 0.5, marginBottom: 8 },
  actionBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, height: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  remarkInput: { backgroundColor: Colors.background, borderRadius: Radius.sm, padding: 12, fontSize: 13, color: Colors.foreground, borderWidth: 1, borderColor: Colors.border, minHeight: 50, textAlignVertical: 'top', marginBottom: 8 },
  existingRemark: { fontSize: 12, color: Colors.mutedForeground, marginBottom: 6, fontStyle: 'italic' },
  approvalBtns: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, height: 42, borderRadius: Radius.sm, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  editField: { marginBottom: 14 },
  editLabel: { fontSize: 11, fontWeight: '700', color: Colors.mutedForeground, letterSpacing: 0.5, marginBottom: 4 },
  editInput: { backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 12, fontSize: 14, color: Colors.foreground, borderWidth: 1, borderColor: Colors.border },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%', padding: 16 },
  pickerTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerItemText: { fontSize: 15, color: Colors.foreground },
  pickerClose: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  pickerCloseText: { fontSize: 15, fontWeight: '600', color: Colors.mutedForeground },
});
