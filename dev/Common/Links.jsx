
import {window} from 'common';
import Utils from 'Common/Utils';
import Settings from 'Storage/Settings';

class Links
{
	constructor() {

		this.sBase = '#/';
		this.sServer = './?';

		this.sVersion = Settings.settingsGet('Version');
		this.sAuthSuffix = Settings.settingsGet('AuthAccountHash') || '0';
		this.sWebPrefix = Settings.settingsGet('WebPath') || '';
		this.sAdminPath = Settings.settingsGet('AdminPath') || 'admin';
		this.sVersionPrefix = Settings.settingsGet('WebVersionPath') || 'rainloop/v/' + this.sVersion + '/';
		this.sStaticPrefix = this.sVersionPrefix + 'static/';
	}

	populateAuthSuffix() {
		this.sAuthSuffix = Settings.settingsGet('AuthAccountHash') || '0';
	}

	/**
	 * @return {string}
	 */
	subQueryPrefix() {
		return '&q[]=';
	}

	/**
	 * @param {string=} startupUrl
	 * @return {string}
	 */
	root(startupUrl = '') {
		return this.sBase + Utils.pString(startupUrl);
	}

	/**
	 * @return {string}
	 */
	rootAdmin() {
		return this.sServer + this.sAdminPath;
	}

	/**
	 * @return {string}
	 */
	rootUser() {
		return './';
	}

	/**
	 * @param {string} type
	 * @param {string} download
	 * @param {string=} customSpecSuffix
	 * @return {string}
	 */
	attachmentRaw(type, download, customSpecSuffix) {
		customSpecSuffix = Utils.isUnd(customSpecSuffix) ? this.sAuthSuffix : customSpecSuffix;
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + customSpecSuffix + '/' + type + '/' +
			this.subQueryPrefix() + '/' + download;
	}

	/**
	 * @param {string} download
	 * @param {string=} customSpecSuffix
	 * @return {string}
	 */
	attachmentDownload(download, customSpecSuffix) {
		return this.attachmentRaw('Download', download, customSpecSuffix);
	}

	/**
	 * @param {string} download
	 * @param {string=} customSpecSuffix
	 * @return {string}
	 */
	attachmentPreview(download, customSpecSuffix) {
		return this.attachmentRaw('View', download, customSpecSuffix);
	}

	/**
	 * @param {string} download
	 * @param {string=} customSpecSuffix
	 * @return {string}
	 */
	attachmentThumbnailPreview(download, customSpecSuffix) {
		return this.attachmentRaw('ViewThumbnail', download, customSpecSuffix);
	}

	/**
	 * @param {string} download
	 * @param {string=} customSpecSuffix
	 * @return {string}
	 */
	attachmentPreviewAsPlain(download, customSpecSuffix) {
		return this.attachmentRaw('ViewAsPlain', download, customSpecSuffix);
	}

	/**
	 * @param {string} download
	 * @param {string=} customSpecSuffix
	 * @return {string}
	 */
	attachmentFramed(download, customSpecSuffix) {
		return this.attachmentRaw('FramedView', download, customSpecSuffix);
	}

	/**
	 * @return {string}
	 */
	upload() {
		return this.sServer + '/Upload/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/';
	}

	/**
	 * @return {string}
	 */
	uploadContacts() {
		return this.sServer + '/UploadContacts/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/';
	}

	/**
	 * @return {string}
	 */
	uploadBackground() {
		return this.sServer + '/UploadBackground/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/';
	}

	/**
	 * @return {string}
	 */
	append() {
		return this.sServer + '/Append/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/';
	}

	/**
	 * @param {string} email
	 * @return {string}
	 */
	change(email) {
		return this.sServer + '/Change/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' + Utils.encodeURIComponent(email) + '/';
	}

	/**
	 * @param {string} add
	 * @return {string}
	 */
	ajax(add) {
		return this.sServer + '/Ajax/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' + add;
	}

	/**
	 * @param {string} requestHash
	 * @return {string}
	 */
	messageViewLink(requestHash) {
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/ViewAsPlain/' + this.subQueryPrefix() + '/' + requestHash;
	}

	/**
	 * @param {string} requestHash
	 * @return {string}
	 */
	messageDownloadLink(requestHash) {
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/Download/' + this.subQueryPrefix() + '/' + requestHash;
	}

	/**
	 * @param {string} email
	 * @return {string}
	 */
	avatarLink(email) {
		return this.sServer + '/Raw/0/Avatar/' + Utils.encodeURIComponent(email) + '/';
	}

	/**
	 * @param {string} hash
	 * @return {string}
	 */
	publicLink(hash) {
		return this.sServer + '/Raw/0/Public/' + hash + '/';
	}

