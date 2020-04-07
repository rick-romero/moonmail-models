import chai from 'chai';
const expect = chai.expect;
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { List } from '../src/models/list';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('List', () => {
  const tableName = 'Lists-table';
  const listId = 'listId';
  const userId = 'thatUserId';
  let tNameStub;
  const listHashKey = 'userId';
  const listRangeKey = 'id';

  before(() => {
    sinon.stub(List, '_client').resolves(true);
    tNameStub = sinon.stub(List, 'tableName', { get: () => tableName });
  });

  describe('#isValid', () => {
    it('succeeds if required attributes are provided', () => {
      expect(List.isValid({ id: 'some-id', name: 'some-name', userId: 'some-user-id', another: 'attr' })).to.be.true;
    });

    it('fails if required attributes are missing', () => {
      expect(List.isValid({ id: 'some-id', userId: 'some-user-id', another: 'attr' })).to.be.false;
    });
  });

  describe('#get', () => {
    it('calls the DynamoDB get method with correct params', (done) => {
      List.get(userId, listId).then(() => {
        const args = List._client.lastCall.args;
        expect(args[0]).to.equal('get');
        expect(args[1]).to.have.deep.property(`Key.${listHashKey}`, userId);
        expect(args[1]).to.have.deep.property(`Key.${listRangeKey}`, listId);
        expect(args[1]).to.have.property('TableName', tableName);
        done();
      });
    });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(List.hashKey).to.equal(listHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(List.rangeKey).to.equal(listRangeKey);
    });
  });

  describe('#createFileImportStatus', (done) => {
    it('creates the empty import status object for a file', (done) => {
      List.createFileImportStatus(userId, listId, 'some-file.csv', { some: 'data' }).then(() => {
        const args = List._client.lastCall.args;
        expect(args[0]).to.equal('update');
        expect(args[1]).to.have.deep.property(`Key.${listHashKey}`, userId);
        expect(args[1]).to.have.deep.property(`Key.${listRangeKey}`, listId);
        expect(args[1]).to.have.property('TableName', tableName);
        expect(args[1]).to.have.property('UpdateExpression', 'SET #importStatus.#file = :newStatus');
        expect(args[1].ExpressionAttributeNames).to.deep.equals({
          '#importStatus': 'importStatus',
          '#file': 'some-file.csv'
        });
        expect(args[1].ExpressionAttributeValues).to.deep.equals({ ':newStatus': { some: 'data' } });
        done();
      });
    });
  });

  describe('#updateImportStatus', () => {
    it('updates the import status object attributes', (done) => {
      List.updateImportStatus(userId, listId, 'some-file.csv', { text: 'failed', dateField: 'finishedAt', dateValue: '9898789798', isImporting: true }).then(() => {
        const args = List._client.lastCall.args;
        expect(args[0]).to.equal('update');
        expect(args[1]).to.have.deep.property(`Key.${listHashKey}`, userId);
        expect(args[1]).to.have.deep.property(`Key.${listRangeKey}`, listId);
        expect(args[1].TableName).to.equals(tableName);
        expect(args[1]).to.have.property('UpdateExpression', 'SET #importStatus.#file.#status = :newStatus, #importStatus.#file.#dateField = :newDate, #importStatus.#file.#importing = :importingValue');
        expect(args[1].ExpressionAttributeNames).to.deep.equals({
          '#importStatus': 'importStatus',
          '#file': 'some-file.csv',
          '#status': 'status',
          '#dateField': 'finishedAt',
          '#importing': 'importing'
        });
        expect(args[1].ExpressionAttributeValues).to.deep.equals({ ':newStatus': 'failed', ':newDate': '9898789798', ':importingValue': true });
        done();
      });
    });
  });

  describe('#appendMetadataAttributes', () => {
    beforeEach(() => sinon.spy(List, 'update'));
    afterEach(() => List.update.restore());

    it('should append attribute names to metadataAttributes property', done => {
      const suite = [
        {
          input: [['the', 'new', 'attributes'],
            {list: {id: 123, userId: 456}}],
          expected: [{metadataAttributes: ['the', 'new', 'attributes']}, 456, 123]
        },
        {
          input: [['the', 'new', 'attributes'],
            {list: {id: 123, userId: 456, metadataAttributes: ['existing', 'attributes']}}],
          expected: [{metadataAttributes: ['existing', 'attributes', 'the', 'new']}, 456, 123]
        }
      ];
      const promises = suite.map(testCase => {
        return List.appendMetadataAttributes(...testCase.input)
          .then(_ => expect(List.update).to.have.been.calledWithExactly(...testCase.expected));
      });
      return Promise.all(promises)
        .then(_ => done())
        .catch(done);
    });

    it('should not save if attributes do not vary', done => {
      const testCaseInput = [['existing', 'attributes'], {list: {metadataAttributes: ['existing', 'attributes']}}];
      List.appendMetadataAttributes(...testCaseInput)
        .then(_ => {
          expect(List.update).not.to.have.been.called;
          done();
        })
        .catch(done);
    });
  });

  after(() => {
    List._client.restore();
    tNameStub.restore();
  });
});
