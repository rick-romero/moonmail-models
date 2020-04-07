import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { OpenReport } from '../src/models/open_report';

chai.use(chaiAsPromised);

describe('OpenReport', () => {
  const tableName = 'openReports-table';
  const campaignId = 'thatCampaignId';
  let tNameStub;
  const openReportHashKey = 'campaignId';
  const openReportRangeKey = 'timestamp';

  before(() => {
    sinon.stub(OpenReport, '_client').resolves(true);
    tNameStub = sinon.stub(OpenReport, 'tableName', { get: () => tableName});
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', (done) => {
      OpenReport.get(campaignId, openReportRangeKey).then(() => {
        const args = OpenReport._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${openReportHashKey}`, campaignId);
        expect(args[1]).to.have.deep.property(`Key.${openReportRangeKey}`, openReportRangeKey);
        expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(OpenReport.hashKey).to.equal(openReportHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(OpenReport.rangeKey).to.equal(openReportRangeKey);
    });
  });

  after(() => {
    OpenReport._client.restore();
    tNameStub.restore();
  });
});
