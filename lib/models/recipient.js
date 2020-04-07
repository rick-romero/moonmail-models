'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _deepAssign = require('deep-assign');

var _deepAssign2 = _interopRequireDefault(_deepAssign);

var _model = require('./model');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var statuses = {
  subscribed: 'subscribed',
  awaitingConfirmation: 'awaitingConfirmation',
  unsubscribed: 'unsubscribed',
  bounced: 'bounced',
  complaint: 'complained'
};

var subscriptionOrigins = {
  signupForm: 'signupForm',
  listImport: 'listImport',
  manual: 'manual'
};

var Recipient = function (_Model) {
  _inherits(Recipient, _Model);

  function Recipient() {
    _classCallCheck(this, Recipient);

    return _possibleConstructorReturn(this, (Recipient.__proto__ || Object.getPrototypeOf(Recipient)).apply(this, arguments));
  }

  _createClass(Recipient, null, [{
    key: 'emailBeginsWith',
    value: function emailBeginsWith(listId, email) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var indexOptions = {
        indexName: this.emailIndex,
        range: { bw: { email: email } }
      };
      var dbOptions = Object.assign({}, indexOptions, options);
      return this.allBy(this.hashKey, listId, dbOptions);
    }
  }, {
    key: 'allByStatus',
    value: function allByStatus(listId, status) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var indexOptions = {
        indexName: this.statusIndex,
        range: { eq: { status: status } }
      };
      var dbOptions = Object.assign({}, indexOptions, options);
      return this.allBy(this.hashKey, listId, dbOptions);
    }
  }, {
    key: 'allByEmail',
    value: function allByEmail(email) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var indexOptions = {
        indexName: this.globalEmailIndex
      };
      var dbOptions = Object.assign({}, indexOptions, options);
      return this.allBy('email', email, dbOptions);
    }
  }, {
    key: 'tableName',
    get: function get() {
      return process.env.RECIPIENTS_TABLE;
    }
  }, {
    key: 'emailIndex',
    get: function get() {
      return process.env.EMAIL_INDEX_NAME;
    }
  }, {
    key: 'statusIndex',
    get: function get() {
      return process.env.RECIPIENT_STATUS_INDEX_NAME;
    }
  }, {
    key: 'globalEmailIndex',
    get: function get() {
      return process.env.RECIPIENT_GLOBAL_EMAIL_INDEX_NAME;
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
    key: 'statuses',
    get: function get() {
      return statuses;
    }
  }, {
    key: 'subscriptionOrigins',
    get: function get() {
      return subscriptionOrigins;
    }
  }]);

  return Recipient;
}(_model.Model);

module.exports.Recipient = Recipient;