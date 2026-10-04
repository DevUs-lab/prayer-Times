/**
 * Jest auto-mock for @react-native-community/geolocation (native module
 * is unavailable in the test environment).
 */
module.exports = {
  getCurrentPosition: jest.fn((_success, _error, _options) => {
    _error && _error({ code: 1, message: 'Location unavailable in tests' });
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  requestAuthorization: jest.fn((_success, _error) => _error && _error({ code: 1 })),
  setRNConfiguration: jest.fn(),
  startObserving: jest.fn(),
  stopObserving: jest.fn(),
};
