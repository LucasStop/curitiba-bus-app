import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import { getRandomBytesAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Padrão LargeSecureStore da documentação do Supabase para Expo. O SecureStore (Keychain/Keystore)
// não aguenta a sessão inteira (limite de ~2048 bytes), então: uma chave AES-256 nova a cada gravação
// vai para o SecureStore e o valor cifrado vai para o AsyncStorage (SSD D8, SECURITY T4).
// AES-CTR não autentica o texto cifrado; a chave nova por gravação evita reuso de contador.

export interface PlainStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SecretStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

// THIS_DEVICE_ONLY: a chave não vai para backup nem para outro aparelho; sem ela a sessão cifrada
// restaurada vira null e a pessoa entra de novo (em vez de ler lixo).
//
// Cada chamada é blindada com try/catch: em Expo Go (sem dev-client) o SecureStore lança
// exceção nativa, e sem isso o boot do Supabase (`loadStorageData`) travava na splash. Falha
// aqui vira "sessão não restaurada" — a pessoa cai como visitante e loga de novo, em vez do
// app travar. Sem log (nem em dev): C7 proíbe console.* neste diretório (noSensitiveLogs.test.ts).
const keychainStore: SecretStore = {
  getItemAsync: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItemAsync: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    } catch {
      // silencioso de propósito — ver comentário acima.
    }
  },
  deleteItemAsync: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // silencioso de propósito — ver comentário acima.
    }
  },
};

export class LargeSecureStore {
  // Armazenamentos e fonte de aleatoriedade injetáveis só para teste; o app usa os padrões.
  // getRandomBytesAsync (expo-crypto) usa o gerador nativo e, ao contrário da versão síncrona,
  // nunca cai em Math.random.
  constructor(
    private readonly plain: PlainStore = AsyncStorage,
    private readonly secret: SecretStore = keychainStore,
    private readonly randomBytes: (byteCount: number) => Promise<Uint8Array> = getRandomBytesAsync,
  ) {}

  async getItem(key: string): Promise<string | null> {
    const encrypted = await this.plain.getItem(key);
    if (!encrypted) return null;

    const keyHex = await this.secret.getItemAsync(key);
    if (!keyHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encrypted)));
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await this.randomBytes(256 / 8);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));

    await this.secret.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    await this.plain.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await this.plain.removeItem(key);
    await this.secret.deleteItemAsync(key);
  }
}
