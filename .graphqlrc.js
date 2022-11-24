const fs = require('fs');

const {sync: glob} = require('glob');

const examples = glob('*/', {cwd: 'examples'}).map((pathName) =>
  pathName.replace(/\/$/, '')
);

/** @type {Record<string, import('graphql-config').IGraphQLProject>} */
const init = {};

/**
 *
 * @param {string} example
 * @returns {string|undefined}
 */
function getSourceTemplate(example) {
  try {
    fs.statSync(`examples/${example}/template.json`)
    return `examples/${example}/template.json`
  }
  catch {}

  try {
    fs.statSync(`examples/${example}/template.yml`);
    return `examples/${example}/template.yml`;
  }
  catch {}

  return undefined
}

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
                scalars: {
                  Date: 'Date',
                  JSONObject: 'Record<string, unknown>',
                },
                strictScalars: true,
                dependenciesModuleId: './examples/dependencies',
              },
              plugins: ['typescript', './src/codegen/actions'],
            },
            [`examples/${example}/__generated__/template.yml`]: {
              config: {
                actionsModuleId: `./examples/${example}/__generated__/actions`,
                dependenciesModuleId: './examples/dependencies',
                sourceTemplate: getSourceTemplate(example),
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
