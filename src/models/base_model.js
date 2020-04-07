import { DynamoDB } from 'aws-sdk';
import Joi from 'joi';
import moment from 'moment';
import base64url from 'base64-url';
import deepAssign from 'deep-assign';
import omitEmpty from 'omit-empty';
import Promise from 'bluebird';
import { debug } from './../logger';

const dynamoConfig = {
  region: process.env.AWS_REGION || 'us-east-1'
};
const db = new DynamoDB.DocumentClient(dynamoConfig);


function flattenArray(array) {
  return [].concat.apply([], array);
}

function chunkArray(array, chunkSize) {
  return Array(Math.ceil(array.length / chunkSize))
    .fill()
    .map((_, i) => array.slice(i * chunkSize, i * chunkSize + chunkSize));
}

class BaseModel {

  static save(item) {
    debug('= Model.save', item);
    const itemParams = {
      TableName: this.tableName,
      Item: item,
      ReturnValues: 'ALL_OLD'
    };
    itemParams.Item.createdAt = moment().unix();
    return this._client('put', itemParams);
  }

  static create(item, validationOptions = {}) {
    return this.validate(this.createSchema, item, validationOptions)
      .then(createParams => this.save(createParams)
        .then(() => createParams));
  }

  static batchCreate(items) {
    return Promise.resolve(chunkArray(items, 25))
      .then(itemChunks => Promise.map(itemChunks, itms => this.saveAll(itms), { concurrency: 1 }))
      .then(resultsArray => flattenArray(resultsArray));
  }

  static saveAll(items) {
    debug('= Model.saveAll', items);
    if (items.length === 0) return Promise.resolve([]);
    return Promise.map(items, item => this.validate(this.createSchema, item))
      .then((validItems) => {
        const itemsParams = { RequestItems: {} };
        itemsParams.RequestItems[this.tableName] = validItems.map(item => {
          return { PutRequest: { Item: omitEmpty(item) } };
        });
        return this._client('batchWrite', itemsParams);
      });
  }

  static deleteAll(keys) {
    debug('= Model.deleteAll', keys);
    const itemsParams = { RequestItems: {} };
    itemsParams.RequestItems[this.tableName] = keys.map(key => {
      return { DeleteRequest: { Key: this._buildKey(key[0], key[1]) } };
    });
    return this._client('batchWrite', itemsParams);
  }

  static get(hash, range, options = {}) {
    return new Promise((resolve, reject) => {
      debug('= Model.get', hash, range);
      const params = {
        TableName: this.tableName,
        Key: this._buildKey(hash, range)
      };
      const dbOptions = this._buildOptions(options);
      Object.assign(params, dbOptions);
      this._client('get', params).then(result => {
        if (result.Item) {
          resolve(this._refineItem(result.Item, options));
        } else {
          resolve({});
        }
      })
        .catch(err => reject(err));
    });
  }

  static find(hash, range, options = {}) {
    return this.get(hash, range, options)
      .then((result) => {
        if (Object.keys(result).length === 0) return Promise.reject(new Error('ItemNotFound'));
        return result;
      });
  }

  static _buildOptions(options) {
    debug('= Model._buildOptions', JSON.stringify(options));
    const fieldsOptions = this._fieldsOptions(options);
    const pageOptions = this._buildPageOptions(options);
    const limitOptions = this._buildLimitOptions(options, pageOptions);
    const filterOptions = this._filterOptions(options);
    deepAssign(fieldsOptions, pageOptions, limitOptions, filterOptions);
    debug('= Model._buildOptions fieldsOptions', JSON.stringify(fieldsOptions));
    return fieldsOptions;
  }

  static _buildLimitOptions(options) {
    if (options.limit) {
      return { Limit: options.limit };
    }
    return {};
  }

  static _buildPageOptions(options = {}) {
    var page = options.page;
    if (page) {
      if (page.charAt(0) === '-') {
        var prevPage = page.substring(1, page.length);
        return {
          ExclusiveStartKey: this.lastEvaluatedKey(prevPage),
          ScanIndexForward: !this.scanForward
        };
      } else {
        return {
          ExclusiveStartKey: this.lastEvaluatedKey(page),
          ScanIndexForward: this.scanForward
        };
      }
    }
    return {};
  }

  static _fieldsOptions(options) {
    debug('= Model._fieldsOptions', JSON.stringify(options));
    const dbOptions = {};
    if (String(options.include_fields) === 'true' && options.fields) {
      const fields = options.fields.split(',');
      dbOptions.ProjectionExpression = fields.map(field => `#${field}`).join(',');
      const fieldsMapping = fields.reduce((acumm, attrName) => {
        acumm[`#${attrName}`] = attrName;
        return acumm;
      }, {});
      dbOptions.ExpressionAttributeNames = fieldsMapping;
    }
    return dbOptions;
  }

