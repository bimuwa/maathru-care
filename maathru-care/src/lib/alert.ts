import { Alert, Platform } from 'react-native';

// Alert.alert is a no-op on react-native-web; use the browser dialog there.
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
