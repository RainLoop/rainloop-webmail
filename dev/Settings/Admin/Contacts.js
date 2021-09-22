import ko from 'ko';

import { SaveSettingsStep } from 'Common/Enums';
import { SettingsGet } from 'Common/Globals';
import {
	settingsSaveHelperSimpleFunction,
	defaultOptionsAfterRender,
	addObservablesTo,
	addSubscribablesTo
} from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';
import { decorateKoCommands } from 'Knoin/Knoin';

export class ContactsAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.defaultOptionsAfterRender = defaultOptionsAfterRender;

		addObservablesTo(this, {
			enableContacts: !!SettingsGet('ContactsEnable'),
			contactsSync: !!SettingsGet('ContactsSync'),
			contactsType: SettingsGet('ContactsPdoType'),

			pdoDsn: SettingsGet('ContactsPdoDsn'),
			pdoUser: SettingsGet('ContactsPdoUser'),
			pdoPassword: SettingsGet('ContactsPdoPassword'),

			pdoDsnTrigger: SaveSettingsStep.Idle,
			pdoUserTrigger: SaveSettingsStep.Idle,
			pdoPasswordTrigger: SaveSettingsStep.Idle,
			contactsTypeTrigger: SaveSettingsStep.Idle,

			testing: false,
			testContactsSuccess: false,
			testContactsError: false,
			testContactsErrorMessage: ''
		});

		const supportedTypes = SettingsGet('supportedPdoDrivers') || [],
			types = [{
				id:'sqlite',
				name:'SQLite'
			},{
				id:'mysql',
				name:'MySQL'
			},{
				id:'pgsql',
				name:'PostgreSQL'
			}].filter(type => supportedTypes.includes(type.id));

		this.contactsSupported = 0 < types.length;

		this.contactsTypesOptions = types;

		this.mainContactsType = ko
			.computed({
				read: this.contactsType,
				write: value => {
					if (value !== this.contactsType()) {
						if (supportedTypes.includes(value)) {
							this.contactsType(value);
						} else if (types.length) {
							this.contactsType('');
						}
					} else {
						this.contactsType.valueHasMutated();
					}
				}
			})
			.extend({ notify: 'always' });

		addSubscribablesTo(this, {
			enableContacts: value =>
				Remote.saveAdminConfig(null, {
					ContactsEnable: value ? 1 : 0
				}),

			contactsSync: value =>
				Remote.saveAdminConfig(null, {
					ContactsSync: value ? 1 : 0
				}),

			contactsType: value => {
				this.testContactsSuccess(false);
				this.testContactsError(false);
				this.testContactsErrorMessage('');
				Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.contactsTypeTrigger, this), {
					ContactsPdoType: value.trim()
				})
			},

			pdoDsn: value =>
				Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.pdoDsnTrigger, this), {
					ContactsPdoDsn: value.trim()
				}),

			pdoUser: value =>
				Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.pdoUserTrigger, this), {
					ContactsPdoUser: value.trim()
				}),

			pdoPassword: value =>
				Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.pdoPasswordTrigger, this), {
					ContactsPdoPassword: value.trim()
				})
		})

		decorateKoCommands(this, {
			testContactsCommand: self => self.pdoDsn() && self.pdoUser()
		});
	}

	testContactsCommand() {
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
		this.testing(true);

		Remote.testContacts((iError, data) => {
			this.testContactsSuccess(false);
			this.testContactsError(false);
			this.testContactsErrorMessage('');

			if (!iError && data.Result.Result) {
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
		}, {
			ContactsPdoType: this.contactsType(),
			ContactsPdoDsn: this.pdoDsn(),
			ContactsPdoUser: this.pdoUser(),
			ContactsPdoPassword: this.pdoPassword()
		});
	}

	onShow() {
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
	}
}
