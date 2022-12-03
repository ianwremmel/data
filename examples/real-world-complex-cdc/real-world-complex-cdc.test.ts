import {faker} from '@faker-js/faker';

import {queryCaseInstance, queryCaseSummary} from './__generated__/actions';

describe('real-world-complex-cdc', () => {
  it.skip('has the expected type definitions', async () => {
    let label: string | undefined;

    await queryCaseSummary({
      branchName: faker.git.branch(),
      index: 'lsi1',
      label,
      lineage: faker.word.noun(),
      repoId: String(faker.datatype.number()),
      vendor: 'GITHUB',
    });

    await queryCaseInstance({
      branchName: faker.git.branch(),
      index: 'gsi1',
      label,
      repoId: String(faker.datatype.number()),
      sha: faker.git.commitSha(),
      vendor: 'GITHUB',
    });
  });
});
