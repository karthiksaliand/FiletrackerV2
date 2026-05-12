import React from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Platform,
} from 'react-native';

interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AppDialogProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: DialogButton[];
  onDismiss?: () => void;
}

export function AppDialog({ visible, title, message, buttons, onDismiss }: AppDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={s.overlay} onPress={onDismiss}>
        <Pressable style={s.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <View style={s.buttonRow}>
            {buttons.map((btn, idx) => (
              <Pressable
                key={idx}
                role="button"
                aria-label={btn.text}
                style={({ pressed }) => [
                  s.button,
                  btn.style === 'destructive' && s.destructiveButton,
                  btn.style === 'cancel' && s.cancelButton,
                  btn.style !== 'destructive' && btn.style !== 'cancel' && s.defaultButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={btn.onPress}
              >
                <Text
                  style={[
                    s.buttonText,
                    btn.style === 'destructive' && s.destructiveButtonText,
                    btn.style === 'cancel' && s.cancelButtonText,
                  ]}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dialog: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: '#1A1A2E',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  cancelButtonText: {
    color: '#64748B',
  },
  destructiveButtonText: {
    color: '#FFF',
  },
});
