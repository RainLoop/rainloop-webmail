import { isNonEmptyArray, isUnd } from 'Common/Utils';
import { EmailModel } from 'Model/Email';

/**
 * @param {Array.<EmailModel>} emails
 * @param {boolean=} friendlyView = false
 * @param {boolean=} wrapWithLink = false
 * @returns {string}
 */
export function emailArrayToString(emails, friendlyView = false, wrapWithLink = false) {
	let index = 0,
		len = 0;

	const result = [];
	if (isNonEmptyArray(emails)) {
		for (len = emails.length; index < len; index++) {
			result.push(emails[index].toLine(friendlyView, wrapWithLink));
		}
	}

	return result.join(', ');
}

/**
 * @param {Array.<EmailModel>} emails
 * @returns {string}
 */
export function emailArrayToStringClear(emails) {
	let index = 0,
		len = 0;

	const result = [];
	if (isNonEmptyArray(emails)) {
		for (len = emails.length; index < len; index++) {
			if (emails[index] && emails[index].email && '' !== emails[index].name) {
				result.push(emails[index].email);
			}
		}
	}

	return result.join(', ');
}

/**
 * @param {?Array} json
 * @returns {Array.<EmailModel>}
 */
export function emailArrayFromJson(json) {
	let index = 0,
		len = 0,
		email = null;

	const result = [];
	if (isNonEmptyArray(json)) {
		for (index = 0, len = json.length; index < len; index++) {
			email = EmailModel.newInstanceFromJson(json[index]);
			if (email) {
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
export function replyHelper(inputEmails, unic, localEmails) {
	if (inputEmails && 0 < inputEmails.length) {
		let index = 0;
		const len = inputEmails.length;

		for (; index < len; index++) {
			if (isUnd(unic[inputEmails[index].email])) {
				unic[inputEmails[index].email] = true;
				localEmails.push(inputEmails[index]);
			}
		}
	}
}
