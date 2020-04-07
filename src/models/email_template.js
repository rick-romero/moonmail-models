import { Model } from './model';

class EmailTemplate extends Model {

  static get tableName() {
    return process.env.TEMPLATES_TABLE;
  }

  static get hashKey() {
    return 'userId';
  }

  static get rangeKey() {
    return 'id';
  }
}

module.exports.EmailTemplate = EmailTemplate;
