import path from 'path';

import {writeLambda} from '../fragments/lambda';

export interface MakeHandlerOptions {
  readonly actionsModuleId: string;
  readonly dependenciesModuleId: string;
  readonly handlerModuleId: string;
  readonly handlerOutputPath: string;
  readonly libImportPath: string;
  readonly typeName: string;
}

/** generate the dispatcher lambda function */
export function makeHandler({
  actionsModuleId,
  dependenciesModuleId,
  handlerModuleId,
  handlerOutputPath,
  libImportPath,
  typeName,
}: MakeHandlerOptions) {
  // Account for the fact that the parser only knows the module id, not produced
  // directory layout
  dependenciesModuleId = dependenciesModuleId.startsWith('.')
    ? path.join('..', dependenciesModuleId)
    : dependenciesModuleId;

  handlerModuleId = handlerModuleId.startsWith('.')
    ? path.join('..', handlerModuleId)
    : handlerModuleId;

  writeLambda(
    handlerOutputPath,
    `// This file is generated. Do not edit by hand.

import {assert, makeModelChangeHandler} from '${libImportPath}';

import * as dependencies from '${dependenciesModuleId}';
import {handler as cdcHandler} from '${handlerModuleId}';
import {unmarshall${typeName}} from '${actionsModuleId}';

export const handler = makeModelChangeHandler(dependencies, (record) => {
  assert(record.dynamodb.NewImage, 'Expected DynamoDB Record to have a NewImage');
  return cdcHandler(unmarshall${typeName}(record.dynamodb.NewImage));
});
`
  );
}
