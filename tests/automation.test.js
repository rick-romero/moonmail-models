import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { Automation } from '../src/models/automation';

chai.use(chaiAsPromised);

describe('Automation', () => {
  const tableName = 'automations-table';
  const emailTemplateHashKey = 'userId';
  const emailTemplateRangeKey = 'id';
  let tNameStub;

  before(() => {
    sinon.stub(Automation, '_client').resolves(true);
    tNameStub = sinon.stub(Automation, 'tableName', { get: () => tableName});
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(Automation.hashKey).to.equal(emailTemplateHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(Automation.rangeKey).to.equal(emailTemplateRangeKey);
    });
  });

  after(() => {
    Automation._client.restore();
    tNameStub.restore();
  });
});
