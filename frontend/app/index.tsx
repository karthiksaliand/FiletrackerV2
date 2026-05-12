import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, Radius } from '../constants/theme';
import { AppDialog } from '../components/AppDialog';
import { fetchAPI } from '../constants/api';

const DEFAULT_ROLES = [
  { key: 'case_worker', label: 'Case Worker', icon: 'file-document-edit', user: 'caseworker', pass: 'case123', color: '#2563EB' },
  { key: 'admin', label: 'System Admin', icon: 'shield-crown', user: 'admin', pass: 'admin123', color: '#7C3AED' },
  { key: 'sp', label: 'Superintendent of Police', icon: 'shield-star', user: 'sp', pass: 'sp123', color: '#0891B2' },
  { key: 'forest_officer', label: 'Forest Officer (DFO/DCF)', icon: 'pine-tree', user: 'forest', pass: 'forest123', color: '#059669' },
  { key: 'adc', label: 'Asst. Commissioner (ADC)', icon: 'account-tie', user: 'adc', pass: 'adc123', color: '#D97706' },
  { key: 'dc', label: 'Deputy Commissioner (DC)', icon: 'gavel', user: 'dc', pass: 'dc123', color: '#DC2626' },
];

const DEFAULT_TAHSILDARS = [
  { key: 'tah_mangaluru', label: 'Mangaluru', user: 'tah_mangaluru' },
  { key: 'tah_bantwal', label: 'Bantwal', user: 'tah_bantwal' },
  { key: 'tah_mulki', label: 'Mulki', user: 'tah_mulki' },
  { key: 'tah_moodabidri', label: 'Moodabidri', user: 'tah_moodabidri' },
  { key: 'tah_puttur', label: 'Puttur', user: 'tah_puttur' },
  { key: 'tah_sulya', label: 'Sulya', user: 'tah_sulya' },
  { key: 'tah_kadaba', label: 'Kadaba', user: 'tah_kadaba' },
  { key: 'tah_ullala', label: 'Ullala', user: 'tah_ullala' },
  { key: 'tah_belthangady', label: 'Belthangady', user: 'tah_belthangady' },
];

