import { AbstractFetchRemote } from 'Remote/AbstractFetch';

class RemoteAdminFetch extends AbstractFetchRemote {
	/**
	 * @param {?Function} fCallback
	 * @param {string} sLogin
	 * @param {string} sPassword
	 */
	adminLogin(fCallback, sLogin, sPassword, sCode) {
		this.request('AdminLogin', fCallback, {
			Login: sLogin,
			Password: sPassword,
			TOTP: sCode
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	adminLogout(fCallback) {
		this.request('AdminLogout', fCallback);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	saveAdminConfig(fCallback, oData) {
		this.request('AdminSettingsUpdate', fCallback, oData);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {boolean=} bIncludeAliases = true
	 */
	domainList(fCallback, bIncludeAliases = true) {
		this.request('AdminDomainList', fCallback, {
			IncludeAliases: bIncludeAliases ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	packagesList(fCallback) {
		this.request('AdminPackagesList', fCallback);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oPackage
	 */
	packageInstall(fCallback, oPackage) {
		this.request('AdminPackageInstall', fCallback,
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
		this.request('AdminPackageDelete', fCallback, {
			Id: oPackage.id
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	domain(fCallback, sName) {
		this.request('AdminDomainLoad', fCallback, {
			Name: sName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sId
	 */
	plugin(fCallback, sId) {
		this.request('AdminPluginLoad', fCallback, {
			Id: sId
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	domainDelete(fCallback, sName) {
		this.request('AdminDomainDelete', fCallback, {
			Name: sName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	domainDisable(fCallback, sName, bDisabled) {
		this.request('AdminDomainDisable', fCallback, {
			Name: sName,
			Disabled: bDisabled ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oConfig
	 */
	pluginSettingsUpdate(fCallback, oConfig) {
		this.request('AdminPluginSettingsUpdate', fCallback, oConfig);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sId
	 * @param {boolean} bDisabled
	 */
	pluginDisable(fCallback, sId, bDisabled) {
		this.request('AdminPluginDisable', fCallback, {
			Id: sId,
			Disabled: bDisabled ? 1 : 0
		});
	}

	createDomainAlias(fCallback, sName, sAlias) {
		this.request('AdminDomainAliasSave', fCallback, {
			Name: sName,
			Alias: sAlias
		});
	}

	createOrUpdateDomain(fCallback, oDomain) {
		this.request('AdminDomainSave', fCallback, {
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
		this.request('AdminDomainTest', fCallback, {
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
		this.request('AdminContactsTest', fCallback, oData);
	}

}

export default new RemoteAdminFetch();
