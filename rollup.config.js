import deckyPlugin from "@decky/rollup";

const config = deckyPlugin({
  // стандартні налаштування
});

config.output.format = 'iife';
config.output.name = 'plugin_export'; 
config.output.exports = 'default';
config.output.footer = '\nwindow.plugin_export = plugin_export;';

// Виправляємо мапінг React
config.output.globals = {
  'react': 'React',
  'react-dom': 'ReactDOM'
};

export default config;