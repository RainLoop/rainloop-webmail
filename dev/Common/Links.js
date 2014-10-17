
(function () {

	'use strict';

	var
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function Links()
	{
		var Settings = require('Storage/Settings');

		this.sBase = '#/';
		this.sServer = './?';
		this.sSubQuery = '&/s/=/';
		this.sVersion = Settings.settingsGet('Version');
		this.sSpecSuffix = Settings.settingsGet('AuthAccountHash') || '0';
		this.sStaticPrefix = Settings.settingsGet('StaticPrefix') || 'rainloop/v/' + this.sVersion + '/static/';
	}

	/**
	 * @return {string}
	 */
	Links.prototype.root = function ()
	{
		return this.sBase;
	};

	/**
	 * @return {string}
	 */
	Links.prototype.rootAdmin = function ()
	{
		return this.sServer + '/Admin/';
	};

	/**
	 * @param {string} sDownload
	 * @return {string}
	 */
	Links.prototype.attachmentDownload = function (sDownload)
	{
		return this.sServer + '/Raw/' + this.sSubQuery + this.sSpecSuffix + '/Download/' + sDownload;
	};

	/**
	 * @param {string} sDownload
	 * @return {string}
	 */
	Links.prototype.attachmentPreview = function (sDownload)
	{
		return this.sServer + '/Raw/' + this.sSubQuery + this.sSpecSuffix + '/View/' + sDownload;
	};

	/**
	 * @param {string} sDownload
	 * @return {string}
	 */
	Links.prototype.attachmentPreviewAsPlain = function (sDownload)
	{
		return this.sServer + '/Raw/' + this.sSubQuery + this.sSpecSuffix + '/ViewAsPlain/' + sDownload;
	};

	/**
	 * @return {string}
	 */
	Links.prototype.upload = function ()
	{
		return this.sServer + '/Upload/' + this.sSubQuery + this.sSpecSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.uploadContacts = function ()
	{
		return this.sServer + '/UploadContacts/' + this.sSubQuery + this.sSpecSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.uploadBackground = function ()
	{
		return this.sServer + '/UploadBackground/' + this.sSubQuery + this.sSpecSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.append = function ()
	{
		return this.sServer + '/Append/' + this.sSubQuery + this.sSpecSuffix + '/';
	};

	/**
	 * @param {string} sEmail
	 * @return {string}
	 */
	Links.prototype.change = function (sEmail)
	{
		return this.sServer + '/Change/' + this.sSubQuery + this.sSpecSuffix + '/' + Utils.encodeURIComponent(sEmail) + '/';
	};

	/**
	 * @param {string=} sAdd
	 * @return {string}
	 */
	Links.prototype.ajax = function (sAdd)
	{
		return this.sServer + '/Ajax/' + this.sSubQuery + this.sSpecSuffix + '/' + sAdd;
	};

	/**
	 * @param {string} sRequestHash
	 * @return {string}
	 */
	Links.prototype.messageViewLink = function (sRequestHash)
	{
		return this.sServer + '/Raw/' + this.sSubQuery + this.sSpecSuffix + '/ViewAsPlain/' + sRequestHash;
	};

	/**
	 * @param {string} sRequestHash
	 * @return {string}
	 */
	Links.prototype.messageDownloadLink = function (sRequestHash)
	{
		return this.sServer + '/Raw/' + this.sSubQuery + this.sSpecSuffix + '/Download/' + sRequestHash;
	};

	/**
	 * @param {string} sEmail
	 * @return {string}
	 */
	Links.prototype.avatarLink = function (sEmail)
	{
		return this.sServer + '/Raw/0/Avatar/' + Utils.encodeURIComponent(sEmail) + '/';
	};

	/**
	 * @param {string} sInboxFolderName = 'INBOX'
	 * @return {string}
	 */
	Links.prototype.inbox = function (sInboxFolderName)
	{
		sInboxFolderName = Utils.isUnd(sInboxFolderName) ? 'INBOX' : sInboxFolderName;
		return this.sBase + 'mailbox/' + sInboxFolderName;
	};

	/**
	 * @return {string}
	 */
	Links.prototype.messagePreview = function ()
	{
		return this.sBase + 'mailbox/message-preview';
	};

	/**
	 * @param {string=} sScreenName
	 * @return {string}
	 */
	Links.prototype.settings = function (sScreenName)
	{
		var sResult = this.sBase + 'settings';
		if (!Utils.isUnd(sScreenName) && '' !== sScreenName)
		{
			sResult += '/' + sScreenName;
		}

		return sResult;
	};

	/**
	 * @return {string}
	 */
	Links.prototype.about = function ()
	{
		return this.sBase + 'about';
	};

	/**
	 * @param {string} sScreenName
	 * @return {string}
	 */
	Links.prototype.admin = function (sScreenName)
	{
		var sResult = this.sBase;
		switch (sScreenName) {
		case 'AdminDomains':
			sResult += 'domains';
			break;
		case 'AdminSecurity':
			sResult += 'security';
			break;
		case 'AdminLicensing':
			sResult += 'licensing';
			break;
		}

		return sResult;
	};

	/**
	 * @param {string} sFolder
	 * @param {number=} iPage = 1
	 * @param {string=} sSearch = ''
	 * @return {string}
	 */
	Links.prototype.mailBox = function (sFolder, iPage, sSearch)
	{
		iPage = Utils.isNormal(iPage) ? Utils.pInt(iPage) : 1;
		sSearch = Utils.pString(sSearch);

		var sResult = this.sBase + 'mailbox/';
		if ('' !== sFolder)
		{
			sResult += encodeURI(sFolder);
		}
		if (1 < iPage)
		{
			sResult = sResult.replace(/[\/]+$/, '');
			sResult += '/p' + iPage;
		}
		if ('' !== sSearch)
		{
			sResult = sResult.replace(/[\/]+$/, '');
			sResult += '/' + encodeURI(sSearch);
		}

		return sResult;
	};

	/**
	 * @return {string}
	 */
	Links.prototype.phpInfo = function ()
	{
		return this.sServer + 'Info';
	};

	/**
	 * @param {string} sLang
	 * @return {string}
	 */
	Links.prototype.langLink = function (sLang)
	{
		return this.sServer + '/Lang/0/' + encodeURI(sLang) + '/' + this.sVersion + '/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.exportContactsVcf = function ()
	{
		return this.sServer + '/Raw/' + this.sSubQuery + this.sSpecSuffix + '/ContactsVcf/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.exportContactsCsv = function ()
	{
		return this.sServer + '/Raw/' + this.sSubQuery + this.sSpecSuffix + '/ContactsCsv/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.emptyContactPic = function ()
	{
		return this.sStaticPrefix + 'css/images/empty-contact.png';
	};

	/**
	 * @param {string} sFileName
	 * @return {string}
	 */
	Links.prototype.sound = function (sFileName)
	{
		return  this.sStaticPrefix + 'sounds/' + sFileName;
	};

	/**
	 * @param {string} sTheme
	 * @return {string}
	 */
	Links.prototype.themePreviewLink = function (sTheme)
	{
		var sPrefix = 'rainloop/v/' + this.sVersion + '/';
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
			sPrefix  = '';
		}

		return sPrefix + 'themes/' + encodeURI(sTheme) + '/images/preview.png';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.notificationMailIcon = function ()
	{
		return  this.sStaticPrefix + 'css/images/icom-message-notification.png';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.openPgpJs = function ()
	{
		return  this.sStaticPrefix + 'js/min/openpgp.js';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.socialGoogle = function ()
	{
		return this.sServer + 'SocialGoogle' + ('' !== this.sSpecSuffix ? '/' + this.sSubQuery + this.sSpecSuffix + '/' : '');
	};

	/**
	 * @return {string}
	 */
	Links.prototype.socialTwitter = function ()
	{
		return this.sServer + 'SocialTwitter' + ('' !== this.sSpecSuffix ? '/' + this.sSubQuery + this.sSpecSuffix + '/' : '');
	};

	/**
	 * @return {string}
	 */
	Links.prototype.socialFacebook = function ()
	{
		return this.sServer + 'SocialFacebook' + ('' !== this.sSpecSuffix ? '/' + this.sSubQuery + this.sSpecSuffix + '/' : '');
	};

	module.exports = new Links();

}());