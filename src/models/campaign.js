import { debug } from './../logger';
import { Model } from './model';
import Joi from 'joi';
import moment from 'moment';
import deepAssign from 'deep-assign';

class Campaign extends Model {

  static get tableName() {
    return process.env.CAMPAIGNS_TABLE;
  }

  static get sentAtIndex() {
    return process.env.SENT_AT_INDEX_NAME;
  }

  static get scheduledAtIndex() {
    return process.env.SCHEDULED_AT_INDEX_NAME;
  }

  static get archivedIndex() {
    return process.env.ARCHIVED_INDEX_NAME;
  }

  static get hashKey() {
    return 'userId';
  }

  static get rangeKey() {
    return 'id';
  }

  static get schema() {
    return Joi.object({
      userId: Joi.string().required(),
      body: Joi.string().required(),
      subject: Joi.string().required(),
      name: Joi.string().required(),
      id: Joi.string().required(),
      senderId: Joi.string(),
      listIds: Joi.array(),
      segmentId: Joi.string(),
      sentAt: Joi.number(),
      createdAt: Joi.number(),
      scheduledAt: Joi.number(),
      status: Joi.string(),
      isUpToDate: Joi.boolean(),
      template: Joi.string()
    });
  }

  static isValidToBeSent(campaign) {
    debug('= Campaign.isValidToBeSent', campaign);
    const schema = Joi.alternatives().try(
      Joi.object({
        userId: Joi.string().required(),
        id: Joi.string().required(),
        body: Joi.string().required(),
        subject: Joi.string().required(),
        listIds: Joi.array().items(Joi.string().required()).required(),
        attachments: Joi.array(),
        segmentId: Joi.string().allow(null),
        name: Joi.string().required(),
        senderId: Joi.string().allow(null),
        sentAt: Joi.number(),
        createdAt: Joi.number(),
        scheduledAt: Joi.number(),
        status: Joi.string().regex(/^scheduled|draft$/).required(),
        isUpToDate: Joi.boolean(),
        template: Joi.string(),
        archived: Joi.boolean()
      }),
      Joi.object({
        userId: Joi.string().required(),
        id: Joi.string().required(),
        body: Joi.string().required(),
        subject: Joi.string().required(),
        listIds: Joi.array(),
        attachments: Joi.array(),
        segmentId: Joi.string().allow(null).required(),
        name: Joi.string().required(),
        senderId: Joi.string().allow(null),
        sentAt: Joi.number(),
        createdAt: Joi.number(),
        scheduledAt: Joi.number(),
        status: Joi.string().regex(/^scheduled|draft|PaymentGatewayError*/).required(),
        isUpToDate: Joi.boolean(),
        template: Joi.string(),
        archived: Joi.boolean()
      })
    );
    return this._validateSchema(schema, campaign);
  }

  static sentLastMonth(userId) {
    debug('= Campaign.sentLastMonth', userId);
    return this.sentLastNDays(userId, 30);
  }

  static sentLastNDays(userId, n = 1) {
    return new Promise((resolve, reject) => {
      debug('= Campaign.sentLastNDays', userId, n);
      const lastMonthTimestamp = moment().subtract(n, 'days').unix();
      const params = {
        TableName: this.tableName,
        IndexName: this.sentAtIndex,
        KeyConditionExpression: 'userId = :userId and sentAt > :lastDays',
        ExpressionAttributeValues: { ':lastDays': lastMonthTimestamp, ':userId': userId },
        Select: 'COUNT'
      };
      return this._client('query', params).then(result => resolve(result.Count))
        .catch(err => reject(err));
    });
  }

  static sentBy(userId, options = {}) {
    return new Promise((resolve, reject) => {
      debug('= Campaign.sentBy', userId);
      const filterOptions = { filters: { status: { eq: 'sent' } } };
      const sentByOptions = deepAssign(options, filterOptions);
      return this.allBy('userId', userId, sentByOptions).then(result => resolve(result))
        .catch(err => reject(err));
    });
  }

  static allByArchiveStatus(userId, options = {}) {
    return new Promise((resolve, reject) => {
      debug('= Campaign.archived', userId);
      const defaultOptions = { IndexName: this.archivedIndex };
      const archivedOptions = deepAssign(defaultOptions, options);
      return this.allBy('userId', userId, archivedOptions).then(result => resolve(result))
        .catch(err => reject(err));
    });
  }

  static schedule(userId, campaignId, scheduledAt) {
    debug('= Campaign.schedule', userId, campaignId, scheduledAt);
    const params = { scheduledAt, status: 'scheduled' };
    return this.update(params, userId, campaignId);
  }

  static cancelSchedule(userId, campaignId) {
    return new Promise((resolve, reject) => {
      debug('= Campaign.cancelSchedule', userId, campaignId);
      const params = {
        TableName: this.tableName,
        Key: this._buildKey(userId, campaignId),
        UpdateExpression: 'SET #status=:status REMOVE #scheduledAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#scheduledAt': 'scheduledAt'
        },
        ExpressionAttributeValues: { ':status': 'draft' },
        ReturnValues: 'ALL_NEW'
      };
      return this._client('update', params).then(result => resolve(result.Attributes))
        .catch(err => reject(err));
    });
  }

  static scheduledInPast() {
    return new Promise((resolve, reject) => {
      debug('= Campaign.scheduledInPast');
      const params = {
        TableName: this.tableName,
        IndexName: this.scheduledAtIndex,
        FilterExpression: 'scheduledAt < :now and #status = :status and attribute_not_exists(sentAt)',
        ExpressionAttributeValues: {
          ':now': moment().unix(),
          ':status': 'scheduled'
        },
        ExpressionAttributeNames: {
          '#status': 'status'
        }
      };
      return this._client('scan', params).then(result => resolve(result.Items))
        .catch(err => reject(err));
    });
  }
}

module.exports.Campaign = Campaign;
