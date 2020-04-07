import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const chaiThings = require('chai-things');
const awsMock = require('aws-sdk-mock');
const AWS = require('aws-sdk');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { Model } from '../src/models/model';
import Joi from 'joi';
import base64url from 'base64-url';
import omitEmpty from 'omit-empty';

chai.use(chaiThings);
chai.use(chaiAsPromised);

describe('Model', () => {
  let db;
  const validTable = 'valid-table';
  const retryableTable = 'retriable-table';
  const invalidModel = {};
  const validModel = { attr1: 'attr1', attr2: 'attr2' };

  before(() => {
    awsMock.mock('DynamoDB.DocumentClient', 'put', (params, cb) => {
      if (params.hasOwnProperty('TableName')) {
        cb(null, {});
      } else {
        cb('Invalid params');
      }
    });
    awsMock.mock('DynamoDB.DocumentClient', 'batchWrite', (params, cb) => {
      if (params.RequestItems.hasOwnProperty(validTable)) {
        cb(null, {});
      } else if (params.RequestItems.hasOwnProperty(retryableTable)) {
        const result = { UnprocessedItems: {} };
        result.UnprocessedItems[retryableTable] = [{ id: 'some-id' }];
        cb(null, result);
      } else {
        cb('Invalid params');
      }
    });
    db = new AWS.DynamoDB.DocumentClient();
    sinon.stub(Model, '_db').returns(db);
  });

  describe('#_client()', () => {
    it('calls the DynamoDB specified method and passes the params', (done) => {
      const method = 'put';
      const params = { TableName: 'my-table', Item: { id: '123' } };
      Model._client(method, params).then(() => {
        const dbMethod = db[method];
        const dbArgs = dbMethod.lastCall.args;
        expect(dbMethod).to.have.been.called;
        expect(dbArgs[0]).to.have.property('TableName');
        done();
      });
    });

    context('withouth TableName', () => {
      it('rejects the promise', (done) => {
        const clientPromise = Model._client('put', {});
        expect(clientPromise).to.be.rejected.and.notify(done);
      });
    });

    let clientSpy = null;
    let retryDelayStub = null;

    context('when there are unprocessed items', () => {
      before(() => {
        clientSpy = sinon.spy(Model, '_client');
        retryDelayStub = sinon.stub(Model, 'retryDelay', { get: () => 1.005 });
      });

      it('retries the function up to maxRetries', (done) => {
        const params = { RequestItems: {} };
        params.RequestItems[retryableTable] = {};
        Model._client('batchWrite', params).then((res) => {
          expect(Model._client.callCount).to.equal(Model.maxRetries + 1);
          const secondCallParams = Model._client.secondCall.args[1];
          expect(secondCallParams.RequestItems).to.deep.equal(res.UnprocessedItems);
          done();
        });
      });

      after(() => {
        clientSpy.restore();
        retryDelayStub.restore();
      });
    });

    context('when there aren\'t unprocessed items', () => {
      before(() => {
        clientSpy = sinon.spy(Model, '_client');
      });

      it('retries the function up to maxRetries', (done) => {
        const params = { RequestItems: {} };
        params.RequestItems[validTable] = {};
        Model._client('batchWrite', params).then((res) => {
          expect(Model._client).to.be.calledOnce;
          expect(res).to.deep.equal({});
          done();
        })
          .catch(done);
      });

      after(() => {
        clientSpy.restore();
      });
    });
  });

  context('stub client', () => {
    const tableName = 'my-table';
    const hashKey = 'myKey';
    const rangeKey = 'myRange';
    const hashValue = 'some hash value';
    const rangeValue = 'some range value';
    const item = { myKey: 1, myRange: 2, anAttribute: 'its value', someAttribute: 'some_value', anotherAttribute: 'value', another: 'value' };
    const lastEvaluatedKey = { myKey: 1, myRange: 2 };
    const nextPage = base64url.encode(JSON.stringify(lastEvaluatedKey));
    const items = Array(5).fill().map(() => item);
    let tNameStub;
    let hashStub;
    let rangeStub;
    let clientStub;
    let schemaStub;

    before(() => {
      clientStub = sinon.stub(Model, '_client');
      clientStub.resolves('ok');
      clientStub.withArgs('query').resolves({ Items: items, LastEvaluatedKey: lastEvaluatedKey });
      clientStub.withArgs('get').resolves({ Item: item });
      tNameStub = sinon.stub(Model, 'tableName', { get: () => tableName });
      hashStub = sinon.stub(Model, 'hashKey', { get: () => hashKey });
      rangeStub = sinon.stub(Model, 'rangeKey', { get: () => rangeKey });
    });

    describe('#get', () => {
      context('only hash key was provided', () => {
        it('calls the DynamoDB get method with correct params', (done) => {
          Model.get(hashValue).then((result) => {
            const args = Model._client.lastCall.args;
            expect(args[0]).to.equal('get');
            expect(args[1]).to.have.property('TableName', tableName);
            expect(args[1]).to.have.deep.property(`Key.${hashKey}`, hashValue);
            expect(result).to.deep.equal(item);
            done();
          });
        });
      });

      context('range key was provided', () => {
        it('calls the DynamoDB get method with correct params', (done) => {
          Model.get(hashValue, rangeValue).then(() => {
            const args = Model._client.lastCall.args;
            expect(args[0]).to.equal('get');
            expect(args[1]).to.have.property('TableName', tableName);
            expect(args[1]).to.have.deep.property(`Key.${hashKey}`, hashValue);
            expect(args[1]).to.have.deep.property(`Key.${rangeKey}`, rangeValue);
            done();
          });
        });
      });

      context('fields filter was provided and include_fields is true', () => {
        it('calls the DynamoDB get method with correct params', (done) => {
          const fields = ['attr1', 'attr2'];
          const options = { fields: fields.join(','), include_fields: true };
          Model.get(hashValue, rangeValue, options).then(() => {
            const args = Model._client.lastCall.args;
            expect(args[0]).to.equal('get');
            expect(args[1]).to.have.property('TableName', tableName);
            expect(args[1]).to.have.deep.property(`Key.${hashKey}`, hashValue);
            expect(args[1]).to.have.deep.property(`Key.${rangeKey}`, rangeValue);
            const dbOptions = Model._buildOptions(options);
            for (let key in dbOptions) {
              expect(args[1][key]).to.deep.equal(dbOptions[key]);
            }
            done();
          });
        });
      });

      context('fields filter was provided and include_fields is false', () => {
        it('calls the DynamoDB get method with correct params', done => {
          const field = 'someAttribute';
          const options = { fields: field, include_fields: false };
          Model.get(hashValue, rangeValue, options).then(result => {
            const args = Model._client.lastCall.args;
            expect(args[0]).to.equal('get');
            expect(args[1]).to.have.property('TableName', tableName);
            expect(args[1]).to.have.deep.property(`Key.${hashKey}`, hashValue);
            expect(args[1]).to.have.deep.property(`Key.${rangeKey}`, rangeValue);
            expect(result).not.to.have.property(field);
            done();
          });
        });
      });
    });

    describe('#allBy', () => {
      const value = 'value';

      it('calls the DynamoDB query method with correct params', (done) => {
        Model.allBy(null, value).then((result) => {
          const args = Model._client.lastCall.args;
          expect(args[0]).to.equal('query');
          expect(args[1]).to.have.property('TableName', tableName);
          expect(args[1]).to.have.property('KeyConditionExpression', '#hkey = :hvalue');
          expect(args[1]).not.to.have.property('IndexName');
          expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#hkey', Model.hashKey);
          expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:hvalue', value);
          expect(result).to.have.property('items');
          expect(result).to.have.property('nextPage', nextPage);
          done();
        }).catch(done);
      });

      context('when the nexPage param was provided', () => {
        it('includes the ExclusiveStartKey in the query', (done) => {
          const page = nextPage;
          Model.allBy(null, value, { page }).then(() => {
            const args = Model._client.lastCall.args;
            expect(args[1].ExclusiveStartKey).to.deep.equal(lastEvaluatedKey);
            done();
          });
        });
      });

      context('fields filter was provided and include_fields is true', () => {
        it('calls the DynamoDB get method with correct params', (done) => {
          const attributes = ['attr1', 'attr2'];
          const options = { fields: attributes.join(','), include_fields: true };
          Model.allBy(null, value, options).then(result => {
            const args = Model._client.lastCall.args;
            expect(args[0]).to.equal('query');
            expect(args[1]).to.have.property('TableName', tableName);
            expect(args[1]).to.have.property('KeyConditionExpression', '#hkey = :hvalue');
            expect(args[1]).not.to.have.property('IndexName');
            expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#hkey', Model.hashKey);
            expect(result).to.have.property('items');
            const dbOptions = Model._buildOptions(options);
            for (let key in dbOptions) {
              expect(args[1][key]).to.deep.contain(dbOptions[key]);
            }
            done();
          });
        });
      });

      context('fields filter was provided and include_fields is false', () => {
        it('filters the result', done => {
          const fields = ['anAttribute', 'anotherAttribute'];
          const options = { fields: fields.join(','), include_fields: false };
          Model.allBy(null, value, options).then(result => {
            const args = Model._client.lastCall.args;
            expect(args[0]).to.equal('query');
            expect(args[1]).to.have.property('TableName', tableName);
            expect(args[1]).to.have.property('KeyConditionExpression', '#hkey = :hvalue');
            expect(args[1]).not.to.have.property('IndexName');
            expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#hkey', Model.hashKey);
            expect(result).to.have.property('items');
            result.items.forEach(item => {
              fields.forEach(field => expect(item).not.to.have.property(field));
            });
            done();
          })
            .catch(err => done(err));
        });
      });

      context('when range key filter was provided', () => {
        const rkey = 'anotherAttribute';
        const rvalue = 'value';
        const options = { range: { gt: {} } };
        options.range.gt[rkey] = rvalue;

        it('calls the DynamoDB query method with correct params', (done) => {
          Model.allBy(null, value, options).then((result) => {
            const args = Model._client.lastCall.args;
            expect(args[0]).to.equal('query');
            expect(args[1]).to.have.property('TableName', tableName);
            expect(args[1]).to.have.property('KeyConditionExpression', '#hkey = :hvalue AND #rkey > :rvalue');
            expect(args[1]).not.to.have.property('IndexName');
            expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#hkey', Model.hashKey);
            expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#rkey', rkey);
            expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:hvalue', value);
            expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:rvalue', rvalue);
            expect(result).to.have.property('items');
            done();
          }).catch(done);
        });

        it('should build next key for the given range key', done => {
          Model.allBy(null, value, options).then((result) => {
            const lastKey = Model.lastEvaluatedKey(result.nextPage);
            expect(lastKey).to.have.property(rkey, item[rkey])
            expect(lastKey).to.have.property(Model.hashKey)
            expect(lastKey).to.have.property(Model.rangeKey)
            done();
          }).catch(done);
        });
      });

      context('when index name was provided', () => {
        it('calls the DynamoDB query method with correct params', (done) => {
          const indexName = 'my-index';
          const options = { indexName };
          Model.allBy(null, value, options).then(() => {
            const args = Model._client.lastCall.args;
            expect(args[0]).to.equal('query');
            expect(args[1]).to.have.property('TableName', tableName);
            expect(args[1]).to.have.property('KeyConditionExpression', '#hkey = :hvalue');
            expect(args[1]).to.have.property('IndexName', indexName);
            expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#hkey', Model.hashKey);
            expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:hvalue', value);
            done();
          }).catch(done);
        });
      });

      context('when recusrive option was provided', () => {
          const firstResult = {
            items: [{ id: 'myKey1', attr: 1 }, { id: 'myKey2', attr: 2 }],
            nextPage: '2'
          };

          const secondResult = {
            items: [{ id: 'myKey3', attr: 3 }, { id: 'myKey4', attr: 4 }],
            nextPage: '3'
          };

          const lastResult = {
            items: [{ id: 'myKey5', attr: 5 }, { id: 'myKey6', attr: 6 }]
          };

          beforeEach(() => {
            sinon.stub(Model, '_allBy')
              .onFirstCall()
              .resolves(firstResult)
              .onSecondCall()
              .resolves(secondResult)
              .onThirdCall()
              .resolves(lastResult);
          });

          it('iterates recursively over the pages', (done) => {
            Model.allBy(null, value, { recursive: true }).then((results) => {
              expect(Model._allBy).to.have.been.calledThrice;
              expect(results).to.have.property('items');
              expect(results.items.length).to.equal(6);
              done();
            }).catch(err => done(err));
          });

          it('iterates recursively over the pages respecting the limit', (done) => {
            Model.allBy(null, value, { recursive: true, limit: 5 }).then((results) => {
              expect(Model._allBy).to.have.been.calledThrice;
              expect(results).to.have.property('items');
              expect(results.items.length).to.equal(5);
              done();
            }).catch(err => done(err));
          });

          afterEach(() => {
            Model._allBy.restore();
          });
      });
    });

    describe('#allBetween', () => {
      it('calls the DynamoDB query method with correct params', (done) => {
        const keyValue = 'id';
        const start = 1;
        const end = 2;
        Model.allBetween(keyValue, start, end).then((result) => {
          const args = Model._client.lastCall.args;
          expect(args[0]).to.equal('query');
          expect(args[1]).to.have.property('TableName', tableName);
          expect(args[1]).to.have.property('KeyConditionExpression', '#hkey = :hvalue AND #rkey BETWEEN :start AND :end');
          expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#hkey', Model.hashKey);
          expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#rkey', Model.rangeKey);
          expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:hvalue', keyValue);
          expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:start', start);
          expect(args[1]).to.have.deep.property('ExpressionAttributeValues.:end', end);
          expect(result).to.have.property('items');
          done();
        }).catch(done);
      });
    });

    describe('#countBy', () => {
      const key = 'key';
      const value = 'value';
      it('calls the DynamoDB query method with correct params', (done) => {
        Model.countBy(key, value).then((result) => {
          const args = Model._client.lastCall.args;
          expect(args[0]).to.equal('query');
          expect(args[1]).to.have.property('TableName', tableName);
          expect(args[1]).to.have.property('KeyConditionExpression', '#hkey = :hvalue');
          expect(args[1]).to.have.deep.property('ExpressionAttributeNames.#hkey', key);
          expect(args[1]).to.have.property('Select', 'COUNT');
          done();
        });
      });
    });

    describe('#save', () => {
      it('calls the DynamoDB put method with correct params', (done) => {
        let params = { id: 'key' };
        Model.save(params).then(() => {
          const args = Model._client.lastCall.args;
          expect(args[0]).to.equal('put');
          expect(args[1]).to.have.property('TableName', tableName);
          expect(args[1].Item).to.deep.contain(params);
          expect(args[1].Item).to.have.property('createdAt');
          done();
        });
      });
    });

    describe('#saveAll', () => {
      it('calls the DynamoDB batchWrite method with correct params', (done) => {
        const items = [{ id: 'key', some: { nonEmpty: 1 } }, { id: 'key2', some: { attribute: '', nonEmpty: 1 } }];
        const nItems = items.map((i) => omitEmpty(i));
        Model.saveAll(items).then(() => {
          const args = Model._client.lastCall.args;
          const method = args[0];
          const params = args[1];
          expect(method).to.equal('batchWrite');
          expect(params).to.have.deep.property(`RequestItems.${tableName}`);

          for (let item of params.RequestItems[tableName]) {
            expect(item).to.have.deep.property('PutRequest.Item');
            expect(nItems).to.include.something.that.deep.equals(item.PutRequest.Item);
          }
          done();
        });
      });
    });

    describe('#deleteAll', () => {
      it('calls the DynamoDB batchWrite method with correct params', (done) => {
        const itemsKeys = [['key1'], ['key2']];
        Model.deleteAll(itemsKeys).then(() => {
          const args = Model._client.lastCall.args;
          const method = args[0];
          const params = args[1];
          expect(method).to.equal('batchWrite');
          expect(params).to.have.deep.property(`RequestItems.${tableName}`);
          for (let request of params.RequestItems[tableName]) {
            expect(request).to.have.deep.property(`DeleteRequest.Key.${Model.hashKey}`);
          }
          done();
        });
      });
    });

    describe('#update', () => {
      it('calls the DynamoDB update method with correct params', (done) => {
        const params = { att: 'value', att2: 'value 2' };
        Model.update(params, hashValue, rangeValue).then(() => {
          const args = Model._client.lastCall.args;
          expect(args[0]).to.equal('update');
          expect(args[1]).to.have.property('TableName');
          expect(args[1]).to.have.property('Key');
          expect(args[1].AttributeUpdates).to.deep.equal(Model._buildAttributeUpdates(params));
          done();
        });
      });
    });

    describe('#increment', () => {
      it('calls the DynamoDB update method with correct params', (done) => {
        const count = 2;
        const countAttribute = 'someCount';
        Model.increment(countAttribute, count, hashValue, rangeValue).then(() => {
          const args = Model._client.lastCall.args;
          expect(args[0]).to.equal('update');
          expect(args[1]).to.have.property('TableName');
          expect(args[1]).to.have.property('Key');
          expect(args[1]).to.have.deep.property(`AttributeUpdates.${countAttribute}.Action`, 'ADD');
          expect(args[1]).to.have.deep.property(`AttributeUpdates.${countAttribute}.Value`, count);
          done();
        });
      });
    });

    describe('#incrementAll', () => {
      it('calls the DynamoDB update method with correct params', (done) => {
        const attrValue = {
          attr1: 1,
          attr2: -2
        };
        Model.incrementAll(hashValue, rangeValue, attrValue).then(() => {
          const args = Model._client.lastCall.args;
          expect(args[0]).to.equal('update');
          expect(args[1]).to.have.property('TableName');
          expect(args[1]).to.have.property('Key');
          expect(args[1]).to.have.deep.property('AttributeUpdates.attr1.Action', 'ADD');
          expect(args[1]).to.have.deep.property('AttributeUpdates.attr1.Value', 1);
          expect(args[1]).to.have.deep.property('AttributeUpdates.attr2.Action', 'ADD');
          expect(args[1]).to.have.deep.property('AttributeUpdates.attr2.Value', -2);
          done();
        });
      });
    });

    describe('#delete', () => {
      it('calls the DynamoDB delete method with correct params', (done) => {
        Model.delete(hashValue, rangeValue).then(() => {
          const args = Model._client.lastCall.args;
          expect(args[0]).to.equal('delete');
          expect(args[1]).to.have.property('TableName');
          expect(args[1].Key).to.deep.equal(Model._buildKey(hashValue, rangeValue));
          done();
        });
      });
    });

    describe('#isValid', () => {
      context('when using validation', () => {
        before(() => {
          const schema = Joi.object({
            attr1: Joi.string().required(),
            attr2: Joi.string().required()
          });
          schemaStub = sinon.stub(Model, 'schema', { get: () => schema });
        });

        it('succeeds if all required fields are valid', () => {
          expect(Model.isValid(validModel)).to.be.true;
        });

        it('fails if required fields are missing', () => {
          expect(Model.isValid(invalidModel)).to.be.false;
        });

        after(() => {
          schemaStub.restore();
        });
      });

      context('when not using validation', () => {
        before(() => {
          schemaStub = sinon.stub(Model, 'schema', { get: () => null });
        });

        it('succeeds if no validation schema is defined', () => {
          expect(Model.isValid({ some: 'object' })).to.be.true;
        });

        after(() => {
          schemaStub.restore();
        });
      });
    });

    after(() => {
      Model._client.restore();
      tNameStub.restore();
      hashStub.restore();
      rangeStub.restore();
    });
  });

  describe('#_buildAttributeUpdates()', () => {
    it('returns a correct AttributeUpdates object', () => {
      const params = { someAttribute: 'some value', anotherAttribute: 'another value' };
      params[Model.hashKey] = 'some value';
      params[Model.rangeKey] = 'some value';
      const attributeUpdates = Model._buildAttributeUpdates(params);
      for (let key in params) {
        if (key === Model.hashKey || key === Model.rangeKey) {
          expect(attributeUpdates).not.to.have.property(key);
        } else {
          expect(attributeUpdates).to.have.deep.property(`${key}.Action`, 'PUT');
          expect(attributeUpdates).to.have.deep.property(`${key}.Value`, params[key]);
        }
      }
    });

    it('deletes an attribute if null was passed as its value', () => {
      const params = {
        someAttribute: 'some value',
        anotherAttribute: 'another value',
        toBeDeleted: null
      };
      params[Model.hashKey] = 'some value';
      params[Model.rangeKey] = 'some value';
      const attributeUpdates = Model._buildAttributeUpdates(params);
      expect(attributeUpdates.toBeDeleted).to.deep.equal({ Action: 'DELETE' });
    });
  });

  describe('#_buildOptions', () => {
    context('when fields are provided and include_fields is true', () => {
      it('returns the correct project expression and attribute names', done => {
        const fields = ['attr1', 'attr2'];
        const options = { fields: fields.join(','), include_fields: true };
        const dbOptions = Model._buildOptions(options);
        const projExpression = fields.map(attr => `#${attr}`).join(',');
        expect(dbOptions).to.have.property('ProjectionExpression', projExpression);
        expect(dbOptions).to.have.deep.property(`ExpressionAttributeNames.#${fields[0]}`, fields[0]);
        expect(dbOptions).to.have.deep.property(`ExpressionAttributeNames.#${fields[1]}`, fields[1]);
        done();
      });
    });

    context('when filter params are provided', () => {
      it('returns the correct filter expression and attribute names', done => {
        const status = 'subscribed';
        const name = 'david';
        const email = 'da';
        const options = { filters: { status: { eq: status }, name: { ne: name }, email: { bw: email } } };
        const dbOptions = Model._buildOptions(options);
        const filterExpression = '#status = :status AND #name <> :name AND begins_with(#email, :email)';
        expect(dbOptions).to.have.property('FilterExpression', filterExpression);
        expect(dbOptions).to.have.deep.property('ExpressionAttributeNames.#status', 'status');
        expect(dbOptions).to.have.deep.property('ExpressionAttributeNames.#name', 'name');
        expect(dbOptions).to.have.deep.property('ExpressionAttributeNames.#email', 'email');
        expect(dbOptions).to.have.deep.property('ExpressionAttributeValues.:status', status);
        expect(dbOptions).to.have.deep.property('ExpressionAttributeValues.:name', name);
        expect(dbOptions).to.have.deep.property('ExpressionAttributeValues.:email', email);
        done();
      });
    });
  });

  describe('#_refineItem', () => {
    context('when fields are provided and include_fields is false', () => {
      it('filters the specified fields', done => {
        const field1 = 'field1';
        const field2 = 'field2';
        const field3 = 'field3';
        const item = { field1, field2, field3 };
        const options = { fields: `${field1},${field2}`, include_fields: false };
        const refinedResult = Model._refineItem(item, options);
        expect(refinedResult).to.have.property(field3, field3);
        expect(refinedResult).not.to.have.property(field1);
        expect(refinedResult).and.not.to.have.property(field2);
        done();
      });
    });
  });

  describe('#_refineItems', () => {
    context('when fields are provided and include_fields is false', () => {
      it('filters the specified fields in all items', done => {
        const field1 = 'field1';
        const field2 = 'field2';
        const field3 = 'field3';
        const item = { field1, field2, field3 };
        const items = Array(5).fill().map(() => item);
        const options = { fields: `${field1},${field2}`, include_fields: false };
        const refinedResult = Model._refineItems(items, options);
        refinedResult.forEach(refinedItem => {
          expect(refinedItem).not.to.have.property(field1);
          expect(refinedItem).not.to.have.property(field2);
        });
        done();
      });
    });
  });

  after(() => {
    awsMock.restore('DynamoDB.DocumentClient');
  });
});