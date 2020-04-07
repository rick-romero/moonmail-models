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

  static toBeSent(results = [], lastIndex = null) {
    debug('= ScheduledEmail.toBeSent');
    const params = {
      TableName: this.tableName,
      FilterExpression: 'scheduledAt < :now and scheduledAt > :before and #status = :status and attribute_not_exists(sentAt)',
      ExpressionAttributeValues: {
        ':now': moment().unix(),
        ':status': 'scheduled',
        ':before': 1533838396 //GMT Thursday, 9 August 2018 18:13:16, registers before this date should be ignored for now
      },
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExclusiveStartKey: lastIndex
    };
    return this._client('scan', params)
      .then(result => {
        if(result.LastEvaluatedKey != null){
          const newResult = [...result.Items, ...results]
          return this.toBeSent(newResult, result.LastEvaluatedKey)
        }else{
          const newResult = [...result.Items, ...results]
          return newResult
        }
      });
  }
}

module.exports.ScheduledEmail = ScheduledEmail;
