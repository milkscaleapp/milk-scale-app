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
}
