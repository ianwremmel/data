import fs from 'fs';
import path from 'path';

import {GraphQLObjectType} from 'graphql';

export interface MakeTableDispatcherInput {
  readonly dependenciesModuleId: string;
  readonly libImportPath: string;
  readonly modelName: string;
  readonly outDir: string;
  readonly tableName: string;
}

/** generate the dispatcher lambda function */
export function makeTableDispatcher({
  dependenciesModuleId,
  libImportPath,
  modelName,
  outDir,
  tableName,
}: MakeTableDispatcherInput) {
  const code = `// This file is generated. Do not edit by hand.

import {makeDynamoDBStreamDispatcher} from '${libImportPath}';
import * as dependencies from '${dependenciesModuleId}';

export const handler = makeDynamoDBStreamDispatcher({
  ...dependencies,
  modelName: '${modelName}',
  tableName: '${tableName}',
});
`;

  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'index.ts'), code);
}

export interface MakeHandlerOptions {
  readonly dependenciesModuleId: string;
  readonly handlerPath: string;
  readonly libImportPath: string;
  readonly outDir: string;
  readonly type: GraphQLObjectType;
}

/** generate the dispatcher lambda function */
export function makeHandler({
  dependenciesModuleId,
  handlerPath,
  libImportPath,
  outDir,
  type,
}: MakeHandlerOptions) {
  const code = `// This file is generated. Do not edit by hand.

import {assert, makeModelChangeHandler} from '${libImportPath}';

import * as dependencies from '${dependenciesModuleId}';
import {handler as cdcHandler} from '${handlerPath}';
import {unmarshall${type.name}} from '../actions';

export const handler = makeModelChangeHandler(dependencies, (record) => {
  assert(record.dynamodb.NewImage, 'Expected DynamoDB Record to have a NewImage');
  return cdcHandler(unmarshall${type.name}(record.dynamodb.NewImage));
});
`;

  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'index.ts'), code);
}