  static _filterOptions(options) {
    debug('= Model._filterOptions', JSON.stringify(options));
    const dbOptions = {};
    if (options.filters) {
      const attributeNamesMapping = {};
      const attributeValuesMapping = {};
      const filterExpressions = [];
      Object.keys(options.filters).forEach(key => {
        const attrName = `#${key}`;
        attributeNamesMapping[attrName] = key;
        const conditions = options.filters[key];
        Object.keys(conditions).forEach(operand => {
          const value = conditions[operand];
          const attrValue = `:${key}`;
          attributeValuesMapping[attrValue] = value;
          filterExpressions.push(this._buildFilter(attrName, operand, [attrValue]));
        });
      });
      dbOptions.ExpressionAttributeNames = attributeNamesMapping;
      dbOptions.ExpressionAttributeValues = attributeValuesMapping;
      dbOptions.FilterExpression = filterExpressions.join(' AND ');
    }
    return dbOptions;
  }

  static _buildFilter(key, operand, values) {
    return this._filterOperandsMapping[operand](key, ...values);
  }

  static get _filterOperandsMapping() {
    return {
      eq: (key, value) => [key, '=', value].join(' '),
      ne: (key, value) => [key, '<>', value].join(' '),
      le: (key, value) => [key, '<=', value].join(' '),
      lt: (key, value) => [key, '<', value].join(' '),
      ge: (key, value) => [key, '>=', value].join(' '),
      gt: (key, value) => [key, '>', value].join(' '),
      bw: (key, value) => `begins_with(${key}, ${value})`,
      btw: (key, ...values) => `${key} BETWEEN ${values[0]} AND ${values[1]}`
    };
  }

  static _refineItems(items, options) {
    debug('= Model._refineItems', JSON.stringify(options));
    if (String(options.include_fields) === 'false' && options.fields) {
      return items.map(item => this._refineItem(item, options));
    } else {
      return items;
    }
  }

  static _refineItem(item, options) {
    debug('= Model._refineItem', JSON.stringify(options));
    const refined = Object.assign({}, item);
    if (String(options.include_fields) === 'false' && options.fields) {
      const fields = options.fields.split(',');
      fields.map(field => delete refined[field]);
    }
    return refined;
  }

  static update(params, hash, range) {
    debug('= Model.update', hash, range, JSON.stringify(params));
    if (Object.keys(params).length === 0) return Promise.reject(new Error('EmptyPayload'));
    return this.validate(this.updateSchema, params)
      .then(updateParams => {
        const dbParams = {
          TableName: this.tableName,
          Key: this._buildKey(hash, range),
          AttributeUpdates: this._buildAttributeUpdates(updateParams),
          ReturnValues: 'ALL_NEW'
        };
        return this._client('update', dbParams)
          .then(result => result.Attributes);
      });
  }

  static delete(hash, range) {
    return new Promise((resolve, reject) => {
      debug('= Model.delete', hash);
      const params = {
        TableName: this.tableName,
        Key: this._buildKey(hash, range)
      };
      this._client('delete', params).then(() => resolve(true))
        .catch(err => reject(err));
    });
  }

  static _getAllBy(key, value, options = {}) {
    return new Promise((resolve) => {
      // If we are in presence of a query for GSI
      // then we need to setup propagate the GSI hashKey
      // to build the pagination key. Range key is already
      // provided in options.range.
      if (key !== this.hashKey) {
        options.gsiHashKey = key;
      }
      const params = this._buildDynamoDBParams(key, value, options);
      debug('= Model._getAllBy', key, value, options);
      resolve(this._client('query', params));
    });
  }

  static _buildDynamoDBParams(key, value, options) {
    const params = {
      TableName: this.tableName,
      ScanIndexForward: this.scanForward
    };
    const keyParams = this._buildKeyParams(key, value, options);
    const dbOptions = this._buildOptions(options, params);
    return deepAssign(params, keyParams, dbOptions);
  }

  static allBy(key, value, options = {}) {
    if (!options.recursive) return this._allBy(key, value, options);
    delete options.recursive;
    return this._allBy(key, value, options)
      .then((resultSet) => {
        return this._recursiveAllBy(key, value, options, resultSet)
          .then((resultSet) => {
            const size = Math.min(options.limit || Number.MAX_SAFE_INTEGER, resultSet.items.length);
            const toReturn = Object.assign({}, resultSet, { items: resultSet.items.slice(0, size) });
            return Promise.resolve(toReturn);
          });
      }).catch(e => Promise.reject(e));
  }

