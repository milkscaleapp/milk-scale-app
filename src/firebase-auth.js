import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

let verificationId = null;
let listeners = [];
let eventHandler = null;

async function clearPhoneListeners() {
  for (const listener of listeners) {
    try { await listener.remove(); } catch (_) {}
  }
  listeners = [];
}

async function getCurrentUser() {
  const result = await FirebaseAuthentication.getCurrentUser();
  return result?.user || null;
}

async function sendCode(phoneNumber, onState) {
  if (!window.Capacitor?.isNativePlatform?.()) {
    throw new Error('OTP login is currently available only in the Android app.');
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    throw new Error('मोबाइल नंबर country code सहित सही होना चाहिए। उदाहरण: +91XXXXXXXXXX');
  }
  await clearPhoneListeners();
  verificationId = null;
  eventHandler = onState;
  listeners.push(await FirebaseAuthentication.addListener('phoneCodeSent', event => {
    verificationId = event.verificationId;
    eventHandler?.({ type: 'codeSent' });
  }));
  listeners.push(await FirebaseAuthentication.addListener('phoneVerificationCompleted', event => {
    eventHandler?.({ type: 'verified', user: event.result?.user || null });
  }));
  listeners.push(await FirebaseAuthentication.addListener('phoneVerificationFailed', event => {
    eventHandler?.({ type: 'failed', message: event.message || 'OTP सत्यापन विफल हुआ।' });
  }));
  await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber, timeout: 60 });
}

async function verifyCode(code) {
  if (!verificationId) throw new Error('पहले OTP भेजें।');
  if (!/^\d{6}$/.test(code)) throw new Error('6 अंकों का OTP दर्ज करें।');
  const result = await FirebaseAuthentication.confirmVerificationCode({
    verificationId,
    verificationCode: code
  });
  await clearPhoneListeners();
  verificationId = null;
  return result?.user || null;
}

async function signOut() {
  await FirebaseAuthentication.signOut();
  await clearPhoneListeners();
  verificationId = null;
}

window.MilkScaleAuth = { getCurrentUser, sendCode, verifyCode, signOut };
