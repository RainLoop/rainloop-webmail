import { addObservablesTo, addComputablesTo, addSubscribablesTo } from 'External/ko';

import { pInt, forEachObjectEntry } from 'Common/Utils';
import { i18n, getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { DomainAdminStore } from 'Stores/Admin/Domain';

import { AskPopupView } from 'View/Popup/Ask';

const
	capitalize = string => string.charAt(0).toUpperCase() + string.slice(1),
	domainDefaults = {
		enableSmartPorts: false,

		savingError: '',

		name: '',

		imapHost: '',
		imapPort: 143,
		imapType: 0,
		imapTimeout: 300,
		imapShortLogin: false,
		// SSL
		imapSslVerify_peer: false,
		imapSslAllow_self_signed: false,
		// Options
		imapExpunge_all_on_delete: false,
		imapFast_simple_search: true,
		imapFetch_new_messages: true,
		imapForce_select: false,
		imapFolder_list_limit: 200,
		imapMessage_all_headers: false,
		imapMessage_list_limit: 10000,
		imapSearch_filter: '',

		sieveEnabled: false,
		sieveHost: '',
		sievePort: 4190,
		sieveType: 0,
		sieveTimeout: 10,

		smtpHost: '',
		smtpPort: 25,
		smtpType: 0,
		smtpTimeout: 60,
		smtpShortLogin: false,
		smtpUseAuth: true,
		smtpSetSender: false,
		smtpAuthPlainLine: false,
		smtpUsePhpMail: false,
		// SSL
		smtpSslVerify_peer: false,
		smtpSslAllow_self_signed: false,

		whiteList: '',
		aliasName: ''
	},
	domainToParams = oDomain => ({
		name: oDomain.name,
		IMAP: {
			host: oDomain.imapHost,
			port: oDomain.imapPort,
			secure: pInt(oDomain.imapType()),
			timeout: oDomain.imapTimeout,
			shortLogin: !!oDomain.imapShortLogin(),
			ssl: {
				verify_peer: !!oDomain.imapSslVerify_peer(),
				verify_peer_name: !!oDomain.imapSslVerify_peer(),
				allow_self_signed: !!oDomain.imapSslAllow_self_signed()
			},
			disabled_capabilities:  oDomain.imapDisabled_capabilities(),
			folder_list_limit: pInt(oDomain.imapFolder_list_limit()),
			message_list_limit: pInt(oDomain.imapMessage_list_limit())
/*
			expunge_all_on_delete: ,
			fast_simple_search: ,
			fetch_new_messages: ,
			force_select: ,
			message_all_headers: ,
			search_filter:
*/
		},
		SMTP: {
			host: oDomain.smtpHost,
			port: oDomain.smtpPort,
			secure: pInt(oDomain.smtpType()),
			timeout: oDomain.smtpTimeout,
			shortLogin: !!oDomain.smtpShortLogin(),
			ssl: {
				verify_peer: !!oDomain.smtpSslVerify_peer(),
				verify_peer_name: !!oDomain.smtpSslVerify_peer(),
				allow_self_signed: !!oDomain.smtpSslAllow_self_signed()
			},
			setSender: !!oDomain.smtpSetSender(),
			authPlainLine: !!oDomain.smtpAuthPlainLine(),
			useAuth: !!oDomain.smtpUseAuth(),
			usePhpMail: !!oDomain.smtpUsePhpMail()
		},
		Sieve: {
			enabled: !!oDomain.sieveEnabled(),
			host: oDomain.sieveHost,
			port: oDomain.sievePort,
			secure: pInt(oDomain.sieveType()),
			timeout: oDomain.sieveTimeout,
			shortLogin: !!oDomain.imapShortLogin(),
			ssl: {
				verify_peer: !!oDomain.imapSslVerify_peer(),
				verify_peer_name: !!oDomain.imapSslVerify_peer(),
				allow_self_signed: !!oDomain.imapSslAllow_self_signed()
			}
		},
		whiteList: oDomain.whiteList
	});

export class DomainPopupView extends AbstractViewPopup {
	constructor() {
		super('Domain');

		addObservablesTo(this, domainDefaults);
		addObservablesTo(this, {
			edit: false,

			saving: false,

			testing: false,
			testingDone: false,
			testingImapError: false,
			testingSieveError: false,
			testingSmtpError: false,

			imapHostFocus: false,
			sieveHostFocus: false,
			smtpHostFocus: false,
		});
		this.imapDisabled_capabilities = ko.observableArray();
		this.imapCapabilities = ko.observableArray();

		addComputablesTo(this, {
			headerText: () => {
				const name = this.name(),
					aliasName = this.aliasName();
				return this.edit()
					? i18n('POPUPS_DOMAIN/TITLE_EDIT_DOMAIN', { NAME: name }) + (aliasName ? ' ⫘ ' + aliasName : '')
					: (name
						? i18n('POPUPS_DOMAIN/TITLE_ADD_DOMAIN_WITH_NAME', { NAME: name })
						: i18n('POPUPS_DOMAIN/TITLE_ADD_DOMAIN'));
			},

			domainDesc: () => {
				const name = this.name();
				return !this.edit() && name ? i18n('POPUPS_DOMAIN/NEW_DOMAIN_DESC', { NAME: '*@' + name }) : '';
			},

			domainIsComputed: () => {
				const usePhpMail = this.smtpUsePhpMail(),
					sieveEnabled = this.sieveEnabled();

				return (
					this.name() &&
					this.imapHost() &&
					this.imapPort() &&
					(sieveEnabled ? this.sieveHost() && this.sievePort() : true) &&
					((this.smtpHost() && this.smtpPort()) || usePhpMail)
				);
			},

			canBeTested: () => !this.testing() && this.domainIsComputed(),
			canBeSaved: () => !this.saving() && this.domainIsComputed()
		});

		addSubscribablesTo(this, {
			// smart form improvements
			imapHostFocus: value =>
				value && this.name() && !this.imapHost() && this.imapHost(this.name().replace(/[.]?[*][.]?/g, '')),

			sieveHostFocus: value =>
				value && this.imapHost() && !this.sieveHost() && this.sieveHost(this.imapHost()),

			smtpHostFocus: value => value && this.imapHost() && !this.smtpHost()
				&& this.smtpHost(this.imapHost().replace(/imap/gi, 'smtp')),

			imapType: value => {
				if (this.enableSmartPorts()) {
					const port = pInt(this.imapPort());
					switch (pInt(value)) {
						case 0:
						case 2:
							if (993 === port) {
								this.imapPort(143);
							}
							break;
						case 1:
							if (143 === port) {
								this.imapPort(993);
							}
							break;
						// no default
					}
				}
			},

			smtpType: value => {
				if (this.enableSmartPorts()) {
					const port = pInt(this.smtpPort());
					switch (pInt(value)) {
						case 0:
							if (465 === port || 587 === port) {
								this.smtpPort(25);
							}
							break;
						case 1:
							if (25 === port || 587 === port) {
								this.smtpPort(465);
							}
							break;
						case 2:
							if (25 === port || 465 === port) {
								this.smtpPort(587);
							}
							break;
						// no default
					}
				}
			}
		});

		decorateKoCommands(this, {
			createOrAddCommand: self => self.canBeSaved(),
			testConnectionCommand: self => self.canBeTested()
		});
	}

	createOrAddCommand() {
		this.saving(true);
		Remote.request('AdminDomainSave',
			iError => {
				this.saving(false);
				if (iError) {
					this.savingError(getNotification(iError));
				} else {
					DomainAdminStore.fetch();
					this.close();
				}
			},
			Object.assign(domainToParams(this), {
				create: this.edit() ? 0 : 1
			})
		);
	}

	testConnectionCommand() {
		this.clearTesting();
		// https://github.com/the-djmaze/snappymail/issues/477
		AskPopupView.credentials('IMAP', 'GLOBAL/TEST').then(credentials => {
			if (credentials) {
				this.testing(true);
				const params = domainToParams(this);
				params.auth = {
					user: credentials.username,
					pass: credentials.password
				};
				Remote.request('AdminDomainTest',
					(iError, oData) => {
						this.testing(false);
						if (iError) {
							this.testingImapError(getNotification(iError));
							this.testingSieveError(getNotification(iError));
							this.testingSmtpError(getNotification(iError));
						} else {
							const result = oData.Result;
							this.testingDone(true);
							this.testingImapError(true !== result.Imap ? result.Imap : false);
							this.testingSieveError(true !== result.Sieve ? result.Sieve : false);
							this.testingSmtpError(true !== result.Smtp ? result.Smtp : false);
							// result.ImapResult.connectCapa
							if (true === result.Imap) {
								let capa = result.ImapResult.authCapa
									|| ['LIST-STATUS','METADATA','MOVE','SORT','THREAD','BINARY','STATUS=SIZE','PREVIEW'];
								capa = capa.concat(result.ImapResult.connectCapa).unique();
								capa.sort();
								this.imapCapabilities(capa);
							}
							// result.SmtpResult.connectCapa
							// result.SmtpResult.authCapa
							// result.SieveResult.connectCapa
							// result.SieveResult.authCapa
						}
					},
					params
				);
			}
		});
	}

	clearTesting() {
		this.testing(false);
		this.testingDone(false);
		this.testingImapError(false);
		this.testingSieveError(false);
		this.testingSmtpError(false);
	}

	onShow(oDomain) {
		this.saving(false);
		this.clearTesting();
		this.edit(false);
		this.imapCapabilities([
			'LIST-STATUS',
			'METADATA',
			'MOVE',
			'SORT',
			'THREAD',
			'BINARY',
			'STATUS=SIZE',
			'PREVIEW'
		]);
		this.imapDisabled_capabilities(['PREVIEW','STATUS=SIZE']);
		forEachObjectEntry(domainDefaults, (key, value) => this[key](value));
		this.enableSmartPorts(true);
		if (oDomain) {
			this.enableSmartPorts(false);
			this.edit(true);
			forEachObjectEntry(oDomain, (key, value) => {
				if ('IMAP' === key || 'SMTP' === key || 'Sieve' === key) {
					key = key.toLowerCase();
					forEachObjectEntry(value, (skey, value) => {
						skey = capitalize(skey);
						if ('Ssl' == skey) {
							forEachObjectEntry(value, (sslkey, value) => {
								this[key + skey + capitalize(sslkey)]?.(value);
							});
						} else {
							this[key + skey]?.(value);
						}
					});
				} else {
					this[key]?.(value);
				}
			});
			this.enableSmartPorts(true);
		}
	}
}
