'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _logger = require('./../logger');

var _model = require('./model');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Link = function (_Model) {
  _inherits(Link, _Model);

  function Link() {
    _classCallCheck(this, Link);

    return _possibleConstructorReturn(this, (Link.__proto__ || Object.getPrototypeOf(Link)).apply(this, arguments));
  }

  _createClass(Link, null, [{
    key: 'saveAll',
    value: function saveAll(linksParams) {
      (0, _logger.debug)('= Link.saveAll', linksParams);
      var itemsParams = { RequestItems: {} };
      itemsParams.RequestItems[this.tableName] = linksParams.map(function (link) {
        return {
          PutRequest: { Item: link }
        };
      });
      return this._client('batchWrite', itemsParams);
    }
  }, {
    key: 'incrementOpens',
    value: function incrementOpens(campaignId) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _logger.debug)('= Link.incrementOpens', campaignId, count);
      return this.increment('opensCount', count, campaignId);
    }
  }, {
    key: 'incrementClicks',
    value: function incrementClicks(campaignId, linkId) {
      var count = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

      (0, _logger.debug)('= Link.incrementClicks', campaignId, linkId, count);
      var addParams = {
        Key: {
          id: campaignId
        },
        TableName: this.tableName,
        UpdateExpression: 'ADD #linksList.#linkId.#attrName :clicksCount',
        ExpressionAttributeNames: {
          '#linksList': 'links',
          '#linkId': linkId,
          '#attrName': 'clicksCount'
        },
        ExpressionAttributeValues: {
          ':clicksCount': count
        }
      };
      return this._client('update', addParams);
    }
  }, {
    key: 'tableName',
    get: function get() {
      return process.env.LINKS_TABLE;
    }
  }]);

  return Link;
}(_model.Model);

module.exports.Link = Link;