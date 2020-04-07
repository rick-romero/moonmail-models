import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import 'sinon-as-promised';
import moment from 'moment';
import sinonChai from 'sinon-chai';
import { ScheduledEmail } from '../src/models/scheduled_email';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('ScheduledEmail', () => {
  const tableName = 'scheduledEmails-table';
  const scheduledEmailId = 'scheduledEmailId';
  let tNameStub;
  const scheduledEmailHashKey = 'automationActionId';
  const scheduledEmailRangeKey = 'id';
  const id = 'some-id';
  const scheduledAt = 12345;

  before(() => {
    sinon.stub(ScheduledEmail, '_client').resolves({Items: []});
    tNameStub = sinon.stub(ScheduledEmail, 'tableName', { get: () => tableName});
  });

  describe('#toBeSent()', () => {
    it('calls the DynamoDB query method with correct params', done => {
      ScheduledEmail.toBeSent().then(() => {
        const args = ScheduledEmail._client.lastCall.args;
        expect(args[0]).to.equal('scan');
        expect(args[1]).to.have.property('TableName', tableName);
        expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:status', 'scheduled');
        expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#status', 'status');
        const now = args[1].ExpressionAttributeValues[':now'];
        const secondsAgo = moment().subtract(5, 's').unix();
        expect(moment(now).isBetween(secondsAgo, moment().unix())).to.be.truthy;
        expect(args[1]).to.have.property('FilterExpression', 'scheduledAt < :now and #status = :status and attribute_not_exists(sentAt)');
        done();
      }).catch(done);
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(ScheduledEmail.hashKey).to.equal(scheduledEmailHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(ScheduledEmail.rangeKey).to.equal(scheduledEmailRangeKey);
    });
  });

  after(() => {
    ScheduledEmail._client.restore();
    tNameStub.restore();
  });
});
