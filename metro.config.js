const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  alias: {
    "react-dom": false, // Mock react-dom as false (ignores it)
  },
  extraNodeModules: {
    "react-dom": require.resolve("react-native"), // Optional: Alias to react-native if needed, but false is safer
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
