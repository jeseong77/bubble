// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [], // Add any other plugins you might need later here
  };
};
