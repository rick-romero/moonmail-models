import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { Campaign } from '../src/models/campaign';
import moment from 'moment';

const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Campaign', () => {
  const tableName = 'Campaigns-table';
  const sentAtIndexName = 'sent-at-index';
  const scheduledAtIndexName = 'scheduled-at-index';
  const campaignId = 'campaignId';
  const userId = 'thatUserId';
  let tNameStub;
  const campaignHashKey = 'userId';
  const campaignRangeKey = 'id';
  const readyToSentCampaign = {
    userId: 'user-id',
    body: 'a-body',
    subject: 'a-subject',
    listIds: ['a-list'],
    senderId: 'a-sender',
    name: 'some-name',
    id: 'some-id',
    status: 'draft',
    archived: false
  };
  const readyToSentCampaign2 = {
    userId: 'user-id',
    body: 'a-body',
    subject: 'a-subject',
    segmentId: 'a-seg',
    senderId: 'a-sender',
    name: 'some-name',
    id: 'some-id',
    status: 'draft',
    archived: false
  };
  const readyToSentCampaign3 = {
    userId: 'user-id',
    body: 'a-body',
    subject: 'a-subject',
    segmentId: 'a-seg',
    senderId: 'a-sender',
    name: 'some-name',
    id: 'some-id',
    status: 'PaymentGatewayError. Insufficient funds',
    archived: false
  };
  const incompleteCampaign = {
    userId: 'user-id',
    body: 'a-body',
    subject: 'a-subject',
    senderId: 'a-sender'
  };
  const incompleteCampaignWithEmptyList = {
    userId: 'user-id',
    body: 'a-body',
    subject: 'a-subject',
    senderId: 'a-sender',
    listIds: []
  };
  const campaignWithWrongStatus = {
    userId: 'user-id',
    body: 'a-body',
    subject: 'a-subject',
    segmentId: 'a-seg',
    senderId: 'a-sender',
    name: 'some-name',
    id: 'some-id',
    status: 'PaymentError',
    archived: false
  };

  before(() => {
    sinon.stub(Campaign, '_client').resolves({ Items: [] });
    tNameStub = sinon.stub(Campaign, 'tableName', { get: () => tableName });
    tNameStub = sinon.stub(Campaign, 'sentAtIndex', { get: () => sentAtIndexName });
    tNameStub = sinon.stub(Campaign, 'scheduledAtIndex', { get: () => scheduledAtIndexName });
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', done => {
      Campaign.get(userId, campaignId).then(() => {
        const args = Campaign._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${campaignHashKey}`, userId);
        expect(args[1]).to.have.deep.property(`Key.${campaignRangeKey}`, campaignId);
        expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#scheduledInPast()', () => {
    it('calls the DynamoDB query method with correct params', done => {
      Campaign.scheduledInPast(userId).then(() => {
        const args = Campaign._client.lastCall.args;
        expect(args[0]).to.equal('scan');
        expect(args[1]).to.have.property('TableName', tableName);
        expect(args[1]).to.have.property('IndexName', scheduledAtIndexName);
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

  describe('#schedule()', () => {
    before(() => sinon.spy(Campaign, 'update'));
    it('should update the campaign\'s status and scheduledAt', done => {
      const scheduleAt = 1234;
      Campaign.schedule(userId, campaignId, scheduleAt).then(() => {
        const expectedParams = { scheduledAt: scheduleAt, status: 'scheduled' };
        expect(Campaign.update).to.have.been.calledWith(expectedParams, userId, campaignId);
        done();
      }).catch(done);
    });
    after(() => Campaign.update.restore());
  });

  describe('#cancelSchedule()', () => {
    it('should cancel campaign scheduling', done => {
      Campaign.cancelSchedule(userId, campaignId).then(() => {
        const args = Campaign._client.lastCall.args;
        expect(args[0]).to.equal('update');
        expect(args[1]).to.have.property('TableName', tableName);
        expect(args[1]).to.have.deep.property(`Key.${campaignHashKey}`, userId);
        expect(args[1]).to.have.deep.property(`Key.${campaignRangeKey}`, campaignId);
        expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:status', 'draft');
        expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#status', 'status');
        expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#scheduledAt', 'scheduledAt');
        expect(args[1]).to.have.property('UpdateExpression', 'SET #status=:status REMOVE #scheduledAt');
        done();
      }).catch(done);
    });
  });

  describe('#sentLastNDays()', () => {
    it('calls the DynamoDB query method with correct params', done => {
      Campaign.sentLastNDays(userId).then(() => {
        const args = Campaign._client.lastCall.args;
        expect(args[0]).to.equal('query');
        expect(args[1]).to.have.property('TableName', tableName);
        expect(args[1]).to.have.property('IndexName', sentAtIndexName);
        expect(args[1]).to.have.property('Select', 'COUNT');
        expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:lastDays');
        expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:userId', userId);
        expect(args[1]).to.have.property('KeyConditionExpression', 'userId = :userId and sentAt > :lastDays');
        done();
      }).catch(done);
    });
  });

  describe('#sentLastMonth()', () => {
    it('calls the DynamoDB query method with correct params', done => {
      const spy = sinon.spy(Campaign, 'sentLastNDays');
      Campaign.sentLastMonth(userId).then(() => {
        expect(spy).to.have.been.calledWith(userId, 30);
        Campaign.sentLastNDays.restore();
        done();
      }).catch(done);
    });
  });

  describe('#sentBy()', () => {
    it('calls the DynamoDB query method with correct params', done => {
      Campaign.sentBy(userId).then(() => {
        const args = Campaign._client.lastCall.args;
        expect(args[0]).to.equal('query');
        expect(args[1]).to.have.property('TableName', tableName);
        expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:status', 'sent');
        expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#status', 'status');
        done();
      })
        .catch(err => done(err));
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(Campaign.hashKey).to.equal(campaignHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(Campaign.rangeKey).to.equal(campaignRangeKey);
    });
  });

  describe('#isValidToBeSent', () => {
    it('succeds if all required fields are valid', () => {
      expect(Campaign.isValidToBeSent(readyToSentCampaign)).to.be.true;
      expect(Campaign.isValidToBeSent(readyToSentCampaign2)).to.be.true;
      expect(Campaign.isValidToBeSent(readyToSentCampaign3)).to.be.true;
    });

    it('fails if required fields are missing', () => {
      expect(Campaign.isValidToBeSent(incompleteCampaign)).to.be.false;
      expect(Campaign.isValidToBeSent(incompleteCampaignWithEmptyList)).to.be.false;
      expect(Campaign.isValidToBeSent(campaignWithWrongStatus)).to.be.false;
    });

    it('fails if the status is not draft', () => {
      expect(Campaign.isValidToBeSent(incompleteCampaign)).to.be.false;
      expect(Campaign.isValidToBeSent(incompleteCampaignWithEmptyList)).to.be.false;
    });
  });

  after(() => {
    Campaign._client.restore();
    tNameStub.restore();
  });
});
