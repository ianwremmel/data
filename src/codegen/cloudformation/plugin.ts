import {readFileSync} from 'fs';
import path from 'path';

import {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';

import {CloudformationPluginConfig} from './config';

/** @override */
export function addToSchema(): AddToSchemaResult {
  return readFileSync(path.resolve(__dirname, '../schema.graphqls'), 'utf8');
}

/** @override */
export const plugin: PluginFunction<CloudformationPluginConfig> = (
  schema,
  documents,
  config,
  info
) => {
  return `It Works!${Date.now()}`;
};
