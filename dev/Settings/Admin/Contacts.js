import _ from '_';
import ko from 'ko';

import { settingsSaveHelperSimpleFunction, defautOptionsAfterRender, inArray, trim, boolToAjax } from 'Common/Utils';

import { SaveSettingsStep, StorageResultType, Magics } from 'Common/Enums';
import { i18n } from 'Common/Translator';
import { settingsGet } from 'Storage/Settings';
import Remote from 'Remote/Admin/Ajax';
import { command } from 'Knoin/Knoin';

class ContactsAdminSettings {
	constructor() {
		this.defautOptionsAfterRender = defautOptionsAfterRender;
		this.enableContacts = ko.observable(!!settingsGet('ContactsEnable'));
		this.contactsSync = ko.observable(!!settingsGet('ContactsSync'));

		const supportedTypes = [],
			types = ['sqlite', 'mysql', 'pgsql'],
			getTypeName = (name) => {
				switch (name) {
					case 'sqlite':
						name = 'SQLite';
						break;
					case 'mysql':
						name = 'MySQL';
						break;
					case 'pgsql':
						name = 'PostgreSQL';
						break;
					// no default
				}

				return name;
			};

		if (settingsGet('SQLiteIsSupported')) {
			supportedTypes.push('sqlite');
		}
		if (settingsGet('MySqlIsSupported')) {
			supportedTypes.push('mysql');
		}
		if (settingsGet('PostgreSqlIsSupported')) {
			supportedTypes.push('pgsql');
		}

		this.contactsSupported = 0 < supportedTypes.length;

		this.contactsTypes = ko.observableArray([]);
		this.contactsTypesOptions = ko.computed(() =>
			_.map(this.contactsTypes(), (value) => {
				const disabled = -1 === inArray(value, supportedTypes);
				return {
					'id': value,
					'name': getTypeName(value) + (disabled ? ' (' + i18n('HINTS/NOT_SUPPORTED') + ')' : ''),
					'disabled': disabled
				};
			})
		);

		this.contactsTypes(types);
		this.contactsType = ko.observable('');

		this.mainContactsType = ko
			.computed({
				read: this.contactsType,
				write: (value) => {
					if (value !== this.contactsType()) {
						if (-1 < inArray(value, supportedTypes)) {
							this.contactsType(value);
						} else if (0 < supportedTypes.length) {
							this.contactsType('');
						}
					} else {
						this.contactsType.valueHasMutated();
					}
				}
			})
			.extend({ notify: 'always' });

		this.contactsType.subscribe(() => {
			this.testContactsSuccess(false);
			this.testContactsError(false);
			this.testContactsErrorMessage('');
		});

		this.pdoDsn = ko.observable(settingsGet('ContactsPdoDsn'));
		this.pdoUser = ko.observable(settingsGet('ContactsPdoUser'));
		this.pdoPassword = ko.observable(settingsGet('ContactsPdoPassword'));

		this.pdoDsnTrigger = ko.observable(SaveSettingsStep.Idle);
		this.pdoUserTrigger = ko.observable(SaveSettingsStep.Idle);
		this.pdoPasswordTrigger = ko.observable(SaveSettingsStep.Idle);
		this.contactsTypeTrigger = ko.observable(SaveSettingsStep.Idle);

		this.testing = ko.observable(false);
		this.testContactsSuccess = ko.observable(false);
		this.testContactsError = ko.observable(false);
		this.testContactsErrorMessage = ko.observable('');

		this.contactsType(settingsGet('ContactsPdoType'));

		this.onTestContactsResponse = _.bind(this.onTestContactsResponse, this);
	}

	@command((self) => '' !== self.pdoDsn() && '' !== self.pdoUser())
	testContactsCommand() {
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
		this.testing(true);

		Remote.testContacts(this.onTestContactsResponse, {
			'ContactsPdoType': this.contactsType(),
			'ContactsPdoDsn': this.pdoDsn(),
			'ContactsPdoUser': this.pdoUser(),
			'ContactsPdoPassword': this.pdoPassword()
		});
	}

	onTestContactsResponse(result, data) {
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');

		if (StorageResultType.Success === result && data && data.Result && data.Result.Result) {
			this.testContactsSuccess(true);
		} else {
			this.testContactsError(true);
			if (data && data.Result) {
				this.testContactsErrorMessage(data.Result.Message || '');
			} else {
				this.testContactsErrorMessage('');
			}
		}

		this.testing(false);
	}

	onShow() {
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
	}

	onBuild() {
		_.delay(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.pdoDsnTrigger, this),
				f3 = settingsSaveHelperSimpleFunction(this.pdoUserTrigger, this),
				f4 = settingsSaveHelperSimpleFunction(this.pdoPasswordTrigger, this),
				f5 = settingsSaveHelperSimpleFunction(this.contactsTypeTrigger, this);

			this.enableContacts.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'ContactsEnable': boolToAjax(value)
				});
			});

			this.contactsSync.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'ContactsSync': boolToAjax(value)
				});
			});

			this.contactsType.subscribe((value) => {
				Remote.saveAdminConfig(f5, {
					'ContactsPdoType': trim(value)
				});
			});

			this.pdoDsn.subscribe((value) => {
				Remote.saveAdminConfig(f1, {
					'ContactsPdoDsn': trim(value)
				});
			});

			this.pdoUser.subscribe((value) => {
				Remote.saveAdminConfig(f3, {
					'ContactsPdoUser': trim(value)
				});
			});

			this.pdoPassword.subscribe((value) => {
				Remote.saveAdminConfig(f4, {
					'ContactsPdoPassword': trim(value)
				});
			});

			this.contactsType(settingsGet('ContactsPdoType'));
		}, Magics.Time50ms);
	}
}

export { ContactsAdminSettings, ContactsAdminSettings as default };
