import { Model } from './model';

class Open extends Model {

  static get tableName() {
    return process.env.OPENS_TABLE;
  }

  static get hashKey() {
    return 'recipientId';
  }

  static get rangeKey() {
    return 'campaignId';
  }
}

module.exports.Open = Open;
