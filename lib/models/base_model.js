'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _awsSdk = require('aws-sdk');

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _base64Url = require('base64-url');

var _base64Url2 = _interopRequireDefault(_base64Url);

var _deepAssign = require('deep-assign');

var _deepAssign2 = _interopRequireDefault(_deepAssign);

var _omitEmpty = require('omit-empty');

var _omitEmpty2 = _interopRequireDefault(_omitEmpty);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _logger = require('./../logger');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dynamoConfig = {
  region: process.env.AWS_REGION || 'us-east-1'
};
var db = new _awsSdk.DynamoDB.DocumentClient(dynamoConfig);

function flattenArray(array) {
  return [].concat.apply([], array);
}

function chunkArray(array, chunkSize) {
  return Array(Math.ceil(array.length / chunkSize)).fill().map(function (_, i) {
    return array.slice(i * chunkSize, i * chunkSize + chunkSize);
  });
}

var BaseModel = function () {
  function BaseModel() {
    _classCallCheck(this, BaseModel);
  }

  _createClass(BaseModel, null, [{
    key: 'save',
    value: function save(item) {
      (0, _logger.debug)('= Model.save', item);
      var itemParams = {
        TableName: this.tableName,
        Item: item,
        ReturnValues: 'ALL_OLD'
      };
      itemParams.Item.createdAt = (0, _moment2.default)().unix();
      return this._client('put', itemParams);
    }
  }, {
    key: 'create',
    value: function create(item) {
      var _this = this;

      var validationOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return this.validate(this.createSchema, item, validationOptions).then(function (createParams) {
        return _this.save(createParams).then(function () {
          return createParams;
        });
      });
    }
  }, {
    key: 'batchCreate',
    value: function batchCreate(items) {
      var _this2 = this;

      return _bluebird2.default.resolve(chunkArray(items, 25)).then(function (itemChunks) {
        return _bluebird2.default.map(itemChunks, function (itms) {
          return _this2.saveAll(itms);
        }, { concurrency: 1 });
      }).then(function (resultsArray) {
        return flattenArray(resultsArray);
      });
    }
  }, {
    key: 'saveAll',
    value: function saveAll(items) {
      var _this3 = this;

      (0, _logger.debug)('= Model.saveAll', items);
      if (items.length === 0) return _bluebird2.default.resolve([]);
      return _bluebird2.default.map(items, function (item) {
        return _this3.validate(_this3.createSchema, item);
      }).then(function (validItems) {
        var itemsParams = { RequestItems: {} };
        itemsParams.RequestItems[_this3.tableName] = validItems.map(function (item) {
          return { PutRequest: { Item: (0, _omitEmpty2.default)(item) } };
        });
        return _this3._client('batchWrite', itemsParams);
      });
    }
  }, {
    key: 'deleteAll',
    value: function deleteAll(keys) {
      var _this4 = this;

      (0, _logger.debug)('= Model.deleteAll', keys);
      var itemsParams = { RequestItems: {} };
      itemsParams.RequestItems[this.tableName] = keys.map(function (key) {
        return { DeleteRequest: { Key: _this4._buildKey(key[0], key[1]) } };
      });
      return this._client('batchWrite', itemsParams);
    }
  }, {
    key: 'get',
    value: function get(hash, range) {
      var _this5 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return new _bluebird2.default(function (resolve, reject) {
        (0, _logger.debug)('= Model.get', hash, range);
        var params = {
          TableName: _this5.tableName,
          Key: _this5._buildKey(hash, range)
        };
        var dbOptions = _this5._buildOptions(options);
        Object.assign(params, dbOptions);
        _this5._client('get', params).then(function (result) {
          if (result.Item) {
            resolve(_this5._refineItem(result.Item, options));
          } else {
            resolve({});
          }
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: 'find',
    value: function find(hash, range) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return this.get(hash, range, options).then(function (result) {
        if (Object.keys(result).length === 0) return _bluebird2.default.reject(new Error('ItemNotFound'));
        return result;
      });
    }
  }, {
    key: '_buildOptions',
    value: function _buildOptions(options) {
      (0, _logger.debug)('= Model._buildOptions', JSON.stringify(options));
      var fieldsOptions = this._fieldsOptions(options);
      var pageOptions = this._buildPageOptions(options);
      var limitOptions = this._buildLimitOptions(options, pageOptions);
      var filterOptions = this._filterOptions(options);
      (0, _deepAssign2.default)(fieldsOptions, pageOptions, limitOptions, filterOptions);
      (0, _logger.debug)('= Model._buildOptions fieldsOptions', JSON.stringify(fieldsOptions));
      return fieldsOptions;
    }
  }, {
    key: '_buildLimitOptions',
    value: function _buildLimitOptions(options) {
      if (options.limit) {
        return { Limit: options.limit };
      }
      return {};
    }
  }, {
    key: '_buildPageOptions',
    value: function _buildPageOptions() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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
  }, {
    key: '_fieldsOptions',
    value: function _fieldsOptions(options) {
      (0, _logger.debug)('= Model._fieldsOptions', JSON.stringify(options));
      var dbOptions = {};
      if (String(options.include_fields) === 'true' && options.fields) {
        var fields = options.fields.split(',');
        dbOptions.ProjectionExpression = fields.map(function (field) {
          return '#' + field;
        }).join(',');
        var fieldsMapping = fields.reduce(function (acumm, attrName) {
          acumm['#' + attrName] = attrName;
          return acumm;
        }, {});
        dbOptions.ExpressionAttributeNames = fieldsMapping;
      }
      return dbOptions;
    }
  }, {
    key: '_filterOptions',
    value: function _filterOptions(options) {
      var _this6 = this;

      (0, _logger.debug)('= Model._filterOptions', JSON.stringify(options));
      var dbOptions = {};
      if (options.filters) {
        var attributeNamesMapping = {};
        var attributeValuesMapping = {};
        var filterExpressions = [];
        Object.keys(options.filters).forEach(function (key) {
          var attrName = '#' + key;
          attributeNamesMapping[attrName] = key;
          var conditions = options.filters[key];
          Object.keys(conditions).forEach(function (operand) {
            var value = conditions[operand];
            var attrValue = ':' + key;
            attributeValuesMapping[attrValue] = value;
            filterExpressions.push(_this6._buildFilter(attrName, operand, [attrValue]));
          });
        });
        dbOptions.ExpressionAttributeNames = attributeNamesMapping;
        dbOptions.ExpressionAttributeValues = attributeValuesMapping;
        dbOptions.FilterExpression = filterExpressions.join(' AND ');
      }
      return dbOptions;
    }
  }, {
    key: '_buildFilter',
    value: function _buildFilter(key, operand, values) {
      var _filterOperandsMappin;

      return (_filterOperandsMappin = this._filterOperandsMapping)[operand].apply(_filterOperandsMappin, [key].concat(_toConsumableArray(values)));
    }
  }, {
    key: '_refineItems',
    value: function _refineItems(items, options) {
      var _this7 = this;

      (0, _logger.debug)('= Model._refineItems', JSON.stringify(options));
      if (String(options.include_fields) === 'false' && options.fields) {
        return items.map(function (item) {
          return _this7._refineItem(item, options);
        });
      } else {
        return items;
      }
    }
  }, {
    key: '_refineItem',
    value: function _refineItem(item, options) {
      (0, _logger.debug)('= Model._refineItem', JSON.stringify(options));
      var refined = Object.assign({}, item);
      if (String(options.include_fields) === 'false' && options.fields) {
        var fields = options.fields.split(',');
        fields.map(function (field) {
          return delete refined[field];
        });
      }
      return refined;
    }
  }, {
    key: 'update',
    value: function update(params, hash, range) {
      var _this8 = this;

      (0, _logger.debug)('= Model.update', hash, range, JSON.stringify(params));
      if (Object.keys(params).length === 0) return _bluebird2.default.reject(new Error('EmptyPayload'));
      return this.validate(this.updateSchema, params).then(function (updateParams) {
        var dbParams = {
          TableName: _this8.tableName,
          Key: _this8._buildKey(hash, range),
          AttributeUpdates: _this8._buildAttributeUpdates(updateParams),
          ReturnValues: 'ALL_NEW'
        };
        return _this8._client('update', dbParams).then(function (result) {
          return result.Attributes;
        });
      });
    }
  }, {
    key: 'delete',
    value: function _delete(hash, range) {
      var _this9 = this;

      return new _bluebird2.default(function (resolve, reject) {
        (0, _logger.debug)('= Model.delete', hash);
        var params = {
          TableName: _this9.tableName,
          Key: _this9._buildKey(hash, range)
        };
        _this9._client('delete', params).then(function () {
          return resolve(true);
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: '_getAllBy',
    value: function _getAllBy(key, value) {
      var _this10 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return new _bluebird2.default(function (resolve) {
        // If we are in presence of a query for GSI
        // then we need to setup propagate the GSI hashKey
        // to build the pagination key. Range key is already
        // provided in options.range.
        if (key !== _this10.hashKey) {
          options.gsiHashKey = key;
        }
        var params = _this10._buildDynamoDBParams(key, value, options);
        (0, _logger.debug)('= Model._getAllBy', key, value, options);
        resolve(_this10._client('query', params));
      });
    }
  }, {
    key: '_buildDynamoDBParams',
    value: function _buildDynamoDBParams(key, value, options) {
      var params = {
        TableName: this.tableName,
        ScanIndexForward: this.scanForward
      };
      var keyParams = this._buildKeyParams(key, value, options);
      var dbOptions = this._buildOptions(options, params);
      return (0, _deepAssign2.default)(params, keyParams, dbOptions);
    }
  }, {
    key: 'allBy',
    value: function allBy(key, value) {
      var _this11 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (!options.recursive) return this._allBy(key, value, options);
      delete options.recursive;
      return this._allBy(key, value, options).then(function (resultSet) {
        return _this11._recursiveAllBy(key, value, options, resultSet).then(function (resultSet) {
          var size = Math.min(options.limit || Number.MAX_SAFE_INTEGER, resultSet.items.length);
          var toReturn = Object.assign({}, resultSet, { items: resultSet.items.slice(0, size) });
          return _bluebird2.default.resolve(toReturn);
        });
      }).catch(function (e) {
        return _bluebird2.default.reject(e);
      });
    }
  }, {
    key: '_allBy',
    value: function _allBy(key, value) {
      var _this12 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return new _bluebird2.default(function (resolve, reject) {
        (0, _logger.debug)('= Model.allBy', key, value);
        var params = _this12._buildDynamoDBParams(key, value, options);
        _this12._getAllBy(key, value, options).then(function (result) {
          var response = _this12._buildResponse(result, params, options);
          resolve(response);
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: '_recursiveAllBy',
    value: function _recursiveAllBy(key, value, options, results) {
      var _this13 = this;

      (0, _logger.debug)('= Model._recursiveAllBy', key, value, options, results);
      if (!results.nextPage) return _bluebird2.default.resolve(results);
      if (options.limit) {
        if (results.items.length >= options.limit) return _bluebird2.default.resolve(results);
      }
      return this._allBy(key, value, Object.assign({}, options, { page: results.nextPage })).then(function (resultSet) {
        var aggregatedResults = Object.assign({}, resultSet, { items: [].concat(_toConsumableArray(results.items), _toConsumableArray(resultSet.items)) });
        return _this13._recursiveAllBy(key, value, options, aggregatedResults);
      });
    }
  }, {
    key: '_buildKeyParams',
    value: function _buildKeyParams(key, hash) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var hashKeyParams = this._buildHashKeyParams(key, hash, options);
      var rangeKeyParams = this._buildRangeKeyParams(options);
      var keyCondition = [hashKeyParams.KeyConditionExpression, rangeKeyParams.KeyConditionExpression].filter(function (item) {
        return !!item;
      }).join(' AND ');
      var index = { IndexName: options.indexName };
      var params = (0, _deepAssign2.default)(hashKeyParams, rangeKeyParams, { KeyConditionExpression: keyCondition }, index);
      return params;
    }
  }, {
    key: '_buildHashKeyParams',
    value: function _buildHashKeyParams(key, hash) {
      return {
        KeyConditionExpression: '#hkey = :hvalue',
        ExpressionAttributeNames: { '#hkey': key || this.hashKey },
        ExpressionAttributeValues: { ':hvalue': hash }
      };
    }
  }, {
    key: '_buildRangeKeyParams',
    value: function _buildRangeKeyParams(options) {
      if (options.range) {
        var operand = Object.keys(options.range)[0];
        var rangeKey = Object.keys(options.range[operand])[0];
        var rangeValue = options.range[operand][rangeKey];
        var keyCondition = this._buildFilter('#rkey', operand, [':rvalue']);
        var attributeNames = { ExpressionAttributeNames: { '#rkey': rangeKey } };
        var attributeValues = { ExpressionAttributeValues: { ':rvalue': rangeValue } };
        return Object.assign({}, { KeyConditionExpression: keyCondition }, attributeNames, attributeValues);
      } else {
        return {};
      }
    }
  }, {
    key: 'allBetween',
    value: function allBetween(hash, rangeStart, rangeEnd) {
      var _this14 = this;

      (0, _logger.debug)('= Model.allBetween', hash, rangeStart, rangeEnd);
      var params = {
        TableName: this.tableName,
        KeyConditionExpression: '#hkey = :hvalue AND #rkey BETWEEN :start AND :end',
        ExpressionAttributeNames: { '#hkey': this.hashKey, '#rkey': this.rangeKey },
        ExpressionAttributeValues: { ':hvalue': hash, ':start': rangeStart, ':end': rangeEnd }
      };
      return this._client('query', params).then(function (result) {
        return _this14._buildResponse(result);
      });
    }
  }, {
    key: '_buildResponse',
    value: function _buildResponse(result) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var items = result.Items;
      if (this._isPaginatingBackwards(options)) items.reverse();
      var response = {
        items: this._refineItems(items, options)
      };
      var paginationKeys = this._buildPaginationKey(result, params, items, options);
      (0, _deepAssign2.default)(response, paginationKeys);
      return response;
    }
  }, {
    key: '_buildPaginationKey',
    value: function _buildPaginationKey(result, params, items, options) {
      (0, _logger.debug)('= Model._buildPaginationKey', JSON.stringify(params));
      var paginationKey = {};
      if (items && items.length > 0) {
        if (this._hasNextPage(result, options)) {
          var lastItem = items[items.length - 1];
          var nextPage = this._buildNextKey(lastItem, options);
          Object.assign(paginationKey, nextPage);
        }
        if (!this._isFirstPage(result, params, options)) {
          var firstItem = items[0];
          var prevKey = this._buildPrevKey(firstItem, options);
          Object.assign(paginationKey, prevKey);
        }
      }
      return paginationKey;
    }
  }, {
    key: '_hasNextPage',
    value: function _hasNextPage(result, options) {
      return !!result.LastEvaluatedKey || this._isPaginatingBackwards(options);
    }
  }, {
    key: '_buildNextKey',
    value: function _buildNextKey(lastItem) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      (0, _logger.debug)('= Model._buildNextKey', lastItem);
      var lastKey = this._buildItemKey(lastItem, options);
      return { nextPage: this.nextPage(lastKey) };
    }
  }, {
    key: '_buildPrevKey',
    value: function _buildPrevKey(firstItem) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      (0, _logger.debug)('= Model._buildPrevKey', firstItem);
      var firstItemKey = this._buildItemKey(firstItem, options);
      return { prevPage: this.prevPage(firstItemKey) };
    }
  }, {
    key: '_isFirstPage',
    value: function _isFirstPage(result, params) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return !params.ExclusiveStartKey || !!params.ExclusiveStartKey && this._isPaginatingBackwards(options) && !result.LastEvaluatedKey;
    }
  }, {
    key: '_isPaginatingBackwards',
    value: function _isPaginatingBackwards(options) {
      return options.page && options.page.charAt(0) === '-';
    }
  }, {
    key: 'countBy',
    value: function countBy(key, value) {
      var _this15 = this;

      return new _bluebird2.default(function (resolve, reject) {
        (0, _logger.debug)('= Model.allBy', key, value);
        var params = {
          TableName: _this15.tableName,
          KeyConditionExpression: '#hkey = :hvalue',
          ExpressionAttributeNames: { '#hkey': key },
          ExpressionAttributeValues: { ':hvalue': value },
          Select: 'COUNT'
        };
        _this15._client('query', params).then(function (result) {
          resolve(result.Count);
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: 'increment',
    value: function increment(attribute, count, hash, range) {
      (0, _logger.debug)('= Model.increment', hash, range, attribute, count);
      var params = {
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

  }, {
    key: 'incrementAll',
    value: function incrementAll(hash, range, attrValuesObj) {
      (0, _logger.debug)('= Model.incrementAttrs', hash, range, attrValuesObj);
      var params = {
        TableName: this.tableName,
        Key: this._buildKey(hash, range),
        AttributeUpdates: {}
      };
      for (var key in attrValuesObj) {
        params.AttributeUpdates[key] = {
          Action: 'ADD',
          Value: attrValuesObj[key]
        };
      }
      return this._client('update', params);
    }
  }, {
    key: 'prevPage',
    value: function prevPage(key) {
      (0, _logger.debug)('= prevPage', key);
      return '-' + new Buffer(JSON.stringify(key)).toString('base64');
    }
  }, {
    key: 'nextPage',
    value: function nextPage(key) {
      return _base64Url2.default.encode(JSON.stringify(key));
    }
  }, {
    key: 'lastEvaluatedKey',
    value: function lastEvaluatedKey(nextPage) {
      return JSON.parse(_base64Url2.default.decode(nextPage));
    }
  }, {
    key: 'isValid',
    value: function isValid(object) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var schema = this.schema || this.createSchema;
      if (!schema) return true;
      return this._validateSchema(schema, object, options);
    }
  }, {
    key: '_validateSchema',
    value: function _validateSchema(schema, model) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (!this.schema) return true;
      var result = _joi2.default.validate(model, schema, options);
      return !result.error;
    }
  }, {
    key: 'validate',
    value: function validate(schema, item) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (!schema) return _bluebird2.default.resolve(item);
      return _joi2.default.validate(item, schema, options);
    }
  }, {
    key: '_buildKey',
    value: function _buildKey(hash, range) {
      var key = {};
      key[this.hashKey] = hash;
      if (this.rangeKey) {
        key[this.rangeKey] = range;
      }
      return key;
    }
  }, {
    key: '_buildItemKey',
    value: function _buildItemKey(item) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      (0, _logger.debug)('= _buildItemKey', item, options);
      var key = {};
      // Workaround to solve GSI key format
      if (options.gsiHashKey) key[options.gsiHashKey] = item[options.gsiHashKey];
      //
      key[this.hashKey] = item[this.hashKey];
      if (options.range) {
        (0, _logger.debug)('= _buildItemKey', 'Has Range');
        var operand = Object.keys(options.range)[0];
        var rangeKey = Object.keys(options.range[operand])[0];
        key[rangeKey] = item[rangeKey];
      }
      if (this.rangeKey) {
        (0, _logger.debug)('= _buildItemKey', 'Does not have range');
        key[this.rangeKey] = item[this.rangeKey];
      }
      return key;
    }
  }, {
    key: '_buildAttributeUpdates',
    value: function _buildAttributeUpdates(params) {
      var attrUpdates = {};
      for (var key in params) {
        if (key !== this.hashKey && key !== this.rangeKey) {
          var value = params[key];
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
  }, {
    key: '_client',
    value: function _client(method, params) {
      var _this16 = this;

      var retries = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

      return new _bluebird2.default(function (resolve, reject) {
        (0, _logger.debug)('Model._client', JSON.stringify(params));
        _this16._db()[method](params, function (err, data) {
          if (err) {
            (0, _logger.debug)('= Model._client', method, 'Error', err);
            reject(err);
          } else {
            (0, _logger.debug)('= Model._client', method, 'Success');
            if (data.UnprocessedItems && Object.keys(data.UnprocessedItems).length > 0 && retries < _this16.maxRetries) {
              (0, _logger.debug)('= Model._client', method, 'Some unprocessed items... Retrying', JSON.stringify(data));
              var retryParams = { RequestItems: data.UnprocessedItems };
              var delay = _this16.retryDelay * Math.pow(2, retries);
              setTimeout(function () {
                resolve(_this16._client(method, retryParams, retries + 1));
              }, delay);
            } else {
              (0, _logger.debug)('= Model._client', method, 'resolving', JSON.stringify(data));
              resolve(data);
            }
          }
        });
      });
    }
  }, {
    key: '_db',
    value: function _db() {
      return db;
    }
  }, {
    key: '_filterOperandsMapping',
    get: function get() {
      return {
        eq: function eq(key, value) {
          return [key, '=', value].join(' ');
        },
        ne: function ne(key, value) {
          return [key, '<>', value].join(' ');
        },
        le: function le(key, value) {
          return [key, '<=', value].join(' ');
        },
        lt: function lt(key, value) {
          return [key, '<', value].join(' ');
        },
        ge: function ge(key, value) {
          return [key, '>=', value].join(' ');
        },
        gt: function gt(key, value) {
          return [key, '>', value].join(' ');
        },
        bw: function bw(key, value) {
          return 'begins_with(' + key + ', ' + value + ')';
        },
        btw: function btw(key) {
          return key + ' BETWEEN ' + (arguments.length <= 1 ? undefined : arguments[1]) + ' AND ' + (arguments.length <= 2 ? undefined : arguments[2]);
        }
      };
    }
  }, {
    key: 'tableName',
    get: function get() {
      return null;
    }
  }, {
    key: 'hashKey',
    get: function get() {
      return 'id';
    }
  }, {
    key: 'rangeKey',
    get: function get() {
      return null;
    }
  }, {
    key: 'maxRetries',
    get: function get() {
      return 10;
    }
  }, {
    key: 'retryDelay',
    get: function get() {
      return 50;
    }
  }, {
    key: 'schema',
    get: function get() {
      return null;
    }
  }, {
    key: 'scanForward',
    get: function get() {
      return false;
    }
  }, {
    key: 'createSchema',
    get: function get() {
      return null;
    }
  }, {
    key: 'updateSchema',
    get: function get() {
      return null;
    }
  }]);

  return BaseModel;
}();

module.exports.BaseModel = BaseModel;