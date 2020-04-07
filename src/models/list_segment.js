import Joi from 'joi';
import { Model } from './model';


const conditionTypes = {
  subscriptionOrigin: 'subscriptionOrigin',
  subscriptionDate: 'subscriptionDate'
};

class ListSegment extends Model {

  static get tableName() {
    return process.env.LIST_SEGMENTS_TABLE;
  }

  static get segmentIdIndex() {
    return process.env.LIST_SEGMENT_ID_INDEX_NAME;
  }

  static get hashKey() {
    return 'listId';
  }

  static get rangeKey() {
    return 'id';
  }

  static get conditionTypes() {
    return conditionTypes;
  }

  static get schema() {
    return Joi.object({
      listId: Joi.string().required(),
      id: Joi.string().required(),
      gid: Joi.string(),
      userId: Joi.string().required(),
      name: Joi.string().required(),
      archived: Joi.boolean().default(false),
      conditionMatch: Joi.string().default('all'),
      conditions: this.conditionsSchema
    });
  }

  static get conditionsSchema() {
    return Joi.array().items(Joi.object().keys({
      conditionType: Joi.string().default('filter'),
      condition: Joi.object().keys({
        queryType: Joi.string().required(),
        fieldToQuery: Joi.string().required(),
        searchTerm: Joi.any().required()
      })
    })).min(1);
  }

  static save(item) {
    if (this.isValid(item, { allowUnknown: true })) return super.save(item);
    return Promise.reject({ name: 'ListSegmentError', type: 'InvalidSegment', message: 'provided object is not valid' });
  }

  static update(params, hash, range) {
    if (params.conditions) {
      return this.validateConditions(params.conditions)
        .then(() => super.update(params, hash, range));
    }
    return super.update(params, hash, range);
  }

  static validConditions(conditions) {
    return this._validateSchema(this.conditionsSchema, conditions);
  }

  static validateConditions(conditions) {
    return this.validConditions(conditions) ? Promise.resolve(conditions) : Promise.reject({ name: 'ListSegmentError', type: 'InvalidConditions', message: 'provided object is not valid' });
  }

  static getBySegmentId(segmentId) {
    const options = {
      indexName: this.segmentIdIndex
    };
    return this.allBy('id', segmentId, options)
      .then(result => result.items.pop());
  }
}

module.exports.ListSegment = ListSegment;
