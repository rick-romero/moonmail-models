'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _logger = require('./../logger');

var _model = require('./model');

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _deepAssign = require('deep-assign');

var _deepAssign2 = _interopRequireDefault(_deepAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Campaign = function (_Model) {
  _inherits(Campaign, _Model);

  function Campaign() {
    _classCallCheck(this, Campaign);

    return _possibleConstructorReturn(this, (Campaign.__proto__ || Object.getPrototypeOf(Campaign)).apply(this, arguments));
  }

  _createClass(Campaign, null, [{
    key: 'isValidToBeSent',
    value: function isValidToBeSent(campaign) {
      (0, _logger.debug)('= Campaign.isValidToBeSent', campaign);
      var schema = _joi2.default.alternatives().try(_joi2.default.object({
        userId: _joi2.default.string().required(),
        id: _joi2.default.string().required(),
        body: _joi2.default.string().required(),
        subject: _joi2.default.string().required(),
        listIds: _joi2.default.array().items(_joi2.default.string().required()).required(),
        attachments: _joi2.default.array(),
        segmentId: _joi2.default.string().allow(null),
        name: _joi2.default.string().required(),
        senderId: _joi2.default.string().allow(null),
        sentAt: _joi2.default.number(),
        createdAt: _joi2.default.number(),
        scheduledAt: _joi2.default.number(),
        status: _joi2.default.string().regex(/^scheduled|draft$/).required(),
        isUpToDate: _joi2.default.boolean(),
        template: _joi2.default.string(),
        archived: _joi2.default.boolean()
      }), _joi2.default.object({
        userId: _joi2.default.string().required(),
        id: _joi2.default.string().required(),
        body: _joi2.default.string().required(),
        subject: _joi2.default.string().required(),
        listIds: _joi2.default.array(),
        attachments: _joi2.default.array(),
        segmentId: _joi2.default.string().allow(null).required(),
        name: _joi2.default.string().required(),
        senderId: _joi2.default.string().allow(null),
        sentAt: _joi2.default.number(),
        createdAt: _joi2.default.number(),
        scheduledAt: _joi2.default.number(),
        status: _joi2.default.string().regex(/^scheduled|draft|PaymentGatewayError*/).required(),
        isUpToDate: _joi2.default.boolean(),
        template: _joi2.default.string(),
        archived: _joi2.default.boolean()
      }));
      return this._validateSchema(schema, campaign);
    }
  }, {
    key: 'sentLastMonth',
    value: function sentLastMonth(userId) {
      (0, _logger.debug)('= Campaign.sentLastMonth', userId);
      return this.sentLastNDays(userId, 30);
    }
  }, {
    key: 'sentLastNDays',
    value: function sentLastNDays(userId) {
      var _this2 = this;

      var n = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      return new Promise(function (resolve, reject) {
        (0, _logger.debug)('= Campaign.sentLastNDays', userId, n);
        var lastMonthTimestamp = (0, _moment2.default)().subtract(n, 'days').unix();
        var params = {
          TableName: _this2.tableName,
          IndexName: _this2.sentAtIndex,
          KeyConditionExpression: 'userId = :userId and sentAt > :lastDays',
          ExpressionAttributeValues: { ':lastDays': lastMonthTimestamp, ':userId': userId },
          Select: 'COUNT'
        };
        return _this2._client('query', params).then(function (result) {
          return resolve(result.Count);
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: 'sentBy',
    value: function sentBy(userId) {
      var _this3 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new Promise(function (resolve, reject) {
        (0, _logger.debug)('= Campaign.sentBy', userId);
        var filterOptions = { filters: { status: { eq: 'sent' } } };
        var sentByOptions = (0, _deepAssign2.default)(options, filterOptions);
        return _this3.allBy('userId', userId, sentByOptions).then(function (result) {
          return resolve(result);
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: 'allByArchiveStatus',
    value: function allByArchiveStatus(userId) {
      var _this4 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new Promise(function (resolve, reject) {
        (0, _logger.debug)('= Campaign.archived', userId);
        var defaultOptions = { IndexName: _this4.archivedIndex };
        var archivedOptions = (0, _deepAssign2.default)(defaultOptions, options);
        return _this4.allBy('userId', userId, archivedOptions).then(function (result) {
          return resolve(result);
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: 'schedule',
    value: function schedule(userId, campaignId, scheduledAt) {
      (0, _logger.debug)('= Campaign.schedule', userId, campaignId, scheduledAt);
      var params = { scheduledAt: scheduledAt, status: 'scheduled' };
      return this.update(params, userId, campaignId);
    }
  }, {
    key: 'cancelSchedule',
    value: function cancelSchedule(userId, campaignId) {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        (0, _logger.debug)('= Campaign.cancelSchedule', userId, campaignId);
        var params = {
          TableName: _this5.tableName,
          Key: _this5._buildKey(userId, campaignId),
          UpdateExpression: 'SET #status=:status REMOVE #scheduledAt',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#scheduledAt': 'scheduledAt'
          },
          ExpressionAttributeValues: { ':status': 'draft' },
          ReturnValues: 'ALL_NEW'
        };
        return _this5._client('update', params).then(function (result) {
          return resolve(result.Attributes);
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: 'scheduledInPast',
    value: function scheduledInPast() {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        (0, _logger.debug)('= Campaign.scheduledInPast');
        var params = {
          TableName: _this6.tableName,
          IndexName: _this6.scheduledAtIndex,
          FilterExpression: 'scheduledAt < :now and #status = :status and attribute_not_exists(sentAt)',
          ExpressionAttributeValues: {
            ':now': (0, _moment2.default)().unix(),
            ':status': 'scheduled'
          },
          ExpressionAttributeNames: {
            '#status': 'status'
          }
        };
        return _this6._client('scan', params).then(function (result) {
          return resolve(result.Items);
        }).catch(function (err) {
          return reject(err);
        });
      });
    }
  }, {
    key: 'tableName',
    get: function get() {
      return process.env.CAMPAIGNS_TABLE;
    }
  }, {
    key: 'sentAtIndex',
    get: function get() {
      return process.env.SENT_AT_INDEX_NAME;
    }
  }, {
    key: 'scheduledAtIndex',
    get: function get() {
      return process.env.SCHEDULED_AT_INDEX_NAME;
    }
  }, {
    key: 'archivedIndex',
    get: function get() {
      return process.env.ARCHIVED_INDEX_NAME;
    }
  }, {
    key: 'hashKey',
    get: function get() {
      return 'userId';
    }
  }, {
    key: 'rangeKey',
    get: function get() {
      return 'id';
    }
  }, {
    key: 'schema',
    get: function get() {
      return _joi2.default.object({
        userId: _joi2.default.string().required(),
        body: _joi2.default.string().required(),
        subject: _joi2.default.string().required(),
        name: _joi2.default.string().required(),
        id: _joi2.default.string().required(),
        senderId: _joi2.default.string(),
        listIds: _joi2.default.array(),
        segmentId: _joi2.default.string(),
        sentAt: _joi2.default.number(),
        createdAt: _joi2.default.number(),
        scheduledAt: _joi2.default.number(),
        status: _joi2.default.string(),
        isUpToDate: _joi2.default.boolean(),
        template: _joi2.default.string()
      });
    }
  }]);

  return Campaign;
}(_model.Model);

module.exports.Campaign = Campaign;