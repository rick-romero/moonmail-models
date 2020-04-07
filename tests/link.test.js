import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { Link } from '../src/models/link';

chai.use(chaiAsPromised);

describe('Link', () => {

  const tableName = 'links-table';
  const links = ['link1', 'linkk2', 'link3'];
  const campaignId = 'campaignId';
  const count = 5;
  let tNameStub;

  before(() => {
    sinon.stub(Link, '_client').resolves(true);
    tNameStub = sinon.stub(Link, 'tableName', { get: () => tableName});
  });

  describe('#incrementOpens', () => {
    it('calls the DynamoDB update method with correct params', (done) => {
      Link.incrementOpens(campaignId, count).then(() => {
        const args = Link._client.lastCall.args;
        expect(args[0]).to.equal('update');
        expect(args[1]).to.have.deep.property('Key.id', campaignId);
        expect(args[1]).to.have.property('TableName', tableName);
        expect(args[1]).to.have.deep.property('AttributeUpdates.opensCount.Action', 'ADD');
        expect(args[1]).to.have.deep.property('AttributeUpdates.opensCount.Value', count);
        done();
      });
    });
  });

  describe('#incrementClicks', () => {
    it('calls the DynamoDB update method with correct params', (done) => {
      const linkId = 'ca123';
      Link.incrementClicks(campaignId, linkId, count).then(() => {
        const args = Link._client.lastCall.args;
        expect(args[0]).to.equal('update');
        expect(args[1]).to.have.deep.property('Key.id', campaignId);
        expect(args[1]).to.have.property('TableName', tableName);
        expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#linkId', linkId);
        expect(args[1].ExpressionAttributeValues).to.have.property(':clicksCount', count);
        expect(args[1]).to.have.property('UpdateExpression', 'ADD #linksList.#linkId.#attrName :clicksCount');
        done();
      });
    });
  });

  after(() => {
    Link._client.restore();
    tNameStub.restore();
  });
});