	/**
	 * @param {string} hash
	 * @return {string}
	 */
	userBackground(hash) {
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix +
			'/UserBackground/' + this.subQueryPrefix() + '/' + hash;
	}

	/**
	 * @param {string} inboxFolderName = 'INBOX'
	 * @return {string}
	 */
	inbox(inboxFolderName = 'INBOX') {
		return this.sBase + 'mailbox/' + inboxFolderName;
	}

	/**
	 * @param {string=} screenName
	 * @return {string}
	 */
	settings(screenName = '') {
		return this.sBase + 'settings' + (screenName ? '/' + screenName : '');
	}

	/**
	 * @return {string}
	 */
	about() {
		return this.sBase + 'about';
	}

	/**
	 * @param {string} screenName
	 * @return {string}
	 */
	admin (screenName) {
		let result = this.sBase;
		switch (screenName) {
			case 'AdminDomains':
				result += 'domains';
				break;
			case 'AdminSecurity':
				result += 'security';
				break;
			case 'AdminLicensing':
				result += 'licensing';
				break;
		}

		return result;
	}

	/**
	 * @param {string} folder
	 * @param {number=} page = 1
	 * @param {string=} search = ''
	 * @param {string=} threadUid = ''
	 * @return {string}
	 */
	mailBox(folder, page = 1, search = '', threadUid = '') {

		page = Utils.isNormal(page) ? Utils.pInt(page) : 1;
		search = Utils.pString(search);

		let result = this.sBase + 'mailbox/';

		if ('' !== folder)
		{
			const resultThreadUid = Utils.pInt(threadUid);
			result += window.encodeURI(folder) + (0 < resultThreadUid ? '~' + resultThreadUid : '');
		}

		if (1 < page)
		{
			result = result.replace(/[\/]+$/, '');
			result += '/p' + page;
		}

		if ('' !== search)
		{
			result = result.replace(/[\/]+$/, '');
			result += '/' + window.encodeURI(search);
		}

		return result;
	}

	/**
	 * @return {string}
	 */
	phpInfo() {
		return this.sServer + 'Info';
	}

	/**
	 * @param {string} lang
	 * @param {boolean} admin
	 * @return {string}
	 */
	langLink(lang, admin) {
		return this.sServer + '/Lang/0/' + (admin ? 'Admin' : 'App') + '/' + window.encodeURI(lang) + '/' + this.sVersion + '/';
	}

	/**
	 * @return {string}
	 */
	exportContactsVcf() {
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/ContactsVcf/';
	}

	/**
	 * @return {string}
	 */
	exportContactsCsv() {
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/ContactsCsv/';
	}

	/**
	 * @return {string}
	 */
	emptyContactPic() {
		return this.sStaticPrefix + 'css/images/empty-contact.png';
	}

	/**
	 * @param {string} fileName
	 * @return {string}
	 */
	sound(fileName) {
		return  this.sStaticPrefix + 'sounds/' + fileName;
	}

	/**
	 * @param {string} theme
	 * @return {string}
	 */
	themePreviewLink(theme) {
		let prefix = this.sVersionPrefix;
		if ('@custom' === theme.substr(-7))
		{
			theme = Utils.trim(theme.substring(0, theme.length - 7));
			prefix = this.sWebPrefix;
		}

		return prefix + 'themes/' + window.encodeURI(theme) + '/images/preview.png';
	}

	/**
	 * @return {string}
	 */
	notificationMailIcon() {
		return this.sStaticPrefix + 'css/images/icom-message-notification.png';
	}

	/**
	 * @return {string}
	 */
	openPgpJs() {
		return this.sStaticPrefix + 'js/min/openpgp.min.js';
	}

	/**
	 * @return {string}
	 */
	openPgpWorkerJs() {
		return this.sStaticPrefix + 'js/min/openpgp.worker.min.js';
	}

	/**
	 * @return {string}
	 */
	openPgpWorkerPath() {
		return this.sStaticPrefix + 'js/min/';
	}

	/**
	 * @param {boolean} xauth = false
	 * @return {string}
	 */
	socialGoogle(xauth = false) {
		return this.sServer + 'SocialGoogle' + ('' !== this.sAuthSuffix ? '/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' : '') +
			(xauth ? '&xauth=1' : '');
	}

	/**
	 * @return {string}
	 */
	socialTwitter() {
		return this.sServer + 'SocialTwitter' + ('' !== this.sAuthSuffix ? '/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' : '');
	}

	/**
	 * @return {string}
	 */
	socialFacebook() {
		return this.sServer + 'SocialFacebook' + ('' !== this.sAuthSuffix ? '/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' : '');
	}
}

module.exports = new Links();
