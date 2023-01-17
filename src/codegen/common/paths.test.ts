import {
  increasePathDepth,
  resolveActionsModule,
  resolveDependenciesModuleId,
} from './paths';

describe('resolveDependenciesModuleId()', () => {
  it('resolves a relative dependencies path', () => {
    expect(
      resolveDependenciesModuleId(
        'examples/change-data-capture/__generated__/actions.ts',
        './examples/dependencies'
      )
    ).toEqual('../../dependencies');
  });

  it('resolves an absolute dependencies path', () => {
    expect(
      resolveDependenciesModuleId(
        'cloudformation/template.generated.yml',
        '@check-run-reporter/schema-generated/src/dependencies'
      )
    ).toEqual('@check-run-reporter/schema-generated/src/dependencies');
  });
});

describe('increasePathDepth()', () => {
  it('increases the directory depth for a relative path', () => {
    expect(increasePathDepth('./foo')).toEqual('../foo');
  });

  it('does not change the path for an absolute path', () => {
    expect(increasePathDepth('/foo')).toEqual('/foo');
  });

  it('does not change the path for a node_module', () => {
    expect(increasePathDepth('foo')).toEqual('foo');
  });
});

describe('resolveActionsModule()', () => {
  it('resolves the path from the handler to the relative actions module', () => {
    expect(
      resolveActionsModule('./cloudformation/handler/index.ts', './actions')
    ).toBe('../../../actions');
  });

  it('resolves the path from the handler to the absolute actions module', () => {
    expect(
      resolveActionsModule('./cloudformation/handler/index.ts', 'actions')
    ).toBe('actions');
  });
});
