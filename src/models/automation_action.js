import { Model } from './model';

class AutomationAction extends Model {
  static get tableName() {
    return process.env.AUTOMATION_ACTIONS_TABLE;
  }

  static get footprintStatusIndex() {
    return process.env.FOOTPRINT_STATUS_INDEX_NAME;
  }

  static get automationIndex() {
    return process.env.AUTOMATION_INDEX_NAME;
  }

  static get hashKey() {
    return 'automationId';
  }

  static get rangeKey() {
    return 'id';
  }

  static allByStatusAndFootprint(status, footprint) {
    const options = {
      indexName: this.footprintStatusIndex,
      range: {eq: {footprint}}
    };
    return this.allBy('status', status, options);
  }
}

module.exports.AutomationAction = AutomationAction;
