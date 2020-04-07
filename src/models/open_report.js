import { Model } from './model';

class OpenReport extends Model {

  static get tableName() {
    return process.env.OPENS_REPORT_TABLE;
  }

  static get hashKey() {
    return 'campaignId';
  }

  static get rangeKey() {
    return 'timestamp';
  }
}

module.exports.OpenReport = OpenReport;
