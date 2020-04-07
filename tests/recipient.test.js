import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { Recipient } from '../src/models/recipient';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Recipient', () => {
  const tableName = 'Recipients-table';
  const recipientId = 'recipientId';
  const listId = 'thatListId';
  let tNameStub;
  const recipientHashKey = 'listId';
  const recipientRangeKey = 'id';

  before(() => {
    sinon.stub(Recipient, '_client').resolves(true);
    tNameStub = sinon.stub(Recipient, 'tableName', { get: () => tableName});
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', (done) => {
      Recipient.get(listId, recipientId).then(() => {
        const args = Recipient._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${recipientHashKey}`, listId);
        expect(args[1]).to.have.deep.property(`Key.${recipientRangeKey}`, recipientId);
        expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#emailBeginsWith', () => {
    const emailIndex = 'email-index-name';
    const stubResult = 'some-result';
    let indexStub;

    before(() => {
      sinon.stub(Recipient, 'allBy').resolves(stubResult);
      indexStub = sinon.stub(Recipient, 'emailIndex', { get: () => emailIndex});
    });

    it('calls the DynamoDB get method with correct params', (done) => {
      const email = 'david';
      Recipient.emailBeginsWith(listId, email).then(result => {
        const expectedOptions = {range: {bw: {email}}, indexName: Recipient.emailIndex};
        expect(Recipient.allBy).to.have.been.calledWithExactly(recipientHashKey, listId, expectedOptions);
        expect(result).to.equal(stubResult);
        done();
      }).catch(done);
    });

    after(() => {
      Recipient.allBy.restore();
      indexStub.restore();
    });
  });

  describe('#allByStatus', () => {
    const statusIndex = 'email-index-name';
    const stubResult = 'some-result';
    let indexStub;

    before(() => {
      sinon.stub(Recipient, 'allBy').resolves(stubResult);
      indexStub = sinon.stub(Recipient, 'statusIndex', { get: () => statusIndex});
    });

    it('calls the DynamoDB get method with correct params', (done) => {
      const status = 'success';
      Recipient.allByStatus(listId, status).then(result => {
        const expectedOptions = {range: {eq: {status}}, indexName: Recipient.statusIndex};
        expect(Recipient.allBy).to.have.been.calledWithExactly(recipientHashKey, listId, expectedOptions);
        expect(result).to.equal(stubResult);
        done();
      }).catch(done);
    });

    after(() => {
      Recipient.allBy.restore();
      indexStub.restore();
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(Recipient.hashKey).to.equal(recipientHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(Recipient.rangeKey).to.equal(recipientRangeKey);
    });
  });

  after(() => {
    Recipient._client.restore();
    tNameStub.restore();
  });
});
