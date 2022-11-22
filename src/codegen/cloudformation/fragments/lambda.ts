import fs from 'fs';
import path from 'path';

export interface LambdaInput {
  readonly dependenciesModuleId: string;
  readonly libImportPath: string;
  readonly memorySize?: number;
  readonly outDir: string;
  readonly timeout?: number;
}

export interface LambdaDynamoDBEventInput {
  readonly batchSize?: number;
  readonly maximumRetryAttempts?: number;
  readonly tableName: string;
}

/** helper */
export function writeLambda(directory: string, code: string): void {
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(path.join(directory, 'index.ts'), code);
}

export const metadata = {
  BuildMethod: 'esbuild',
  BuildProperties: {
    EntryPoints: ['./index'],
    Minify: false,
    Sourcemap: true,
    Target: 'es2020',
  },
};
