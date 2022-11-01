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
            [`examples/${example}/__generated__/template.yml`]: {
              plugins: ['./src/codegen/cloudformation'],
            },
          },
        },
      },
      schema: [
        'examples/common.graphqls',
        // 'src/codegen/schema.graphqls',
        `examples/${example}/schema/**/*.graphqls`,
      ],
    };
    return acc;
  }, {}),
};

module.exports = config;
