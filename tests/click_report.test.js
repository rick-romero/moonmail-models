import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { ClickReport } from '../src/models/click_report';

chai.use(chaiAsPromised);

describe('ClickReport', () => {
  const tableName = 'ClickReports-table';
  const campaignId = 'thatCampaignId';
  let tNameStub;
  const clickReportHashKey = 'campaignId';
  const clickReportRangeKey = 'timestamp';

  before(() => {
    sinon.stub(ClickReport, '_client').resolves(true);
    tNameStub = sinon.stub(ClickReport, 'tableName', { get: () => tableName});
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', (done) => {
      ClickReport.get(campaignId, clickReportRangeKey).then(() => {
        const args = ClickReport._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${clickReportHashKey}`, campaignId);
        expect(args[1]).to.have.deep.property(`Key.${clickReportRangeKey}`, clickReportRangeKey);
        expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(ClickReport.hashKey).to.equal(clickReportHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(ClickReport.rangeKey).to.equal(clickReportRangeKey);
    });
  });

  after(() => {
    ClickReport._client.restore();
    tNameStub.restore();
  });
});
