import { debug } from './../logger';
import { Model } from './model';

class Link extends Model {

  static get tableName() {
    return process.env.LINKS_TABLE;
  }

  static saveAll(linksParams) {
    debug('= Link.saveAll', linksParams);
    let itemsParams = {RequestItems: {}};
    itemsParams.RequestItems[this.tableName] = linksParams.map((link) => {
      return {
        PutRequest: {Item: link}
      };
    });
    return this._client('batchWrite', itemsParams);
  }

  static incrementOpens(campaignId, count = 1) {
    debug('= Link.incrementOpens', campaignId, count);
    return this.increment('opensCount', count, campaignId);
  }

  static incrementClicks(campaignId, linkId, count = 1) {
    debug('= Link.incrementClicks', campaignId, linkId, count);
    const addParams = {
      Key: {
        id: campaignId
      },
      TableName: this.tableName,
      UpdateExpression: 'ADD #linksList.#linkId.#attrName :clicksCount',
      ExpressionAttributeNames: {
        '#linksList': 'links',
        '#linkId': linkId,
        '#attrName': 'clicksCount'
      },
      ExpressionAttributeValues: {
        ':clicksCount': count
      }
    };
    return this._client('update', addParams);
  }
}

module.exports.Link = Link;
