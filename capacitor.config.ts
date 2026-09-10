import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.pocketledger.mobile',
  appName: 'Pocket Ledger',
  webDir: 'dist-native',
  backgroundColor: '#f5f2eb',
  plugins: {
    // MainActivity fits the complete web viewport between system bars/keyboard.
    SystemBars: { insetsHandling: 'disable' },
    LocalNotifications: { iconColor: '#C65D35' },
  },
};

export default config;
