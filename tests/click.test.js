import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { Click } from '../src/models/click';

chai.use(chaiAsPromised);

describe('Click', () => {
  const tableName = 'Clicks-table';
  const recipientId = 'recipientId';
  const linkId = 'thatLinkId';
  let tNameStub;
  const clickHashKey = 'recipientId';
  const clickRangeKey = 'linkId';

  before(() => {
    sinon.stub(Click, '_client').resolves(true);
    tNameStub = sinon.stub(Click, 'tableName', { get: () => tableName});
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', (done) => {
      Click.get(recipientId, linkId).then(() => {
        const args = Click._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${clickHashKey}`, recipientId);
        expect(args[1]).to.have.deep.property(`Key.${clickRangeKey}`, linkId);
        expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(Click.hashKey).to.equal(clickHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(Click.rangeKey).to.equal(clickRangeKey);
    });
  });

  after(() => {
    Click._client.restore();
    tNameStub.restore();
  });
});
