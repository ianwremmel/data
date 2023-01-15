import assert from 'assert';

import {
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs'; // ES Modules import
import {faker} from '@faker-js/faker';

import {cwc} from '../dependencies';
import {waitFor} from '../test-helpers';

import {createUserSession, deleteUserSession} from './__generated__/actions';

describe('@triggers', () => {
  it('triggers a lambda function when a record is inserted into a table', async () => {
    const session = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    try {
      const event = await waitFor(async () => {
        const logGroups = await cwc.send(
          new DescribeLogGroupsCommand({
            logGroupNamePrefix: '/aws/lambda/CdcTrigger-UserSessionCDCHandler',
          })
        );

        expect(logGroups.logGroups).toHaveLength(1);
        assert(logGroups.logGroups?.[0]);
        const [{logGroupName}] = logGroups.logGroups;

        const logStreams = await cwc.send(
          new DescribeLogStreamsCommand({
            logGroupName,
          })
        );

        expect(logStreams.logStreams).toHaveLength(1);
        assert(logStreams.logStreams?.[0]);
        const [{logStreamName}] = logStreams.logStreams;

        const logs = await cwc.send(
          new GetLogEventsCommand({
            logGroupName,
            logStreamName,
          })
        );

        const e = logs.events?.find(({message}) =>
          message?.includes('TEST MESSAGE')
        );

        expect(e).toBeDefined();

        return e;
      }, 25000);

      assert(event);
      assert(event.message);
      const parsedSession = JSON.parse(event.message.split('TEST MESSAGE ')[1]);
      expect(parsedSession.id).toBe(session.item.id);
      expect(parsedSession.session).toStrictEqual(session.item.session);
      expect(parsedSession.sessionId).toStrictEqual(session.item.sessionId);
    } finally {
      await deleteUserSession(session.item);
    }
  }, 30000);
});
