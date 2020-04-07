import { debug } from './../logger';
import { Model } from './model';

class Report extends Model {

  static get tableName() {
    return process.env.REPORTS_TABLE;
  }

  static get hashKey() {
    return 'campaignId';
  }

  static get userIndex() {
    return process.env.USER_REPORT_INDEX_NAME;
  }

  static allByUser(userId, options) {
    const defaultOptions = {indexName: this.userIndex};
    const dbOptions = Object.assign({}, defaultOptions, options);
    return this.allBy('userId', userId, dbOptions);
  }

  static incrementBounces(hash, count = 1) {
    debug('= Report.incrementBounces', hash);
    return this.increment('bouncesCount', count, hash);
  }

  static incrementDeliveries(hash, count = 1) {
    debug('= Report.incrementDeliveries', hash);
    return this.increment('deliveriesCount', count, hash);
  }

  static incrementComplaints(hash, count = 1) {
    debug('= Report.incrementComplaints', hash);
    return this.increment('complaintsCount', count, hash);
  }

  static incrementOpens(hash, count = 1) {
    debug('= Report.incrementOpens', hash);
    return this.increment('opensCount', count, hash);
  }

  static incrementClicks(hash, count = 1) {
    debug('= Report.incrementClicks', hash);
    return this.increment('clicksCount', count, hash);
  }

  static incrementSoftBounces(hash, count = 1) {
    debug('= Report.incrementSoftBounces', hash);
    return this.increment('softBouncesCount', count, hash);
  }

  static incrementSent(hash, count = 1) {
    debug('= Report.incrementSent', hash);
    return this.increment('sentCount', count, hash);
  }
}

module.exports.Report = Report;
