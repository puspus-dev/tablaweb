import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'hu.tablaweb.app',
  appName: 'TáblaWeb',
  webDir: 'dist',
  server: {
    // Fejlesztéshez: élő reload a géped Vite szerveréről
    // android cleartext: true ha http://IP:5173-at használsz
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0f172a',
    },
  },
};

export default config;
