import * as chai from 'chai';
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { EmailTemplate } from '../src/models/email_template';

chai.use(chaiAsPromised);

describe('EmailTemplate', () => {
  const tableName = 'emailTemplates-table';
  const emailTemplateHashKey = 'userId';
  const rangeKey = 'id';
  let tNameStub;

  before(() => {
    sinon.stub(EmailTemplate, '_client').resolves(true);
    tNameStub = sinon.stub(EmailTemplate, 'tableName', { get: () => tableName});
  });

  describe('#hashKey', () => {
    it('returns the hash key name', () => {
      expect(EmailTemplate.hashKey).to.equal(emailTemplateHashKey);
    });
  });

  describe('#rangeKey', () => {
    it('returns the range key name', () => {
      expect(EmailTemplate.rangeKey).to.equal(rangeKey);
    });
  });

  after(() => {
    EmailTemplate._client.restore();
    tNameStub.restore();
  });
});
