
import Utils from 'Common/Utils';
import EmailModel from 'Model/Email';

class MessageHelper
{
	constructor() {}

	/**
	 * @param {Array.<EmailModel>} emails
	 * @param {boolean=} friendlyView = false
	 * @param {boolean=} wrapWithLink = false
	 * @return {string}
	 */
	emailArrayToString(emails, friendlyView = false, wrapWithLink = false) {

		let
			result = [],
			index = 0,
			len = 0
		;

		if (Utils.isNonEmptyArray(emails))
		{
			for (index = 0, len = emails.length; index < len; index++)
			{
				result.push(emails[index].toLine(friendlyView, wrapWithLink));
			}
		}

		return result.join(', ');
	}

	/**
	 * @param {Array.<EmailModel>} emails
	 * @return {string}
	 */
	emailArrayToStringClear(emails) {

		let
			result = [],
			index = 0,
			len = 0
		;

		if (Utils.isNonEmptyArray(emails))
		{
			for (index = 0, len = emails.length; index < len; index++)
			{
				if (emails[index] && emails[index].email && '' !== emails[index].name)
				{
					result.push(emails[index].email);
				}
			}
		}

		return result.join(', ');
	}

	/**
	 * @param {?Array} json
	 * @return {Array.<EmailModel>}
	 */
	emailArrayFromJson(json) {

		let
			index = 0,
			len = 0,
			email = null,
			result = []
		;

		if (Utils.isNonEmptyArray(json))
		{
			for (index = 0, len = json.length; index < len; index++)
			{
				email = EmailModel.newInstanceFromJson(json[index]);
				if (email)
				{
					result.push(email);
				}
			}
		}

		return result;
	}

	/**
	 * @param {Array.<EmailModel>} inputEmails
	 * @param {Object} unic
	 * @param {Array} localEmails
	 */
	replyHelper(inputEmails, unic, localEmails) {

		if (inputEmails && 0 < inputEmails.length)
		{
			let index = 0;
			const len = inputEmails.length;

			for (; index < len; index++)
			{
				if (Utils.isUnd(unic[inputEmails[index].email]))
				{
					unic[inputEmails[index].email] = true;
					localEmails.push(inputEmails[index]);
				}
			}
		}
	}
}

export default new MessageHelper();