  static _allBy(key, value, options = {}) {
    return new Promise((resolve, reject) => {
      debug('= Model.allBy', key, value);
      const params = this._buildDynamoDBParams(key, value, options);
      this._getAllBy(key, value, options).then((result) => {
        const response = this._buildResponse(result, params, options);
        resolve(response);
      }).catch(err => reject(err));
    });
  }

  static _recursiveAllBy(key, value, options, results) {
    debug('= Model._recursiveAllBy', key, value, options, results);
    if (!results.nextPage) return Promise.resolve(results);
    if (options.limit) {
      if (results.items.length >= options.limit) return Promise.resolve(results);
    }
    return this._allBy(key, value, Object.assign({}, options, { page: results.nextPage }))
      .then((resultSet) => {
        const aggregatedResults = Object.assign({}, resultSet, { items: [...results.items, ...resultSet.items] });
        return this._recursiveAllBy(key, value, options, aggregatedResults);
      });
  }

  static _buildKeyParams(key, hash, options = {}) {
    const hashKeyParams = this._buildHashKeyParams(key, hash, options);
    const rangeKeyParams = this._buildRangeKeyParams(options);
    const keyCondition = [
      hashKeyParams.KeyConditionExpression,
      rangeKeyParams.KeyConditionExpression
    ].filter(item => !!item).join(' AND ');
    const index = { IndexName: options.indexName };
    const params = deepAssign(hashKeyParams, rangeKeyParams, { KeyConditionExpression: keyCondition }, index);
    return params;
  }

  static _buildHashKeyParams(key, hash) {
    return {
      KeyConditionExpression: '#hkey = :hvalue',
      ExpressionAttributeNames: { '#hkey': key || this.hashKey },
      ExpressionAttributeValues: { ':hvalue': hash }
    };
  }

  static _buildRangeKeyParams(options) {
    if (options.range) {
      const operand = Object.keys(options.range)[0];
      const rangeKey = Object.keys(options.range[operand])[0];
      const rangeValue = options.range[operand][rangeKey];
      const keyCondition = this._buildFilter('#rkey', operand, [':rvalue']);
      const attributeNames = { ExpressionAttributeNames: { '#rkey': rangeKey } };
      const attributeValues = { ExpressionAttributeValues: { ':rvalue': rangeValue } };
      return Object.assign({}, { KeyConditionExpression: keyCondition }, attributeNames, attributeValues);
    } else {
      return {};
    }
  }

