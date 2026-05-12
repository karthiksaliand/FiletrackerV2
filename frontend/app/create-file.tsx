import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAPI } from '../constants/api';
import { Colors, Spacing, Radius } from '../constants/theme';
import { AppDialog } from '../components/AppDialog';

const LOCATIONS = [
  "Mangaluru", "Bantwal", "Mulki", "Moodabidri",
  "Puttur", "Sulya", "Kadaba", "Ullala", "Belthangady"
];

const DEPT_OPTIONS = [
  { key: 'tahsildar', label: 'Tahsildar', icon: 'map-marker', color: '#F59E0B' },
  { key: 'sp', label: 'SP (Police)', icon: 'shield-star', color: '#0891B2' },
  { key: 'forest', label: 'Forest Department', icon: 'pine-tree', color: '#059669' },
];

export default function CreateFileScreen() {
  const router = useRouter();
  const [fileNo, setFileNo] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');
  const [tahsildarLocation, setTahsildarLocation] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['tahsildar', 'sp', 'forest']);
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string; onOk?: () => void }>({ visible: false, title: '', message: '' });
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const showMsg = (title: string, message: string, onOk?: () => void) => {
    setDialog({ visible: true, title, message, onOk });
  };

  const toggleDept = (dept: string) => {
    setSelectedDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
  };

  const validate = () => {
    if (!fileNo.trim() || !year.trim() || !description.trim()) {
      showMsg('Validation', 'Please fill in File No, Year, and Description');
      return false;
    }
    if (selectedDepts.includes('tahsildar') && !tahsildarLocation) {
      showMsg('Validation', 'Please select a Tahsildar location');
      return false;
    }
    if (selectedDepts.length === 0) {
      showMsg('Validation', 'Please select at least one department');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await fetchAPI('/files', {
        method: 'POST',
        body: JSON.stringify({
          file_no: fileNo.trim(), year: year.trim(), description: description.trim(),
          tahsildar_location: tahsildarLocation || LOCATIONS[0],
          departments: selectedDepts, priority,
        }),
      });
      showMsg('Success', 'File saved as draft', () => router.back());
    } catch (e: any) {
      showMsg('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const doSubmit = async () => {
    setConfirmSubmit(false);
    setSubmitting(true);
    try {
      const file = await fetchAPI('/files', {
        method: 'POST',
        body: JSON.stringify({
          file_no: fileNo.trim(), year: year.trim(), description: description.trim(),
          tahsildar_location: tahsildarLocation || LOCATIONS[0],
          departments: selectedDepts, priority,
        }),
      });
      await fetchAPI(`/files/${file.id}/submit`, { method: 'POST' });
      showMsg('Success', `File ${file.file_number} submitted to ${selectedDepts.join(', ')}!`, () => router.back());
    } catch (e: any) {
      showMsg('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create New File</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          {/* Priority Toggle */}
          <View style={s.priorityRow}>
            <Text style={s.label}>PRIORITY</Text>
            <View style={s.priorityToggle}>
              <TouchableOpacity style={[s.priorityBtn, priority === 'normal' && s.priorityBtnActive]} onPress={() => setPriority('normal')}>
                <Text style={[s.priorityBtnText, priority === 'normal' && s.priorityBtnTextActive]}>Normal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.priorityBtn, s.priorityBtnHigh, priority === 'high' && s.priorityBtnHighActive]} onPress={() => setPriority('high')}>
                <MaterialCommunityIcons name="alert-circle" size={14} color={priority === 'high' ? '#FFF' : '#DC2626'} />
                <Text style={[s.priorityBtnText, { color: priority === 'high' ? '#FFF' : '#DC2626' }]}>High</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>FILE NO *</Text>
            <TextInput style={s.input} value={fileNo} onChangeText={setFileNo} placeholder="Enter file number" placeholderTextColor={Colors.mutedForeground} />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>YEAR *</Text>
            <TextInput style={s.input} value={year} onChangeText={setYear} placeholder="e.g. 2025" placeholderTextColor={Colors.mutedForeground} keyboardType="number-pad" />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>DESCRIPTION *</Text>
            <TextInput style={[s.input, s.textArea]} value={description} onChangeText={setDescription} placeholder="File description" placeholderTextColor={Colors.mutedForeground} multiline />
          </View>

          {/* Department Selection */}
          <View style={s.inputGroup}>
            <Text style={s.label}>SELECT DEPARTMENTS *</Text>
            <View style={s.deptGrid}>
              {DEPT_OPTIONS.map(d => {
                const selected = selectedDepts.includes(d.key);
                return (
                  <TouchableOpacity key={d.key} style={[s.deptCard, selected && { borderColor: d.color, backgroundColor: d.color + '10' }]} onPress={() => toggleDept(d.key)} activeOpacity={0.7}>
                    <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={selected ? d.color : Colors.mutedForeground} />
                    <MaterialCommunityIcons name={d.icon as any} size={18} color={selected ? d.color : Colors.mutedForeground} />
                    <Text style={[s.deptLabel, selected && { color: d.color, fontWeight: '700' }]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tahsildar Location (only if tahsildar selected) */}
          {selectedDepts.includes('tahsildar') && (
            <View style={s.inputGroup}>
              <Text style={s.label}>TAHSILDAR LOCATION *</Text>
              <TouchableOpacity style={s.picker} onPress={() => setShowPicker(true)}>
                <Text style={tahsildarLocation ? s.pickerText : s.pickerPlaceholder}>
                  {tahsildarLocation || 'Select location'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={s.actions}>
            <TouchableOpacity style={s.draftBtn} onPress={handleSaveDraft} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={s.draftBtnText}>Save Draft</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.submitBtn} onPress={() => { if (validate()) setConfirmSubmit(true); }} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitBtnText}>Submit File</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Location Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Select Tahsildar Location</Text>
            <FlatList
              data={LOCATIONS}
              keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.modalItem} onPress={() => { setTahsildarLocation(item); setShowPicker(false); }}>
                  <Text style={[s.modalItemText, tahsildarLocation === item && { fontWeight: '700', color: Colors.primary }]}>{item}</Text>
                  {tahsildarLocation === item && <MaterialCommunityIcons name="check" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={s.modalClose} onPress={() => setShowPicker(false)}>
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppDialog visible={dialog.visible} title={dialog.title} message={dialog.message}
        buttons={[{ text: 'OK', onPress: () => { setDialog({ ...dialog, visible: false }); dialog.onOk?.(); } }]}
        onDismiss={() => { setDialog({ ...dialog, visible: false }); dialog.onOk?.(); }} />

      <AppDialog visible={confirmSubmit} title="Submit File"
        message={`Submit to: ${selectedDepts.join(', ').toUpperCase()}\nPriority: ${priority.toUpperCase()}\n\nOnce submitted, the file will be locked.`}
        buttons={[
          { text: 'Cancel', style: 'cancel', onPress: () => setConfirmSubmit(false) },
          { text: 'Submit', onPress: doSubmit },
        ]}
        onDismiss={() => setConfirmSubmit(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 8 },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.foreground },
  form: { padding: Spacing.md, gap: 16, paddingBottom: 40 },
  priorityRow: { gap: 6 },
  priorityToggle: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, height: 40, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  priorityBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  priorityBtnHigh: { borderColor: '#DC262640', flexDirection: 'row', gap: 4 },
  priorityBtnHighActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  priorityBtnText: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  priorityBtnTextActive: { color: Colors.primary },
  inputGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.mutedForeground, letterSpacing: 1 },
  input: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, fontSize: 15, color: Colors.foreground, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  deptGrid: { gap: 6 },
  deptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
    backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.border,
  },
  deptLabel: { fontSize: 14, color: Colors.foreground },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.border },
  pickerText: { fontSize: 15, color: Colors.foreground },
  pickerPlaceholder: { fontSize: 15, color: Colors.mutedForeground },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  draftBtn: { flex: 1, height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary },
  draftBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  submitBtn: { flex: 1, height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%', padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.foreground, textAlign: 'center', marginBottom: 12 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalItemText: { fontSize: 15, color: Colors.foreground },
  modalClose: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: Colors.mutedForeground },
});
