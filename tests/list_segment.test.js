import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { ListSegment } from '../src/models/list_segment';

chai.use(chaiAsPromised);

describe('ListSegment', () => {
  const tableName = 'list_segments-table';
  const hashKey = 'listId';
  const rangeKey = 'id';
  let tNameStub;

  beforeEach(() => {
    sinon.stub(ListSegment, '_client').resolves(true);
    tNameStub = sinon.stub(ListSegment, 'tableName', { get: () => tableName });
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(ListSegment.hashKey).to.equal(hashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(ListSegment.rangeKey).to.equal(rangeKey);
    });
  });

  describe('#save', () => {
    context('when the item is not valid', () => {
      it('rejects and returns', (done) => {
        ListSegment.save({ listId: '1', id: '2' }).catch((err) => {
          expect(err).to.exist;
          expect(ListSegment._client).not.to.have.been.called;
          done();
        });
      });
    });
    context('when the item is valid', () => {
      it('saves the item', (done) => {
        ListSegment.save({
          listId: '1',
          id: '2',
          name: 'some-name',
          userId: 'user-id',
          conditionMatch: 'any',
          conditions: [
            {
              conditionType: 'filter', condition: {
                queryType: 'range',
                fieldToQuery: 'age',
                searchTerm: { gte: 29, lt: 50 }
              }
            }
          ]
        }).then(() => {
          expect(ListSegment._client).to.have.been.called;
          done();
        });
      });
    });
  });

  describe('#update', () => {
    context('when the conditions are invalid', () => {
      it('rejects and returns', (done) => {
        ListSegment.update({ conditions: [] }, hashKey, rangeKey).catch((err) => {
          expect(err).to.exist;
          expect(ListSegment._client).not.to.have.been.called;
          done();
        });
      });
    });
    context('when the conditions are valid', () => {
      it('performs the update', (done) => {
        ListSegment.update({
          conditions: [
            {
              conditionType: 'filter', condition: {
                queryType: 'range',
                fieldToQuery: 'age',
                searchTerm: { gte: 29, lt: 50 }
              }
            }
          ]
        }, hashKey, rangeKey).then(() => {
          expect(ListSegment._client).to.have.been.called;
          done();
        });
      });
    });
  });

  afterEach(() => {
    ListSegment._client.restore();
    tNameStub.restore();
  });
});