export default function LoginScreen() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ visible: false, title: '', message: '' });
  const [showTahsildars, setShowTahsildars] = useState(false);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [tahsildars, setTahsildars] = useState(DEFAULT_TAHSILDARS);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Fetch dynamic login labels from backend
  useEffect(() => {
    const loadLoginConfig = async () => {
      try {
        const config = await fetchAPI('/public/login-config');
        if (config?.role_labels) {
          setRoles(prev => prev.map(r => ({
            ...r,
            label: config.role_labels[r.key] || r.label,
          })));
        }
        if (config?.tahsildar_locations && config.tahsildar_locations.length > 0) {
          setTahsildars(config.tahsildar_locations.map((loc: string) => ({
            key: `tah_${loc.toLowerCase().replace(/\s+/g, '_')}`,
            label: loc,
            user: `tah_${loc.toLowerCase().replace(/\s+/g, '_')}`,
          })));
        }
      } catch (e) {
        console.log('Using default login config');
      } finally {
        setConfigLoaded(true);
      }
    };
    loadLoginConfig();
  }, []);

  if (!isLoading && user) {
    return <Redirect href="/(tabs)" />;
  }

  const selectRole = (role: any) => {
    setSelectedRole(role);
    setUsername(role.user);
    setPassword('');
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorDialog({ visible: true, title: 'Error', message: 'Please enter username and password' });
      return;
    }
    setLoggingIn(true);
    try {
      await login(username.trim(), password.trim());
    } catch (e: any) {
      setErrorDialog({ visible: true, title: 'Login Failed', message: e.message || 'Invalid credentials' });
    } finally {
      setLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <MaterialCommunityIcons name="file-lock" size={40} color={Colors.primary} />
            <Text style={s.title}>Government File Tracker</Text>
            <Text style={s.subtitle}>Dakshina Kannada District</Text>
          </View>

          {selectedRole ? (
            /* Login Form */
            <View style={s.loginForm}>
              <TouchableOpacity style={s.backBtn} onPress={() => { setSelectedRole(null); setShowTahsildars(false); }}>
                <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.primary} />
                <Text style={s.backText}>Back to roles</Text>
              </TouchableOpacity>

              <View style={[s.selectedBadge, { backgroundColor: selectedRole.color || '#1A1A2E' }]}>
                <MaterialCommunityIcons name={selectedRole.icon || 'account'} size={20} color="#FFF" />
                <Text style={s.selectedLabel}>{selectedRole.label}</Text>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>USERNAME</Text>
                <TextInput testID="username-input" style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor={Colors.mutedForeground} />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>PASSWORD</Text>
                <TextInput testID="password-input" style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={Colors.mutedForeground} />
              </View>

              <TouchableOpacity testID="login-btn" style={s.loginBtn} onPress={handleLogin} disabled={loggingIn} activeOpacity={0.7}>
                {loggingIn ? <ActivityIndicator color="#FFF" /> : <Text style={s.loginBtnText}>SIGN IN</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            /* Role Selection */
            <View style={s.roleGrid}>
              <Text style={s.sectionTitle}>Select Your Role</Text>

              {roles.map(role => (
                <TouchableOpacity key={role.key} style={s.roleCard} onPress={() => selectRole(role)} activeOpacity={0.7}>
                  <View style={[s.roleIcon, { backgroundColor: role.color + '18' }]}>
                    <MaterialCommunityIcons name={role.icon as any} size={24} color={role.color} />
                  </View>
                  <Text style={s.roleLabel}>{role.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.mutedForeground} />
                </TouchableOpacity>
              ))}

              {/* Tahsildar Group */}
              <TouchableOpacity style={s.roleCard} onPress={() => setShowTahsildars(!showTahsildars)} activeOpacity={0.7}>
                <View style={[s.roleIcon, { backgroundColor: '#F59E0B18' }]}>
                  <MaterialCommunityIcons name="map-marker-multiple" size={24} color="#F59E0B" />
                </View>
                <Text style={s.roleLabel}>Tahsildars ({tahsildars.length})</Text>
                <MaterialCommunityIcons name={showTahsildars ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.mutedForeground} />
              </TouchableOpacity>

              {showTahsildars && tahsildars.map(t => (
                <TouchableOpacity key={t.key} style={[s.roleCard, s.subRole]} onPress={() => selectRole({ ...t, icon: 'map-marker', color: '#F59E0B', pass: 'tah123' })} activeOpacity={0.7}>
                  <View style={[s.roleIcon, { backgroundColor: '#F59E0B10', width: 32, height: 32 }]}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="#F59E0B" />
                  </View>
                  <Text style={s.roleLabel}>Tahsildar - {t.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AppDialog
        visible={errorDialog.visible}
        title={errorDialog.title}
        message={errorDialog.message}
        buttons={[{ text: 'OK', onPress: () => setErrorDialog({ ...errorDialog, visible: false }) }]}
        onDismiss={() => setErrorDialog({ ...errorDialog, visible: false })}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.foreground, marginTop: 8 },
  subtitle: { fontSize: 13, color: Colors.mutedForeground, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  roleGrid: { gap: 6 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: Radius.md, padding: 14, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  subRole: { marginLeft: 24, borderColor: '#F59E0B30' },
  roleIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  roleLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.foreground },
  loginForm: { gap: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
  },
  selectedLabel: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  inputGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.mutedForeground, letterSpacing: 1 },
  input: {
    backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14,
    fontSize: 15, color: Colors.foreground, borderWidth: 1, borderColor: Colors.border,
  },
  loginBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primaryForeground, letterSpacing: 1 },
});
