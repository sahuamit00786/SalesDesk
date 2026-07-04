import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE = 'com.connexifymobile.auth';
const BIO_SERVICE = 'com.connexifymobile.auth.bio';

// AsyncStorage keys the pre-rebuild app used for tokens — migrated then purged.
const LEGACY_KEYS = ['accessToken', 'refreshToken', 'user', 'workspaceId'];

let cached = null; // { accessToken, refreshToken } — avoid keychain round-trips

export async function loadTokens() {
  if (cached) return cached;
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    if (creds?.password) {
      cached = JSON.parse(creds.password);
      return cached;
    }
  } catch {
    // corrupted entry → treat as signed out
  }
  return null;
}

export async function saveTokens({ accessToken, refreshToken }) {
  cached = { accessToken, refreshToken };
  await Keychain.setGenericPassword('auth', JSON.stringify(cached), { service: SERVICE });
}

export async function clearTokens() {
  cached = null;
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {}
  try {
    await Keychain.resetGenericPassword({ service: BIO_SERVICE });
  } catch {}
  try {
    await AsyncStorage.multiRemove(LEGACY_KEYS);
  } catch {}
}

/** One-time lift of tokens stored by the pre-rebuild app in plain AsyncStorage. */
export async function migrateLegacyTokens() {
  const existing = await loadTokens();
  if (existing) return existing;
  try {
    const [[, accessToken], [, refreshToken]] = await AsyncStorage.multiGet([
      'accessToken',
      'refreshToken',
    ]);
    if (accessToken && refreshToken) {
      await saveTokens({ accessToken, refreshToken });
      await AsyncStorage.multiRemove(LEGACY_KEYS); // never keep tokens in plain storage
      return cached;
    }
  } catch {}
  return null;
}

// ---- Biometric unlock (opt-in, Phase 8) ----

export async function biometryAvailable() {
  try {
    return Boolean(await Keychain.getSupportedBiometryType());
  } catch {
    return false;
  }
}

export async function enableBiometricUnlock() {
  const tokens = await loadTokens();
  if (!tokens?.refreshToken) throw new Error('Not signed in');
  await Keychain.setGenericPassword('auth-bio', JSON.stringify(tokens), {
    service: BIO_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function disableBiometricUnlock() {
  try {
    await Keychain.resetGenericPassword({ service: BIO_SERVICE });
  } catch {}
}

/** Prompts the OS biometric dialog; resolves tokens or throws on cancel/failure. */
export async function readBiometricTokens(promptTitle = 'Unlock LeadNest') {
  const creds = await Keychain.getGenericPassword({
    service: BIO_SERVICE,
    authenticationPrompt: { title: promptTitle },
  });
  if (!creds?.password) throw new Error('Biometric unlock not set up');
  return JSON.parse(creds.password);
}
