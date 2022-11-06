'use strict';

module.exports = {
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@ianwremmel/data': './',
        },
      },
    ],
  ],
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
    '@babel/preset-typescript',
  ],
};
