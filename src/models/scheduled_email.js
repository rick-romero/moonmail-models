import moment from 'moment';
import { debug } from './../logger';
import { Model } from './model';

class ScheduledEmail extends Model {
  static get tableName() {
    return process.env.SCHEDULED_EMAILS_TABLE;
  }

  static get hashKey() {
    return 'automationActionId';
  }

  static get rangeKey() {
    return 'id';
  }

  static toBeSent() {
    debug('= ScheduledEmail.toBeSent');
    const params = {
      TableName: this.tableName,
      FilterExpression: 'scheduledAt < :now and #status = :status and attribute_not_exists(sentAt)',
      ExpressionAttributeValues: {
        ':now': moment().unix(),
        ':status': 'scheduled'
      },
      ExpressionAttributeNames: {
        '#status': 'status'
      }
    };
    return this._client('scan', params)
      .then(result => result.Items);
  }
}

module.exports.ScheduledEmail = ScheduledEmail;
