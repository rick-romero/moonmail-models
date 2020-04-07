import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { Open } from '../src/models/open';

chai.use(chaiAsPromised);

describe('Open', () => {
  const tableName = 'Opens-table';
  const recipientId = 'recipientId';
  const campaignId = 'thatCampaignId';
  let tNameStub;
  const openHashKey = 'recipientId';
  const openRangeKey = 'campaignId';

  before(() => {
    sinon.stub(Open, '_client').resolves(true);
    tNameStub = sinon.stub(Open, 'tableName', { get: () => tableName});
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', (done) => {
      Open.get(recipientId, campaignId).then(() => {
        const args = Open._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${openHashKey}`, recipientId);
        expect(args[1]).to.have.deep.property(`Key.${openRangeKey}`, campaignId);
        expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(Open.hashKey).to.equal(openHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(Open.rangeKey).to.equal(openRangeKey);
    });
  });

  after(() => {
    Open._client.restore();
    tNameStub.restore();
  });
});
