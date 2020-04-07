import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { Sender } from '../src/models/sender';

chai.use(chaiAsPromised);

describe('Sender', () => {
  const tableName = 'Senders-table';
  const senderId = 'senderId';
  const userId = 'thatUserId';
  let tNameStub;
  const senderHashKey = 'userId';
  const senderRangeKey = 'id';

  before(() => {
    sinon.stub(Sender, '_client').resolves(true);
    tNameStub = sinon.stub(Sender, 'tableName', { get: () => tableName});
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(Sender.hashKey).to.equal(senderHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(Sender.rangeKey).to.equal(senderRangeKey);
    });
  });

  after(() => {
    Sender._client.restore();
    tNameStub.restore();
  });
});
