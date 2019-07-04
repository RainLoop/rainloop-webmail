import { AbstractAjaxRemote } from 'Remote/AbstractAjax';

class RemoteAdminAjax extends AbstractAjaxRemote {
	constructor() {
		super();

		this.oRequests = {};
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sLogin
	 * @param {string} sPassword
	 */
	adminLogin(fCallback, sLogin, sPassword) {
		this.defaultRequest(fCallback, 'AdminLogin', {
			'Login': sLogin,
			'Password': sPassword
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	adminLogout(fCallback) {
		this.defaultRequest(fCallback, 'AdminLogout');
	}

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	saveAdminConfig(fCallback, oData) {
		this.defaultRequest(fCallback, 'AdminSettingsUpdate', oData);
	}

	/**
	 * @param {string} key
	 * @param {?Function} valueFn
	 * @param {?Function} fn
	 */
	saveAdminConfigHelper(key, valueFn, fn) {
		return (value) => {
			const data = {};
			data[key] = valueFn ? valueFn(value) : value;
			this.saveAdminConfig(fn || null, data);
		};
	}

	/**
	 * @param {?Function} fCallback
	 * @param {boolean=} bIncludeAliases = true
	 */
	domainList(fCallback, bIncludeAliases = true) {
		this.defaultRequest(fCallback, 'AdminDomainList', {
			'IncludeAliases': bIncludeAliases ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	pluginList(fCallback) {
		this.defaultRequest(fCallback, 'AdminPluginList');
	}

	/**
	 * @param {?Function} fCallback
	 */
	packagesList(fCallback) {
		this.defaultRequest(fCallback, 'AdminPackagesList');
	}

	/**
	 * @param {?Function} fCallback
	 */
	coreData(fCallback) {
		this.defaultRequest(fCallback, 'AdminCoreData');
	}

	/**
	 * @param {?Function} fCallback
	 */
	updateCoreData(fCallback) {
		this.defaultRequest(fCallback, 'AdminUpdateCoreData', {}, 90000);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oPackage
	 */
	packageInstall(fCallback, oPackage) {
		this.defaultRequest(
			fCallback,
			'AdminPackageInstall',
			{
				'Id': oPackage.id,
				'Type': oPackage.type,
				'File': oPackage.file
			},
			60000
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oPackage
	 */
	packageDelete(fCallback, oPackage) {
		this.defaultRequest(fCallback, 'AdminPackageDelete', {
			'Id': oPackage.id
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	domain(fCallback, sName) {
		this.defaultRequest(fCallback, 'AdminDomainLoad', {
			'Name': sName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	plugin(fCallback, sName) {
		this.defaultRequest(fCallback, 'AdminPluginLoad', {
			'Name': sName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	domainDelete(fCallback, sName) {
		this.defaultRequest(fCallback, 'AdminDomainDelete', {
			'Name': sName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	domainDisable(fCallback, sName, bDisabled) {
		return this.defaultRequest(fCallback, 'AdminDomainDisable', {
			Name: sName,
			Disabled: bDisabled ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oConfig
	 */
	pluginSettingsUpdate(fCallback, oConfig) {
		return this.defaultRequest(fCallback, 'AdminPluginSettingsUpdate', oConfig);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bForce
	 */
	licensing(fCallback, bForce) {
		return this.defaultRequest(fCallback, 'AdminLicensing', {
			Force: bForce ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sDomain
	 * @param {string} sKey
	 */
	licensingActivate(fCallback, sDomain, sKey) {
		return this.defaultRequest(fCallback, 'AdminLicensingActivate', {
			Domain: sDomain,
			Key: sKey
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	pluginDisable(fCallback, sName, bDisabled) {
		return this.defaultRequest(fCallback, 'AdminPluginDisable', {
			Name: sName,
			Disabled: bDisabled ? '1' : '0'
		});
	}

	createDomainAlias(fCallback, sName, sAlias) {
		this.defaultRequest(fCallback, 'AdminDomainAliasSave', {
			Name: sName,
			Alias: sAlias
		});
	}

	createOrUpdateDomain(
		fCallback,
		bCreate,
		sName,
		sIncHost,
		iIncPort,
		sIncSecure,
		bIncShortLogin,
		bUseSieve,
		sSieveAllowRaw,
		sSieveHost,
		iSievePort,
		sSieveSecure,
		sOutHost,
		iOutPort,
		sOutSecure,
		bOutShortLogin,
		bOutAuth,
		bOutPhpMail,
		sWhiteList
	) {
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
	}

	testConnectionForDomain(
		fCallback,
		sName,
		sIncHost,
		iIncPort,
		sIncSecure,
		bUseSieve,
		sSieveHost,
		iSievePort,
		sSieveSecure,
		sOutHost,
		iOutPort,
		sOutSecure,
		bOutAuth,
		bOutPhpMail
	) {
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
	}

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	testContacts(fCallback, oData) {
		this.defaultRequest(fCallback, 'AdminContactsTest', oData);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	saveNewAdminPassword(fCallback, oData) {
		this.defaultRequest(fCallback, 'AdminPasswordUpdate', oData);
	}

	/**
	 * @param {?Function} fCallback
	 */
	adminPing(fCallback) {
		this.defaultRequest(fCallback, 'AdminPing');
	}
}

export default new RemoteAdminAjax();
