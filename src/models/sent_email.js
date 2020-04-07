import { Model } from './model';

class SentEmail extends Model {

  static get tableName() {
    return process.env.SENT_EMAILS_TABLE;
  }

  static get hashKey() {
    return 'messageId';
  }
}

module.exports.SentEmail = SentEmail;
