/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),

		AbstractRemoteStorage = require('Storage:Abstract:Remote')
	;

	/**
	 * @constructor
	 * @extends AbstractRemoteStorage
	 */
	function AdminRemoteStorage()
	{
		AbstractRemoteStorage.call(this);

		this.oRequests = {};
	}

	_.extend(AdminRemoteStorage.prototype, AbstractRemoteStorage.prototype);

	/**
	 * @param {?Function} fCallback
	 * @param {string} sLogin
	 * @param {string} sPassword
	 */
	AdminRemoteStorage.prototype.adminLogin = function (fCallback, sLogin, sPassword)
	{
		this.defaultRequest(fCallback, 'AdminLogin', {
			'Login': sLogin,
			'Password': sPassword
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.adminLogout = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminLogout');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	AdminRemoteStorage.prototype.saveAdminConfig = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminSettingsUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.domainList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminDomainList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.pluginList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPluginList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.packagesList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPackagesList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.coreData = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminCoreData');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.updateCoreData = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminUpdateCoreData', {}, 90000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oPackage
	 */
	AdminRemoteStorage.prototype.packageInstall = function (fCallback, oPackage)
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
	AdminRemoteStorage.prototype.packageDelete = function (fCallback, oPackage)
	{
		this.defaultRequest(fCallback, 'AdminPackageDelete', {
			'Id': oPackage.id
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminRemoteStorage.prototype.domain = function (fCallback, sName)
	{
		this.defaultRequest(fCallback, 'AdminDomainLoad', {
			'Name': sName
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminRemoteStorage.prototype.plugin = function (fCallback, sName)
	{
		this.defaultRequest(fCallback, 'AdminPluginLoad', {
			'Name': sName
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminRemoteStorage.prototype.domainDelete = function (fCallback, sName)
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
	AdminRemoteStorage.prototype.domainDisable = function (fCallback, sName, bDisabled)
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
	AdminRemoteStorage.prototype.pluginSettingsUpdate = function (fCallback, oConfig)
	{
		return this.defaultRequest(fCallback, 'AdminPluginSettingsUpdate', oConfig);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bForce
	 */
	AdminRemoteStorage.prototype.licensing = function (fCallback, bForce)
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
	AdminRemoteStorage.prototype.licensingActivate = function (fCallback, sDomain, sKey)
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
	AdminRemoteStorage.prototype.pluginDisable = function (fCallback, sName, bDisabled)
	{
		return this.defaultRequest(fCallback, 'AdminPluginDisable', {
			'Name': sName,
			'Disabled': !!bDisabled ? '1' : '0'
		});
	};

	AdminRemoteStorage.prototype.createOrUpdateDomain = function (fCallback,
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

	AdminRemoteStorage.prototype.testConnectionForDomain = function (fCallback, sName,
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
	AdminRemoteStorage.prototype.testContacts = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminContactsTest', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	AdminRemoteStorage.prototype.saveNewAdminPassword = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminPasswordUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.adminPing = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPing');
	};

	module.exports = new AdminRemoteStorage();

}(module, require));