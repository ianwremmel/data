import path from 'path';

/** It adds a level of directory depth to a path. */
export function increasePathDepth(moduleId: string) {
  return moduleId.startsWith('.') ? path.join('..', moduleId) : moduleId;
}

/** Resolves the path from the handler to the actions module. */
export function resolveActionsModule(
  handlerOutputPath: string,
  actionsModuleId: string
): string {
  return actionsModuleId.startsWith('.')
    ? path.relative(handlerOutputPath, actionsModuleId)
    : actionsModuleId;
}

/**
 * Resolves the path from the graphql-codegen output file to the dependencies
 * module.
 */
export function resolveDependenciesModuleId(
  outputFile: string,
  dependenciesModuleId: string
) {
  return dependenciesModuleId.startsWith('.')
    ? path.relative(
        path.resolve(process.cwd(), path.dirname(outputFile)),
        path.resolve(process.cwd(), dependenciesModuleId)
      )
    : dependenciesModuleId;
}
