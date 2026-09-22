import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';

import ForceUpdateModal from '@/components/ForceUpdateModal';
import { compareVersions, fetchAppVersion } from '@/lib/appVersion';

// Gate de atualizacao forcada: le `app_config.min_version` no boot e compara com a versao
// instalada (expo-constants, nao app.json — funciona igual em dev client e build EAS).
// Renderizado fora do Stack de navegacao para bloquear qualquer tela, login incluido.
// Preparado pra quando a API real da URBS (LAI 00-088136/2026) exigir clients atualizados;
// hoje `app_config` sempre existe com min_version = versao atual, entao nunca dispara.
export function UpdateGateProvider({ children }: { children: React.ReactNode }) {
  const [outdated, setOutdated] = useState(false);
  const [iosUrl, setIosUrl] = useState<string | null>(null);
  const [androidUrl, setAndroidUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const info = await fetchAppVersion();
      if (cancelled || !info) return;
      const localVersion = String(Constants.expoConfig?.version ?? '0.0.0');
      if (compareVersions(localVersion, info.minVersion) < 0) {
        setIosUrl(info.iosUrl);
        setAndroidUrl(info.androidUrl);
        setOutdated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {children}
      <ForceUpdateModal visible={outdated} iosUrl={iosUrl} androidUrl={androidUrl} />
    </>
  );
}
