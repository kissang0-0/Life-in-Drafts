const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
