import { Model } from './model';

class ClickReport extends Model {

  static get tableName() {
    return process.env.CLICKS_REPORT_TABLE;
  }

  static get hashKey() {
    return 'campaignId';
  }

  static get rangeKey() {
    return 'timestamp';
  }
}

module.exports.ClickReport = ClickReport;
