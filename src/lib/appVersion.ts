import { getSupabase, isSupabaseConfigured } from './supabase';

export interface AppVersionInfo {
  minVersion: string;
  iosUrl: string | null;
  androidUrl: string | null;
}

// Compara dois semver ("1.2.3") segmento a segmento, numericamente: <0 se a<b, 0 se iguais,
// >0 se a>b. "1.2.10" fica maior que "1.2.3" — nao e comparacao de string.
export function compareVersions(a: string, b: string): number {
  const pa = String(a ?? '').split('.');
  const pb = String(b ?? '').split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = parseInt(pa[i] ?? '0', 10) || 0;
    const db = parseInt(pb[i] ?? '0', 10) || 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

// Le o contrato de versao minima antes de qualquer autenticacao (visitante inclusive).
// Sem Supabase configurado, sem rede ou tabela vazia, devolve null — o gate so bloqueia
// quando tem certeza que a versao esta desatualizada, nunca por falha de leitura.
export async function fetchAppVersion(): Promise<AppVersionInfo | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabase()
      .from('app_config')
      .select('min_version, ios_url, android_url')
      .eq('id', 1)
      .single();
    if (error || !data) return null;
    return { minVersion: String(data.min_version), iosUrl: data.ios_url, androidUrl: data.android_url };
  } catch {
    return null;
  }
}
