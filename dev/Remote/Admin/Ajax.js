
var
	_ = require('_'),

	Utils = require('Common/Utils'),

	AbstractAjaxRemote = require('Remote/AbstractAjax');

/**
 * @constructor
 * @extends AbstractAjaxRemote
 */
function RemoteAdminAjax()
{
	AbstractAjaxRemote.call(this);

	this.oRequests = {};
}

_.extend(RemoteAdminAjax.prototype, AbstractAjaxRemote.prototype);

/**
 * @param {?Function} fCallback
 * @param {string} sLogin
 * @param {string} sPassword
 */
RemoteAdminAjax.prototype.adminLogin = function(fCallback, sLogin, sPassword)
{
	this.defaultRequest(fCallback, 'AdminLogin', {
		'Login': sLogin,
		'Password': sPassword
	});
};

/**
 * @param {?Function} fCallback
 */
RemoteAdminAjax.prototype.adminLogout = function(fCallback)
{
	this.defaultRequest(fCallback, 'AdminLogout');
};

/**
 * @param {?Function} fCallback
 * @param {?} oData
 */
RemoteAdminAjax.prototype.saveAdminConfig = function(fCallback, oData)
{
	this.defaultRequest(fCallback, 'AdminSettingsUpdate', oData);
};

/**
 * @param {string} key
 * @param {?Function} valueFn
 * @param {?Function} fn
 */
RemoteAdminAjax.prototype.saveAdminConfigHelper = function(key, valueFn, fn)
{
	var self = this;
	return function(value) {
		var data = {};
		data[key] = valueFn ? valueFn(value) : value;
		self.saveAdminConfig(fn || null, data);
	};
};

/**
 * @param {?Function} fCallback
 * @param {boolean=} bIncludeAliases = true
 */
