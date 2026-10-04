module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    // The RN preset only transforms js/ts/tsx — this project also uses .jsx.
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/lib/module/jest/AsyncStorageMock.js',
  },
  // async-storage and react-native-vector-icons ship untranspiled ESM,
  // so they must not be ignored like other deps.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|react-native-vector-icons)/)',
  ],
};
