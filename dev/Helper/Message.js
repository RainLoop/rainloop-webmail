import { isNonEmptyArray, isUnd } from 'Common/Utils';
import { EmailModel } from 'Model/Email';

/**
 * @param {Array.<EmailModel>} emails
 * @param {boolean=} friendlyView = false
 * @param {boolean=} wrapWithLink = false
 * @returns {string}
 */
export function emailArrayToString(emails, friendlyView = false, wrapWithLink = false) {
	const result = [];
	if (isNonEmptyArray(emails)) {
		emails.forEach(email => result.push(email.toLine(friendlyView, wrapWithLink)));
	}

	return result.join(', ');
}

/**
 * @param {Array.<EmailModel>} emails
 * @returns {string}
 */
export function emailArrayToStringClear(emails) {
	const result = [];
	if (isNonEmptyArray(emails)) {
		emails.forEach(email => {
			if (email && email.email && '' !== email.name) {
				result.push(email.email);
			}
		});
	}

	return result.join(', ');
}

/**
 * @param {?Array} json
 * @returns {Array.<EmailModel>}
 */
export function emailArrayFromJson(json) {
	const result = [];
	if (isNonEmptyArray(json)) {
		json.forEach(email => {
			email = EmailModel.newInstanceFromJson(email);
			if (email) {
				result.push(email);
			}
		});
	}

	return result;
}

/**
 * @param {Array.<EmailModel>} inputEmails
 * @param {Object} unic
 * @param {Array} localEmails
 */
export function replyHelper(inputEmails, unic, localEmails) {
	if (inputEmails) {
		inputEmails.forEach(email => {
			if (isUnd(unic[email.email])) {
				unic[email.email] = true;
				localEmails.push(email);
			}
		});
	}
}
