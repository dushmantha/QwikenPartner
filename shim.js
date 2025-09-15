// shim.js - Node.js shims for React Native
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Minimal polyfills to avoid the stream/crypto issues
global.process = global.process || {};
global.process.env = global.process.env || {};
global.process.version = global.process.version || 'v16.0.0';
global.process.browser = true;

// Add minimal Buffer polyfill
if (typeof global.Buffer === 'undefined') {
  global.Buffer = {
    from: (data) => new Uint8Array(data),
    alloc: (size) => new Uint8Array(size),
    isBuffer: () => false,
  };
}

console.log('✅ Minimal shims loaded');