'use strict';

const {glob} = require('glob');
const {camelCase, upperFirst} = require('lodash');

const {commonProjectConfig} = require('./jest.common');

// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

const CI = !!process.env.CI;

/** @type {import('@jest/types').Config.GlobalConfig} */
module.exports = {
  bail: 0,
  collectCoverage: CI,
  coverageDirectory: 'reports/coverage',
  projects: [
    {
      ...commonProjectConfig,
      displayName: 'Unit Tests',
      setupFilesAfterEnv: ['<rootDir>/jest.d/setup-files-after-env/faker.ts'],
      // The parenthesis around test are necessary, even though we're not using
      // `(spec|test)`.
      testMatch: [`<rootDir>/src/**/?(*.)+(test).[tj]s?(x)`],
    },
    ...glob.sync('examples/*/').map((example) => ({
      ...commonProjectConfig,
      displayName: `Example: ${upperFirst(camelCase(example.split('/')[1]))}`,
      globalSetup: '<rootDir>/jest.d/global-setup/credentials.ts',
      setupFilesAfterEnv: [
        '<rootDir>/jest.d/setup-files-after-env/faker.ts',
        '<rootDir>/jest.d/setup-files-after-env/stack-env.ts',
      ],
      testMatch: [`<rootDir>/${example}**/?(*.)+(test).[tj]s?(x)`],
    })),
  ],
  reporters: [
    'default',
    CI && [
      'jest-junit',
      {
        addFileAttribute: 'true', // Yep, it really needs to be a string
        ancestorSeparator: ' › ',
        classNameTemplate: '{classname}',
        includeConsoleOutput: true,
        outputDirectory: 'reports/junit',
        outputName: `jest${
          process.env.BUILDKITE_JOB_ID ? `-${process.env.BUILDKITE_JOB_ID}` : ''
        }.xml`,
        suiteName: 'Unit Tests',
        titleTemplate: '{title}',
      },
    ],
  ].filter(Boolean),
  testLocationInResults: true,
};
