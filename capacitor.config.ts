import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pricio.app',
  appName: 'Pricio',
  webDir: 'dummy-web',
  server: {
    url: 'http://192.168.1.119:3000',
    cleartext: true,
  },
  ios: {
    minVersion: '14.0',
  } as any, // Type assertion to bypass the TypeScript error
};

export default config;
