// Config dinâmica do Expo: só o que o app.json estático não cobre.
// - Chave do Google Maps (Android) vem de env no momento do build
//   (EAS secret GOOGLE_MAPS_API_KEY). Sem chave, o mapa usa o
//   comportamento atual (Apple Maps no iOS / Expo Go). Nunca commitar
//   chave (RNF-06 do PRD).
// - package/bundleIdentifier exigidos pelo EAS Build.
module.exports = function ({ config }) {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

  const mapsPlugin = ['react-native-maps'];
  if (googleMapsApiKey) {
    mapsPlugin.push({ androidGoogleMapsApiKey: googleMapsApiKey });
  }

  return {
    ...config,
    ios: {
      ...(config.ios ?? {}),
      bundleIdentifier: 'com.lucasstop.curitibabusapp',
    },
    android: {
      ...(config.android ?? {}),
      package: 'com.lucasstop.curitibabusapp',
    },
    plugins: [...(config.plugins ?? []), mapsPlugin],
  };
};
