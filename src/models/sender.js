import { Model } from './model';

class Sender extends Model {

  static get tableName() {
    return process.env.SENDERS_TABLE;
  }

  static get hashKey() {
    return 'userId';
  }

  static get rangeKey() {
    return 'id';
  }
}

module.exports.Sender = Sender;