  static allBetween(hash, rangeStart, rangeEnd) {
    debug('= Model.allBetween', hash, rangeStart, rangeEnd);
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: '#hkey = :hvalue AND #rkey BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#hkey': this.hashKey, '#rkey': this.rangeKey },
      ExpressionAttributeValues: { ':hvalue': hash, ':start': rangeStart, ':end': rangeEnd }
    };
    return this._client('query', params).then(result => this._buildResponse(result));
  }

  static _buildResponse(result, params = {}, options = {}) {
    const items = result.Items;
    if (this._isPaginatingBackwards(options)) items.reverse();
    const response = {
      items: this._refineItems(items, options)
    };
    const paginationKeys = this._buildPaginationKey(result, params, items, options);
    deepAssign(response, paginationKeys);
    return response;
  }

  static _buildPaginationKey(result, params, items, options) {
    debug('= Model._buildPaginationKey', JSON.stringify(params));
    const paginationKey = {};
    if (items && items.length > 0) {
      if (this._hasNextPage(result, options)) {
        const lastItem = items[items.length - 1];
        const nextPage = this._buildNextKey(lastItem, options);
        Object.assign(paginationKey, nextPage);
      }
      if (!this._isFirstPage(result, params, options)) {
        const firstItem = items[0];
        const prevKey = this._buildPrevKey(firstItem, options);
        Object.assign(paginationKey, prevKey);
      }
    }
    return paginationKey;
  }

  static _hasNextPage(result, options) {
    return !!result.LastEvaluatedKey || this._isPaginatingBackwards(options);
  }

  static _buildNextKey(lastItem, options = {}) {
    debug('= Model._buildNextKey', lastItem);
    const lastKey = this._buildItemKey(lastItem, options);
    return { nextPage: this.nextPage(lastKey) };
  }

  static _buildPrevKey(firstItem, options = {}) {
    debug('= Model._buildPrevKey', firstItem);
    const firstItemKey = this._buildItemKey(firstItem, options);
    return { prevPage: this.prevPage(firstItemKey) };
  }

  static _isFirstPage(result, params, options = {}) {
    return !params.ExclusiveStartKey ||
      (!!params.ExclusiveStartKey && this._isPaginatingBackwards(options) && !result.LastEvaluatedKey);
  }

  static _isPaginatingBackwards(options) {
    return options.page && options.page.charAt(0) === '-';
  }

  static countBy(key, value) {
    return new Promise((resolve, reject) => {
      debug('= Model.allBy', key, value);
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: '#hkey = :hvalue',
        ExpressionAttributeNames: { '#hkey': key },
        ExpressionAttributeValues: { ':hvalue': value },
        Select: 'COUNT'
      };
      this._client('query', params).then((result) => {
        resolve(result.Count);
      })
        .catch(err => reject(err));
    });
  }

  static increment(attribute, count, hash, range) {
    debug('= Model.increment', hash, range, attribute, count);
    const params = {
      TableName: this.tableName,
      Key: this._buildKey(hash, range),
      AttributeUpdates: {}
    };
    params.AttributeUpdates[attribute] = {
      Action: 'ADD',
      Value: count
    };
    return this._client('update', params);
  }

  // TODO: It could be a good idea to make increment based on this
  static incrementAll(hash, range, attrValuesObj) {
    debug('= Model.incrementAttrs', hash, range, attrValuesObj);
    const params = {
      TableName: this.tableName,
      Key: this._buildKey(hash, range),
      AttributeUpdates: {}
    };
    for (let key in attrValuesObj) {
      params.AttributeUpdates[key] = {
        Action: 'ADD',
        Value: attrValuesObj[key]
      };
    }
    return this._client('update', params);
  }

  static prevPage(key) {
    debug('= prevPage', key);
    return `-${new Buffer(JSON.stringify(key)).toString('base64')}`;
  }

  static nextPage(key) {
    return base64url.encode(JSON.stringify(key));
  }

  static lastEvaluatedKey(nextPage) {
    return JSON.parse(base64url.decode(nextPage));
  }

  static get tableName() {
    return null;
  }

  static get hashKey() {
    return 'id';
  }

  static get rangeKey() {
    return null;
  }

  static get maxRetries() {
    return 10;
  }

  static get retryDelay() {
    return 50;
  }

  static get schema() {
    return null;
  }

  static get scanForward() {
    return false;
  }

  static get createSchema() {
    return null;
  }

  static get updateSchema() {
    return null;
  }

  static isValid(object, options = {}) {
    const schema = this.schema || this.createSchema;
    if (!schema) return true;
    return this._validateSchema(schema, object, options);
  }

  static _validateSchema(schema, model, options = {}) {
    if (!this.schema) return true;
    const result = Joi.validate(model, schema, options);
    return !result.error;
  }

  static validate(schema, item, options = {}) {
    if (!schema) return Promise.resolve(item);
    return Joi.validate(item, schema, options);
  }

  static _buildKey(hash, range) {
    const key = {};
    key[this.hashKey] = hash;
    if (this.rangeKey) {
      key[this.rangeKey] = range;
    }
    return key;
  }

  static _buildItemKey(item, options = {}) {
    debug('= _buildItemKey', item, options);
    const key = {};
    // Workaround to solve GSI key format
    if (options.gsiHashKey) key[options.gsiHashKey] = item[options.gsiHashKey];
    //
    key[this.hashKey] = item[this.hashKey];
    if (options.range) {
      debug('= _buildItemKey', 'Has Range');
      const operand = Object.keys(options.range)[0];
      const rangeKey = Object.keys(options.range[operand])[0];
      key[rangeKey] = item[rangeKey];
    }
    if (this.rangeKey) {
      debug('= _buildItemKey', 'Does not have range');
      key[this.rangeKey] = item[this.rangeKey];
    }
    return key;
  }

  static _buildAttributeUpdates(params) {
    const attrUpdates = {};
    for (let key in params) {
      if (key !== this.hashKey && key !== this.rangeKey) {
        const value = params[key];
        if (value === null) {
          attrUpdates[key] = { Action: 'DELETE' };
        } else {
          attrUpdates[key] = {
            Action: 'PUT',
            Value: value
          };
        }
      }
    }
    return attrUpdates;
  }

  static _client(method, params, retries = 0) {
    return new Promise((resolve, reject) => {
      debug('Model._client', JSON.stringify(params));
      this._db()[method](params, (err, data) => {
        if (err) {
          debug('= Model._client', method, 'Error', err);
          reject(err);
        } else {
          debug('= Model._client', method, 'Success');
          if (data.UnprocessedItems && Object.keys(data.UnprocessedItems).length > 0 && retries < this.maxRetries) {
            debug('= Model._client', method, 'Some unprocessed items... Retrying', JSON.stringify(data));
            const retryParams = { RequestItems: data.UnprocessedItems };
            const delay = this.retryDelay * Math.pow(2, retries);
            setTimeout(() => {
              resolve(this._client(method, retryParams, retries + 1));
            }, delay);
          } else {
            debug('= Model._client', method, 'resolving', JSON.stringify(data));
            resolve(data);
          }
        }
      });
    });
  }

  static _db() {
    return db;
  }

}

module.exports.BaseModel = BaseModel;
