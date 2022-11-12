const {sync: glob} = require('glob');

const examples = glob('*/', {cwd: 'examples'}).map((pathName) =>
  pathName.replace(/\/$/, '')
);

/** @type {Record<string, import('graphql-config').IGraphQLProject>} */
const init = {};

/** @type {import('graphql-config').IGraphQLConfig } */
const config = {
  projects: examples.reduce((acc, example) => {
    acc[example] = {
      extensions: {
        codegen: {
          generates: {
            [`examples/${example}/__generated__/actions.ts`]: {
              config: {
                enumsAsTypes: true,
                pathToDocumentClient: './examples/document-client',
                scalars: {
                  Date: 'Date',
                  JSONObject: 'Record<string, unknown>',
                },
                strictScalars: true,
              },
              plugins: ['typescript', './src/codegen/actions'],
            },
            [`examples/${example}/__generated__/template.yml`]: {
              config: {
                enumsAsTypes: true,
              },
              plugins: ['./src/codegen/cloudformation'],
            },
          },
        },
      },
      schema: [
        'examples/common.graphqls',
        `examples/${example}/schema/**/*.graphqls`,
        // This line shouldn't be here, but addToSchema doesn't seem to work.
        'src/codegen/schema.graphqls',
      ],
    };
    return acc;
  }, init)
};

module.exports = config;
