import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import 'sinon-as-promised';
import moment from 'moment';
import sinonChai from 'sinon-chai';
import { AutomationAction } from '../src/models/automation_action';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('AutomationAction', () => {
  const tableName = 'automation-actions-table';
  const footprintStatusIndexName = 'footprint-status-index';
  const automationIndexName = 'automation-index';
  const automationActionId = 'automationActionId';
  const automationId = 'thatUserId';
  let tNameStub;
  const automationActionHashKey = 'automationId';
  const automationActionRangeKey = 'id';

  before(() => {
    sinon.stub(AutomationAction, '_client').resolves({Items: []});
    tNameStub = sinon.stub(AutomationAction, 'tableName', { get: () => tableName});
    tNameStub = sinon.stub(AutomationAction, 'footprintStatusIndex', { get: () => footprintStatusIndexName});
    tNameStub = sinon.stub(AutomationAction, 'automationIndex', { get: () => automationIndexName});
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', done => {
      AutomationAction.get(automationId, automationActionId).then(() => {
        const args = AutomationAction._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${automationActionHashKey}`, automationId);
        expect(args[1]).to.have.deep.property(`Key.${automationActionRangeKey}`, automationActionId);
        expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#allByStatusAndFootprint', () => {
    const stubResult = 'some-result';

    before(() => {
      sinon.stub(AutomationAction, 'allBy').resolves(stubResult);
    });
    after(() => {
      AutomationAction.allBy.restore();
    });

    it('calls the DynamoDB get method with correct params', (done) => {
      const footprint = 'whatever';
      const status = 'active';
      AutomationAction.allByStatusAndFootprint(status, footprint).then(result => {
        const expectedOptions = {range: {eq: {footprint}}, indexName: AutomationAction.footprintStatusIndex};
        expect(AutomationAction.allBy).to.have.been.calledWithExactly('status', status, expectedOptions);
        expect(result).to.equal(stubResult);
        done();
      }).catch(done);
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(AutomationAction.hashKey).to.equal(automationActionHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(AutomationAction.rangeKey).to.equal(automationActionRangeKey);
    });
  });

  after(() => {
    AutomationAction._client.restore();
    tNameStub.restore();
  });
});
