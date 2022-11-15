import fs from 'fs';
import path from 'path';

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
