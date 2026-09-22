/* global jest */
// AsyncStorage não tem módulo nativo no Jest; este mock em memória é o oficial do pacote.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);
