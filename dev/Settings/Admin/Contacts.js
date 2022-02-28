import ko from 'ko';

import { SettingsGet } from 'Common/Globals';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { addObservablesTo, addSubscribablesTo } from 'External/ko';

import Remote from 'Remote/Admin/Fetch';
import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class ContactsAdminSettings extends AbstractViewSettings {
	constructor() {
		super();
		this.defaultOptionsAfterRender = defaultOptionsAfterRender;

		this.addSetting('ContactsPdoDsn');
		this.addSetting('ContactsPdoUser');
		this.addSetting('ContactsPdoPassword');
		this.addSetting('ContactsPdoType', () => {
			this.testContactsSuccess(false);
			this.testContactsError(false);
			this.testContactsErrorMessage('');
		});

		addObservablesTo(this, {
			enableContacts: !!SettingsGet('ContactsEnable'),
			contactsSync: !!SettingsGet('ContactsSync'),

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
				read: this.contactsPdoType,
				write: value => {
					if (value !== this.contactsPdoType()) {
						if (supportedTypes.includes(value)) {
							this.contactsPdoType(value);
						} else if (types.length) {
							this.contactsPdoType('');
						}
					} else {
						this.contactsPdoType.valueHasMutated();
					}
				}
			})
			.extend({ notify: 'always' });

		addSubscribablesTo(this, {
			enableContacts: value =>
				Remote.saveConfig({
					ContactsEnable: value ? 1 : 0
				}),

			contactsSync: value =>
				Remote.saveConfig({
					ContactsSync: value ? 1 : 0
				})
		})

		decorateKoCommands(this, {
			testContactsCommand: self => self.contactsPdoDsn() && self.contactsPdoUser()
		});
	}

	testContactsCommand() {
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
		this.testing(true);

		Remote.request('AdminContactsTest',
			(iError, data) => {
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
				ContactsPdoType: this.contactsPdoType(),
				ContactsPdoDsn: this.contactsPdoDsn(),
				ContactsPdoUser: this.contactsPdo(),
				ContactsPdoPassword: this.contactsPdoPassword()
			}
		);
	}

	onShow() {
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
	}
}
