import { pString, pInt } from 'Common/Utils';
import { Settings } from 'Common/Globals';

const
	ROOT = './',
	HASH_PREFIX = '#/',
	SERVER_PREFIX = './?',
	VERSION = Settings.app('version'),
	VERSION_PREFIX = Settings.app('webVersionPath') || 'snappymail/v/' + VERSION + '/';

export const
	SUB_QUERY_PREFIX = '&q[]=',

	/**
	 * @param {string=} startupUrl
	 * @returns {string}
	 */
	root = (startupUrl = '') => HASH_PREFIX + pString(startupUrl),

	/**
	 * @returns {string}
	 */
	logoutLink = () => (rl.adminArea() && !Settings.app('adminHostUse'))
		? SERVER_PREFIX + (Settings.app('adminPath') || 'admin')
		: ROOT,

	/**
	 * @param {string} type
	 * @param {string} hash
	 * @param {string=} customSpecSuffix
	 * @returns {string}
	 */
	serverRequestRaw = (type, hash) =>
		SERVER_PREFIX + '/Raw/' + SUB_QUERY_PREFIX + '/'
		+ '0/' // AuthAccountHash ?
		+ (type
			? type + '/' + (hash ? SUB_QUERY_PREFIX + '/' + hash : '')
			: ''),

	/**
	 * @param {string} download
	 * @param {string=} customSpecSuffix
	 * @returns {string}
	 */
	attachmentDownload = (download, customSpecSuffix) =>
		serverRequestRaw('Download', download, customSpecSuffix),

	/**
	 * @param {string} type
	 * @returns {string}
	 */
	serverRequest = type => SERVER_PREFIX + '/' + type + '/' + SUB_QUERY_PREFIX + '/0/',

	/**
	 * @param {string} lang
	 * @param {boolean} isAdmin
	 * @returns {string}
	 */
	langLink = (lang, isAdmin) =>
		SERVER_PREFIX + '/Lang/0/' + (isAdmin ? 'Admin' : 'App') + '/' + encodeURI(lang) + '/' + VERSION + '/',

	/**
	 * @param {string} path
	 * @returns {string}
	 */
	staticLink = path => VERSION_PREFIX + 'static/' + path,

	/**
	 * @returns {string}
	 */
	openPgpJs = () => staticLink('js/min/openpgp.min.js'),

	/**
	 * @returns {string}
	 */
	openPgpWorkerJs = () => staticLink('js/min/openpgp.worker.min.js'),

	/**
	 * @param {string} theme
	 * @returns {string}
	 */
	themePreviewLink = theme => {
		let prefix = VERSION_PREFIX;
		if ('@custom' === theme.slice(-7)) {
			theme = theme.slice(0, theme.length - 7).trim();
			prefix = Settings.app('webPath') || '';
		}

		return prefix + 'themes/' + encodeURI(theme) + '/images/preview.png';
	},

	/**
	 * @param {string} inboxFolderName = 'INBOX'
	 * @returns {string}
	 */
	mailbox = (inboxFolderName = 'INBOX') => HASH_PREFIX + 'mailbox/' + inboxFolderName,

	/**
	 * @param {string=} screenName = ''
	 * @returns {string}
	 */
	settings = (screenName = '') => HASH_PREFIX + 'settings' + (screenName ? '/' + screenName : ''),

	/**
	 * @param {string=} screenName
	 * @returns {string}
	 */
	admin = screenName => HASH_PREFIX + (
		'AdminDomains' == screenName ? 'domains'
		: 'AdminSecurity' == screenName ? 'security'
		: ''
	),

	/**
	 * @param {string} folder
	 * @param {number=} page = 1
	 * @param {string=} search = ''
	 * @param {number=} threadUid = 0
	 * @returns {string}
	 */
	mailBox = (folder, page, search, threadUid) => {
		let result = [HASH_PREFIX + 'mailbox'];

		if (folder) {
			result.push(folder + (threadUid ? '~' + threadUid : ''));
		}

		page = pInt(page, 1);
		if (1 < page) {
			result.push('p' + page);
		}

		search = pString(search);
		if (search) {
			result.push(encodeURI(search));
		}

		return result.join('/');
	};
