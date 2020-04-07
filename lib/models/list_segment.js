'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _model = require('./model');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var conditionTypes = {
  subscriptionOrigin: 'subscriptionOrigin',
  subscriptionDate: 'subscriptionDate'
};

var ListSegment = function (_Model) {
  _inherits(ListSegment, _Model);

  function ListSegment() {
    _classCallCheck(this, ListSegment);

    return _possibleConstructorReturn(this, (ListSegment.__proto__ || Object.getPrototypeOf(ListSegment)).apply(this, arguments));
  }

  _createClass(ListSegment, null, [{
    key: 'save',
    value: function save(item) {
      if (this.isValid(item, { allowUnknown: true })) return _get(ListSegment.__proto__ || Object.getPrototypeOf(ListSegment), 'save', this).call(this, item);
      return Promise.reject({ name: 'ListSegmentError', type: 'InvalidSegment', message: 'provided object is not valid' });
    }
  }, {
    key: 'update',
    value: function update(params, hash, range) {
      var _this2 = this;

      if (params.conditions) {
        return this.validateConditions(params.conditions).then(function () {
          return _get(ListSegment.__proto__ || Object.getPrototypeOf(ListSegment), 'update', _this2).call(_this2, params, hash, range);
        });
      }
      return _get(ListSegment.__proto__ || Object.getPrototypeOf(ListSegment), 'update', this).call(this, params, hash, range);
    }
  }, {
    key: 'validConditions',
    value: function validConditions(conditions) {
      return this._validateSchema(this.conditionsSchema, conditions);
    }
  }, {
    key: 'validateConditions',
    value: function validateConditions(conditions) {
      return this.validConditions(conditions) ? Promise.resolve(conditions) : Promise.reject({ name: 'ListSegmentError', type: 'InvalidConditions', message: 'provided object is not valid' });
    }
  }, {
    key: 'getBySegmentId',
    value: function getBySegmentId(segmentId) {
      var options = {
        indexName: this.segmentIdIndex
      };
      return this.allBy('id', segmentId, options).then(function (result) {
        return result.items.pop();
      });
    }
  }, {
    key: 'tableName',
    get: function get() {
      return process.env.LIST_SEGMENTS_TABLE;
    }
  }, {
    key: 'segmentIdIndex',
    get: function get() {
      return process.env.LIST_SEGMENT_ID_INDEX_NAME;
    }
  }, {
    key: 'hashKey',
    get: function get() {
      return 'listId';
    }
  }, {
    key: 'rangeKey',
    get: function get() {
      return 'id';
    }
  }, {
    key: 'conditionTypes',
    get: function get() {
      return conditionTypes;
    }
  }, {
    key: 'schema',
    get: function get() {
      return _joi2.default.object({
        listId: _joi2.default.string().required(),
        id: _joi2.default.string().required(),
        gid: _joi2.default.string(),
        userId: _joi2.default.string().required(),
        name: _joi2.default.string().required(),
        archived: _joi2.default.boolean().default(false),
        conditionMatch: _joi2.default.string().default('all'),
        conditions: this.conditionsSchema
      });
    }
  }, {
    key: 'conditionsSchema',
    get: function get() {
      return _joi2.default.array().items(_joi2.default.object().keys({
        conditionType: _joi2.default.string().default('filter'),
        condition: _joi2.default.object().keys({
          queryType: _joi2.default.string().required(),
          fieldToQuery: _joi2.default.string().required(),
          searchTerm: _joi2.default.any().required()
        })
      })).min(1);
    }
  }]);

  return ListSegment;
}(_model.Model);

module.exports.ListSegment = ListSegment;