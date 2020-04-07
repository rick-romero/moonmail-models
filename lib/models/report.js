'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _logger = require('./../logger');

var _model = require('./model');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Report = function (_Model) {
  _inherits(Report, _Model);

  function Report() {
    _classCallCheck(this, Report);

    return _possibleConstructorReturn(this, (Report.__proto__ || Object.getPrototypeOf(Report)).apply(this, arguments));
  }

  _createClass(Report, null, [{
    key: 'allByUser',
    value: function allByUser(userId, options) {
      var defaultOptions = { indexName: this.userIndex };
      var dbOptions = Object.assign({}, defaultOptions, options);
      return this.allBy('userId', userId, dbOptions);
    }
  }, {
    key: 'incrementBounces',
    value: function incrementBounces(hash) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _logger.debug)('= Report.incrementBounces', hash);
      return this.increment('bouncesCount', count, hash);
    }
  }, {
    key: 'incrementDeliveries',
    value: function incrementDeliveries(hash) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _logger.debug)('= Report.incrementDeliveries', hash);
      return this.increment('deliveriesCount', count, hash);
    }
  }, {
    key: 'incrementComplaints',
    value: function incrementComplaints(hash) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _logger.debug)('= Report.incrementComplaints', hash);
      return this.increment('complaintsCount', count, hash);
    }
  }, {
    key: 'incrementOpens',
    value: function incrementOpens(hash) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _logger.debug)('= Report.incrementOpens', hash);
      return this.increment('opensCount', count, hash);
    }
  }, {
    key: 'incrementClicks',
    value: function incrementClicks(hash) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _logger.debug)('= Report.incrementClicks', hash);
      return this.increment('clicksCount', count, hash);
    }
  }, {
    key: 'incrementSoftBounces',
    value: function incrementSoftBounces(hash) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _logger.debug)('= Report.incrementSoftBounces', hash);
      return this.increment('softBouncesCount', count, hash);
    }
  }, {
    key: 'incrementSent',
    value: function incrementSent(hash) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _logger.debug)('= Report.incrementSent', hash);
      return this.increment('sentCount', count, hash);
    }
  }, {
    key: 'tableName',
    get: function get() {
      return process.env.REPORTS_TABLE;
    }
  }, {
    key: 'hashKey',
    get: function get() {
      return 'campaignId';
    }
  }, {
    key: 'userIndex',
    get: function get() {
      return process.env.USER_REPORT_INDEX_NAME;
    }
  }]);

  return Report;
}(_model.Model);

module.exports.Report = Report;