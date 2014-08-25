/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		_ = require('../External/underscore.js'),

		AbstractAjaxRemoteStorage = require('./AbstractAjaxRemoteStorage.js')
	;

	/**
	 * @constructor
	 * @extends AbstractAjaxRemoteStorage
	 */
	function AdminAjaxRemoteStorage()
	{
		AbstractAjaxRemoteStorage.call(this);

		this.oRequests = {};
	}

	_.extend(AdminAjaxRemoteStorage.prototype, AbstractAjaxRemoteStorage.prototype);

	/**
	 * @param {?Function} fCallback
	 * @param {string} sLogin
	 * @param {string} sPassword
	 */
	AdminAjaxRemoteStorage.prototype.adminLogin = function (fCallback, sLogin, sPassword)
	{
		this.defaultRequest(fCallback, 'AdminLogin', {
			'Login': sLogin,
			'Password': sPassword
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminAjaxRemoteStorage.prototype.adminLogout = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminLogout');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	AdminAjaxRemoteStorage.prototype.saveAdminConfig = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminSettingsUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminAjaxRemoteStorage.prototype.domainList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminDomainList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminAjaxRemoteStorage.prototype.pluginList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPluginList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminAjaxRemoteStorage.prototype.packagesList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPackagesList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminAjaxRemoteStorage.prototype.coreData = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminCoreData');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminAjaxRemoteStorage.prototype.updateCoreData = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminUpdateCoreData', {}, 90000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oPackage
	 */
	AdminAjaxRemoteStorage.prototype.packageInstall = function (fCallback, oPackage)
	{
		this.defaultRequest(fCallback, 'AdminPackageInstall', {
			'Id': oPackage.id,
			'Type': oPackage.type,
			'File': oPackage.file
		}, 60000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oPackage
	 */
	AdminAjaxRemoteStorage.prototype.packageDelete = function (fCallback, oPackage)
	{
		this.defaultRequest(fCallback, 'AdminPackageDelete', {
			'Id': oPackage.id
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminAjaxRemoteStorage.prototype.domain = function (fCallback, sName)
	{
		this.defaultRequest(fCallback, 'AdminDomainLoad', {
			'Name': sName
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminAjaxRemoteStorage.prototype.plugin = function (fCallback, sName)
	{
		this.defaultRequest(fCallback, 'AdminPluginLoad', {
			'Name': sName
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminAjaxRemoteStorage.prototype.domainDelete = function (fCallback, sName)
	{
		this.defaultRequest(fCallback, 'AdminDomainDelete', {
			'Name': sName
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	AdminAjaxRemoteStorage.prototype.domainDisable = function (fCallback, sName, bDisabled)
	{
		return this.defaultRequest(fCallback, 'AdminDomainDisable', {
			'Name': sName,
			'Disabled': !!bDisabled ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oConfig
	 */
	AdminAjaxRemoteStorage.prototype.pluginSettingsUpdate = function (fCallback, oConfig)
	{
		return this.defaultRequest(fCallback, 'AdminPluginSettingsUpdate', oConfig);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bForce
	 */
	AdminAjaxRemoteStorage.prototype.licensing = function (fCallback, bForce)
	{
		return this.defaultRequest(fCallback, 'AdminLicensing', {
			'Force' : bForce ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sDomain
	 * @param {string} sKey
	 */
	AdminAjaxRemoteStorage.prototype.licensingActivate = function (fCallback, sDomain, sKey)
	{
		return this.defaultRequest(fCallback, 'AdminLicensingActivate', {
			'Domain' : sDomain,
			'Key' : sKey
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	AdminAjaxRemoteStorage.prototype.pluginDisable = function (fCallback, sName, bDisabled)
	{
		return this.defaultRequest(fCallback, 'AdminPluginDisable', {
			'Name': sName,
			'Disabled': !!bDisabled ? '1' : '0'
		});
	};

	AdminAjaxRemoteStorage.prototype.createOrUpdateDomain = function (fCallback,
		bCreate, sName, sIncHost, iIncPort, sIncSecure, bIncShortLogin,
		sOutHost, iOutPort, sOutSecure, bOutShortLogin, bOutAuth, sWhiteList)
	{
		this.defaultRequest(fCallback, 'AdminDomainSave', {
			'Create': bCreate ? '1' : '0',
			'Name': sName,
			'IncHost': sIncHost,
			'IncPort': iIncPort,
			'IncSecure': sIncSecure,
			'IncShortLogin': bIncShortLogin ? '1' : '0',
			'OutHost': sOutHost,
			'OutPort': iOutPort,
			'OutSecure': sOutSecure,
			'OutShortLogin': bOutShortLogin ? '1' : '0',
			'OutAuth': bOutAuth ? '1' : '0',
			'WhiteList': sWhiteList
		});
	};

	AdminAjaxRemoteStorage.prototype.testConnectionForDomain = function (fCallback, sName,
		sIncHost, iIncPort, sIncSecure,
		sOutHost, iOutPort, sOutSecure, bOutAuth)
	{
		this.defaultRequest(fCallback, 'AdminDomainTest', {
			'Name': sName,
			'IncHost': sIncHost,
			'IncPort': iIncPort,
			'IncSecure': sIncSecure,
			'OutHost': sOutHost,
			'OutPort': iOutPort,
			'OutSecure': sOutSecure,
			'OutAuth': bOutAuth ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	AdminAjaxRemoteStorage.prototype.testContacts = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminContactsTest', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	AdminAjaxRemoteStorage.prototype.saveNewAdminPassword = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminPasswordUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminAjaxRemoteStorage.prototype.adminPing = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPing');
	};

	module.exports = new AdminAjaxRemoteStorage();

}(module));