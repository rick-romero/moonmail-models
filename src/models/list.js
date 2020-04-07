import Joi from 'joi';
import { Model } from './model';
import { debug } from './../logger';

class List extends Model {

  static get tableName() {
    return process.env.LISTS_TABLE;
  }

  static get hashKey() {
    return 'userId';
  }

  static get rangeKey() {
    return 'id';
  }

  static get schema() {
    return Joi.object({
      id: Joi.string().required(),
      userId: Joi.string().required(),
      name: Joi.string().required()
    });
  }

  static isValid(object) {
    debug('= List.isValid');
    return this._validateSchema(this.schema, object, { allowUnknown: true });
  }

  static createFileImportStatus(userId, listId, file, status) {
    debug('= List.createFileImportStatus', userId, listId, file, status);
    const addParams = {
      Key: {
        userId,
        id: listId
      },
      TableName: this.tableName,
      UpdateExpression: 'SET #importStatus.#file = :newStatus',
      ExpressionAttributeNames: {
        '#importStatus': 'importStatus',
        '#file': file
      },
      ExpressionAttributeValues: {
        ':newStatus': status
      }
    };
    return this._client('update', addParams);
  }

  static updateImportStatus(userId, listId, file, status) {
    debug('= List.updateImportStatus', userId, listId, file, status);
    const addParams = {
      Key: {
        userId,
        id: listId
      },
      TableName: this.tableName,
      UpdateExpression: 'SET #importStatus.#file.#status = :newStatus, #importStatus.#file.#dateField = :newDate, #importStatus.#file.#importing = :importingValue',
      ExpressionAttributeNames: {
        '#importStatus': 'importStatus',
        '#file': file,
        '#status': 'status',
        '#dateField': status.dateField,
        '#importing': 'importing'
      },
      ExpressionAttributeValues: {
        ':newStatus': status.text,
        ':newDate': status.dateValue,
        ':importingValue': status.isImporting
      }
    };
    return this._client('update', addParams);
  }

  static appendMetadataAttributes(metadataAttributes = [], {listId, userId, list}) {
    return (list ? Promise.resolve(list) : List.get(userId, listId))
      .then(emailList => {
        const oldMetadata = emailList.metadataAttributes || [];
        const newMetadata = [...new Set(oldMetadata.concat(metadataAttributes))];
        return (oldMetadata.length < newMetadata.length)
          ? List.update({metadataAttributes: newMetadata}, emailList.userId, emailList.id)
          : emailList;
      });
  }
}

module.exports.List = List;
