import { Model } from './model';

class Click extends Model {

  static get tableName() {
    return process.env.CLICKS_TABLE;
  }

  static get hashKey() {
    return 'recipientId';
  }

  static get rangeKey() {
    return 'linkId';
  }
}

module.exports.Click = Click;
