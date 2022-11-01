const {sync: glob} = require('glob');

const examples = glob('*/', {cwd: 'examples'}).map((pathName) =>
  pathName.replace(/\/$/, '')
);

/** @type {import('graphql-config').IGraphQLConfig } */
const config = {
  projects: examples.reduce((acc, example) => {
    acc[example] = {
      extensions: {
        codegen: {
          generates: {
            [`examples/${example}/__generated__/types.ts`]: {
              hooks: {
                afterOneFileWrite: ['npm run eslint -- --fix'],
              },
              plugins: ['typescript'],
            },
          },
        },
      },
      schema: [
        'examples/common.graphqls',
        `examples/${example}/schema/**/*.graphqls`,
      ],
    };
    return acc;
  }, {}),
};

module.exports = config;

console.log(module.exports);