RemoteAdminAjax.prototype.domainList = function(fCallback, bIncludeAliases)
{
	bIncludeAliases = Utils.isUnd(bIncludeAliases) ? true : bIncludeAliases;
	this.defaultRequest(fCallback, 'AdminDomainList', {
		'IncludeAliases': bIncludeAliases ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 */
RemoteAdminAjax.prototype.pluginList = function(fCallback)
{
	this.defaultRequest(fCallback, 'AdminPluginList');
};

/**
 * @param {?Function} fCallback
 */
RemoteAdminAjax.prototype.packagesList = function(fCallback)
{
	this.defaultRequest(fCallback, 'AdminPackagesList');
};

/**
 * @param {?Function} fCallback
 */
RemoteAdminAjax.prototype.coreData = function(fCallback)
{
	this.defaultRequest(fCallback, 'AdminCoreData');
};

/**
 * @param {?Function} fCallback
 */
RemoteAdminAjax.prototype.updateCoreData = function(fCallback)
{
	this.defaultRequest(fCallback, 'AdminUpdateCoreData', {}, 90000);
};

/**
 * @param {?Function} fCallback
 * @param {Object} oPackage
 */
RemoteAdminAjax.prototype.packageInstall = function(fCallback, oPackage)
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
RemoteAdminAjax.prototype.packageDelete = function(fCallback, oPackage)
{
	this.defaultRequest(fCallback, 'AdminPackageDelete', {
		'Id': oPackage.id
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 */
RemoteAdminAjax.prototype.domain = function(fCallback, sName)
{
	this.defaultRequest(fCallback, 'AdminDomainLoad', {
		'Name': sName
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 */
RemoteAdminAjax.prototype.plugin = function(fCallback, sName)
{
	this.defaultRequest(fCallback, 'AdminPluginLoad', {
		'Name': sName
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 */
RemoteAdminAjax.prototype.domainDelete = function(fCallback, sName)
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
RemoteAdminAjax.prototype.domainDisable = function(fCallback, sName, bDisabled)
{
	return this.defaultRequest(fCallback, 'AdminDomainDisable', {
		Name: sName,
		Disabled: bDisabled ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {Object} oConfig
 */
RemoteAdminAjax.prototype.pluginSettingsUpdate = function(fCallback, oConfig)
{
	return this.defaultRequest(fCallback, 'AdminPluginSettingsUpdate', oConfig);
};

/**
 * @param {?Function} fCallback
 * @param {boolean} bForce
 */
RemoteAdminAjax.prototype.licensing = function(fCallback, bForce)
{
	return this.defaultRequest(fCallback, 'AdminLicensing', {
		Force: bForce ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sDomain
 * @param {string} sKey
 */
RemoteAdminAjax.prototype.licensingActivate = function(fCallback, sDomain, sKey)
{
	return this.defaultRequest(fCallback, 'AdminLicensingActivate', {
		Domain: sDomain,
		Key: sKey
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 * @param {boolean} bDisabled
 */
RemoteAdminAjax.prototype.pluginDisable = function(fCallback, sName, bDisabled)
{
	return this.defaultRequest(fCallback, 'AdminPluginDisable', {
		Name: sName,
		Disabled: bDisabled ? '1' : '0'
	});
};

RemoteAdminAjax.prototype.createDomainAlias = function(fCallback, sName, sAlias)
{
	this.defaultRequest(fCallback, 'AdminDomainAliasSave', {
		Name: sName,
		Alias: sAlias
	});
};

RemoteAdminAjax.prototype.createOrUpdateDomain = function(fCallback,
	bCreate, sName,
	sIncHost, iIncPort, sIncSecure, bIncShortLogin,
	bUseSieve, sSieveAllowRaw, sSieveHost, iSievePort, sSieveSecure,
	sOutHost, iOutPort, sOutSecure, bOutShortLogin, bOutAuth, bOutPhpMail,
	sWhiteList)
{
	this.defaultRequest(fCallback, 'AdminDomainSave', {
		'Create': bCreate ? '1' : '0',
		'Name': sName,

		'IncHost': sIncHost,
		'IncPort': iIncPort,
		'IncSecure': sIncSecure,
		'IncShortLogin': bIncShortLogin ? '1' : '0',

		'UseSieve': bUseSieve ? '1' : '0',
		'SieveAllowRaw': sSieveAllowRaw ? '1' : '0',
		'SieveHost': sSieveHost,
		'SievePort': iSievePort,
		'SieveSecure': sSieveSecure,

		'OutHost': sOutHost,
		'OutPort': iOutPort,
		'OutSecure': sOutSecure,
		'OutShortLogin': bOutShortLogin ? '1' : '0',
		'OutAuth': bOutAuth ? '1' : '0',
		'OutUsePhpMail': bOutPhpMail ? '1' : '0',

		'WhiteList': sWhiteList
	});
};

RemoteAdminAjax.prototype.testConnectionForDomain = function(fCallback, sName,
	sIncHost, iIncPort, sIncSecure,
	bUseSieve, sSieveHost, iSievePort, sSieveSecure,
	sOutHost, iOutPort, sOutSecure, bOutAuth, bOutPhpMail)
{
	this.defaultRequest(fCallback, 'AdminDomainTest', {
		'Name': sName,
		'IncHost': sIncHost,
		'IncPort': iIncPort,
		'IncSecure': sIncSecure,
		'UseSieve': bUseSieve ? '1' : '0',
		'SieveHost': sSieveHost,
		'SievePort': iSievePort,
		'SieveSecure': sSieveSecure,
		'OutHost': sOutHost,
		'OutPort': iOutPort,
		'OutSecure': sOutSecure,
		'OutAuth': bOutAuth ? '1' : '0',
		'OutUsePhpMail': bOutPhpMail ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {?} oData
 */
RemoteAdminAjax.prototype.testContacts = function(fCallback, oData)
{
	this.defaultRequest(fCallback, 'AdminContactsTest', oData);
};

/**
 * @param {?Function} fCallback
 * @param {?} oData
 */
RemoteAdminAjax.prototype.saveNewAdminPassword = function(fCallback, oData)
{
	this.defaultRequest(fCallback, 'AdminPasswordUpdate', oData);
};

/**
 * @param {?Function} fCallback
 */
RemoteAdminAjax.prototype.adminPing = function(fCallback)
{
	this.defaultRequest(fCallback, 'AdminPing');
};

module.exports = new RemoteAdminAjax();
