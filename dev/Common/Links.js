import { pString, pInt } from 'Common/Utils';
import { Settings } from 'Common/Globals';

const
	ROOT = './',
	HASH_PREFIX = '#/',
	SERVER_PREFIX = './?',
	VERSION = Settings.app('version'),
	VERSION_PREFIX = Settings.app('webVersionPath') || 'snappymail/v/' + VERSION + '/';

/**
 * @returns {string}
 */
export const SUB_QUERY_PREFIX = '&q[]=';

/**
 * @param {string=} startupUrl
 * @returns {string}
 */
export function root(startupUrl = '') {
	return HASH_PREFIX + pString(startupUrl);
}

/**
 * @returns {string}
 */
export function logoutLink() {
	return (rl.adminArea() && !Settings.app('adminHostUse'))
		? SERVER_PREFIX + (Settings.app('adminPath') || 'admin')
		: ROOT;
}

/**
 * @param {string} type
 * @param {string} hash
 * @param {string=} customSpecSuffix
 * @returns {string}
 */
export function serverRequestRaw(type, hash, customSpecSuffix) {
	return SERVER_PREFIX + '/Raw/' + SUB_QUERY_PREFIX + '/'
		+ (null == customSpecSuffix ? '0' : customSpecSuffix) + '/'
		+ (type
			? type + '/' + (hash ? SUB_QUERY_PREFIX + '/' + hash : '')
			: '')
		;
}

/**
 * @param {string} download
 * @param {string=} customSpecSuffix
 * @returns {string}
 */
export function attachmentDownload(download, customSpecSuffix) {
	return serverRequestRaw('Download', download, customSpecSuffix);
}

/**
 * @param {string} type
 * @returns {string}
 */
export function serverRequest(type) {
	return SERVER_PREFIX + '/' + type + '/' + SUB_QUERY_PREFIX + '/0/';
}

/**
 * @param {string} email
 * @returns {string}
 */
export function change(email) {
	return serverRequest('Change') + encodeURIComponent(email) + '/';
}

/**
 * @param {string} hash
 * @returns {string}
 */
export function userBackground(hash) {
	return serverRequestRaw('UserBackground', hash);
}

/**
 * @param {string} lang
 * @param {boolean} isAdmin
 * @returns {string}
 */
export function langLink(lang, isAdmin) {
	return SERVER_PREFIX + '/Lang/0/' + (isAdmin ? 'Admin' : 'App') + '/' + encodeURI(lang) + '/' + VERSION + '/';
}

/**
 * @param {string} path
 * @returns {string}
 */
export function staticLink(path) {
	return VERSION_PREFIX + 'static/' + path;
}

/**
 * @returns {string}
 */
export function openPgpJs() {
	return staticLink('js/min/openpgp.min.js');
}

/**
 * @returns {string}
 */
export function openPgpWorkerJs() {
	return staticLink('js/min/openpgp.worker.min.js');
}

/**
 * @param {string} theme
 * @returns {string}
 */
export function themePreviewLink(theme) {
	let prefix = VERSION_PREFIX;
	if ('@custom' === theme.substr(-7)) {
		theme = theme.substr(0, theme.length - 7).trim();
		prefix = Settings.app('webPath') || '';
	}

	return prefix + 'themes/' + encodeURI(theme) + '/images/preview.png';
}

/**
 * @param {string} inboxFolderName = 'INBOX'
 * @returns {string}
 */
export function mailbox(inboxFolderName = 'INBOX') {
	return HASH_PREFIX + 'mailbox/' + inboxFolderName;
}

/**
 * @param {string=} screenName = ''
 * @returns {string}
 */
export function settings(screenName = '') {
	return HASH_PREFIX + 'settings' + (screenName ? '/' + screenName : '');
}

/**
 * @param {string} screenName
 * @returns {string}
 */
export function admin(screenName) {
	let result = HASH_PREFIX;
	switch (screenName) {
		case 'AdminDomains':
			result += 'domains';
			break;
		case 'AdminSecurity':
			result += 'security';
			break;
		// no default
	}

	return result;
}

/**
 * @param {string} folder
 * @param {number=} page = 1
 * @param {string=} search = ''
 * @param {string=} threadUid = ''
 * @returns {string}
 */
export function mailBox(folder, page = 1, search = '', threadUid = '') {
	page = pInt(page, 1);
	search = pString(search);

	let result = HASH_PREFIX + 'mailbox/';

	if (folder) {
		const resultThreadUid = pInt(threadUid);
		result += encodeURI(folder) + (0 < resultThreadUid ? '~' + resultThreadUid : '');
	}

	if (1 < page) {
		result = result.replace(/\/+$/, '') + '/p' + page;
	}

	if (search) {
		result = result.replace(/\/+$/, '') + '/' + encodeURI(search);
	}

	return result;
}

