import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openskytechnologies.paycheckpathfinder',
  appName: 'Paycheck Pathfinder',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
      hideFormAccessoryBar: false
    }
  }
};

export default config;
