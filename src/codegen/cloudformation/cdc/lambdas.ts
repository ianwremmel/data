import fs from 'fs';
import path from 'path';

import type {GraphQLObjectType} from 'graphql';

export interface MakeHandlerOptions {
  readonly actionsModuleId: string;
  readonly dependenciesModuleId: string;
  readonly handlerPath: string;
  readonly libImportPath: string;
  readonly outDir: string;
  readonly type: GraphQLObjectType;
}

/** generate the dispatcher lambda function */
export function makeHandler({
  actionsModuleId,
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
import {unmarshall${type.name}} from '${actionsModuleId}';

export const handler = makeModelChangeHandler(dependencies, (record) => {
  assert(record.dynamodb.NewImage, 'Expected DynamoDB Record to have a NewImage');
  return cdcHandler(unmarshall${type.name}(record.dynamodb.NewImage));
});
`;

  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'index.ts'), code);
}
