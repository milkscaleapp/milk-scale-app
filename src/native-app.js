import { App } from '@capacitor/app';

window.MilkScaleNativeApp = App;

if (window.Capacitor?.isNativePlatform?.()) {
  App.addListener('backButton', () => {
    if (typeof window.handleAppBack === 'function') {
      window.handleAppBack();
    } else {
      App.exitApp();
    }
  }).catch(error => console.warn('Native back listener:', error));

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && typeof window.refreshActiveFilePresence === 'function') {
      window.refreshActiveFilePresence().catch(error => console.warn('File refresh:', error));
    }
  }).catch(error => console.warn('App state listener:', error));
}
