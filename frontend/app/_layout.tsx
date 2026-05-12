import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-file" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="file-detail" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
