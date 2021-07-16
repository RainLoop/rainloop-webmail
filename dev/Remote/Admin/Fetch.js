import { AbstractFetchRemote } from 'Remote/AbstractFetch';

class RemoteAdminFetch extends AbstractFetchRemote {
	/**
	 * @param {?Function} fCallback
	 * @param {string} sLogin
	 * @param {string} sPassword
	 */
	adminLogin(fCallback, sLogin, sPassword) {
		this.defaultRequest(fCallback, 'AdminLogin', {
			Login: sLogin,
			Password: sPassword
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
	 * @param {?Function} fCallback
	 * @param {boolean=} bIncludeAliases = true
	 */
	domainList(fCallback, bIncludeAliases = true) {
		this.defaultRequest(fCallback, 'AdminDomainList', {
			IncludeAliases: bIncludeAliases ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	packagesList(fCallback) {
		this.defaultRequest(fCallback, 'AdminPackagesList');
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
				Id: oPackage.id,
				Type: oPackage.type,
				File: oPackage.file
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
			Id: oPackage.id
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	domain(fCallback, sName) {
		this.defaultRequest(fCallback, 'AdminDomainLoad', {
			Name: sName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	plugin(fCallback, sName) {
		this.defaultRequest(fCallback, 'AdminPluginLoad', {
			Name: sName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	domainDelete(fCallback, sName) {
		this.defaultRequest(fCallback, 'AdminDomainDelete', {
			Name: sName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	domainDisable(fCallback, sName, bDisabled) {
		this.defaultRequest(fCallback, 'AdminDomainDisable', {
			Name: sName,
			Disabled: bDisabled ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oConfig
	 */
	pluginSettingsUpdate(fCallback, oConfig) {
		this.defaultRequest(fCallback, 'AdminPluginSettingsUpdate', oConfig);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	pluginDisable(fCallback, sName, bDisabled) {
		this.defaultRequest(fCallback, 'AdminPluginDisable', {
			Name: sName,
			Disabled: bDisabled ? 1 : 0
		});
	}

	createDomainAlias(fCallback, sName, sAlias) {
		this.defaultRequest(fCallback, 'AdminDomainAliasSave', {
			Name: sName,
			Alias: sAlias
		});
	}

	createOrUpdateDomain(fCallback, oDomain) {
		this.defaultRequest(fCallback, 'AdminDomainSave', {
			Create: oDomain.edit() ? 0 : 1,
			Name: oDomain.name(),

			IncHost: oDomain.imapServer(),
			IncPort: oDomain.imapPort(),
			IncSecure: oDomain.imapSecure(),
			IncShortLogin: oDomain.imapShortLogin() ? 1 : 0,

			UseSieve: oDomain.useSieve() ? 1 : 0,
			SieveHost: oDomain.sieveServer(),
			SievePort: oDomain.sievePort(),
			SieveSecure: oDomain.sieveSecure(),

			OutHost: oDomain.smtpServer(),
			OutPort: oDomain.smtpPort(),
			OutSecure: oDomain.smtpSecure(),
			OutShortLogin: oDomain.smtpShortLogin() ? 1 : 0,
			OutAuth: oDomain.smtpAuth() ? 1 : 0,
			OutSetSender: oDomain.smtpSetSender() ? 1 : 0,
			OutUsePhpMail: oDomain.smtpPhpMail() ? 1 : 0,

			WhiteList: oDomain.whiteList()
		});
	}

	testConnectionForDomain(fCallback, oDomain) {
		this.defaultRequest(fCallback, 'AdminDomainTest', {
			Name: oDomain.name(),
			IncHost: oDomain.imapServer(),
			IncPort: oDomain.imapPort(),
			IncSecure: oDomain.imapSecure(),
			UseSieve: oDomain.useSieve() ? 1 : 0,
			SieveHost: oDomain.sieveServer(),
			SievePort: oDomain.sievePort(),
			SieveSecure: oDomain.sieveSecure(),
			OutHost: oDomain.smtpServer(),
			OutPort: oDomain.smtpPort(),
			OutSecure: oDomain.smtpSecure(),
			OutAuth: oDomain.smtpAuth() ? 1 : 0,
			OutUsePhpMail: oDomain.smtpPhpMail() ? 1 : 0
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

}

export default new RemoteAdminFetch();
