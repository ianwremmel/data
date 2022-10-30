const {sync: glob} = require('glob');

const examples = glob('*/', {cwd: 'examples'});

const projects = examples.reduce((acc, example) => {
  acc[example] = {
    schema: [
      'examples/common.graphqls',
      `examples/${example}/schema/**/*.graphqls`,
    ],
  };
  return acc;
}, {});

module.exports = {
  projects,
};

console.log(module.exports);
