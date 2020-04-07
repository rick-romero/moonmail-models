import { Model } from './model';

class Automation extends Model {

  static get tableName() {
    return process.env.AUTOMATIONS_TABLE;
  }

  static get hashKey() {
    return 'userId';
  }

  static get rangeKey() {
    return 'id';
  }
}

module.exports.Automation = Automation;
