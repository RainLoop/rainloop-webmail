/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		AppSettings = require('../../Storages/AppSettings.js')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsContacts()
	{
		var
			Remote = require('../../Storages/AdminAjaxRemoteStorage.js')
		;

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
		this.enableContacts = ko.observable(!!AppSettings.settingsGet('ContactsEnable'));
		this.contactsSharing = ko.observable(!!AppSettings.settingsGet('ContactsSharing'));
		this.contactsSync = ko.observable(!!AppSettings.settingsGet('ContactsSync'));

		var
			aTypes = ['sqlite', 'mysql', 'pgsql'],
			aSupportedTypes = [],
			getTypeName = function(sName) {
				switch (sName)
				{
					case 'sqlite':
						sName = 'SQLite';
						break;
					case 'mysql':
						sName = 'MySQL';
						break;
					case 'pgsql':
						sName = 'PostgreSQL';
						break;
				}

				return sName;
			}
		;

		if (!!AppSettings.settingsGet('SQLiteIsSupported'))
		{
			aSupportedTypes.push('sqlite');
		}
		if (!!AppSettings.settingsGet('MySqlIsSupported'))
		{
			aSupportedTypes.push('mysql');
		}
		if (!!AppSettings.settingsGet('PostgreSqlIsSupported'))
		{
			aSupportedTypes.push('pgsql');
		}

		this.contactsSupported = 0 < aSupportedTypes.length;

		this.contactsTypes = ko.observableArray([]);
		this.contactsTypesOptions = this.contactsTypes.map(function (sValue) {
			var bDisabled = -1 === Utils.inArray(sValue, aSupportedTypes);
			return {
				'id': sValue,
				'name': getTypeName(sValue) + (bDisabled ? ' (not supported)' : ''),
				'disabled': bDisabled
			};
		});

		this.contactsTypes(aTypes);
		this.contactsType = ko.observable('');

		this.mainContactsType = ko.computed({
			'owner': this,
			'read': this.contactsType,
			'write': function (sValue) {
				if (sValue !== this.contactsType())
				{
					if (-1 < Utils.inArray(sValue, aSupportedTypes))
					{
						this.contactsType(sValue);
					}
					else if (0 < aSupportedTypes.length)
					{
						this.contactsType('');
					}
				}
				else
				{
					this.contactsType.valueHasMutated();
				}
			}
		});

		this.contactsType.subscribe(function () {
			this.testContactsSuccess(false);
			this.testContactsError(false);
			this.testContactsErrorMessage('');
		}, this);

		this.pdoDsn = ko.observable(AppSettings.settingsGet('ContactsPdoDsn'));
		this.pdoUser = ko.observable(AppSettings.settingsGet('ContactsPdoUser'));
		this.pdoPassword = ko.observable(AppSettings.settingsGet('ContactsPdoPassword'));

		this.pdoDsnTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.pdoUserTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.pdoPasswordTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.contactsTypeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.testing = ko.observable(false);
		this.testContactsSuccess = ko.observable(false);
		this.testContactsError = ko.observable(false);
		this.testContactsErrorMessage = ko.observable('');

		this.testContactsCommand = Utils.createCommand(this, function () {

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

		}, function () {
			return '' !== this.pdoDsn() && '' !== this.pdoUser();
		});

		this.contactsType(AppSettings.settingsGet('ContactsPdoType'));

		this.onTestContactsResponse = _.bind(this.onTestContactsResponse, this);
	}

	AdminSettingsContacts.prototype.onTestContactsResponse = function (sResult, oData)
	{
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.Result)
		{
			this.testContactsSuccess(true);
		}
		else
		{
			this.testContactsError(true);
			if (oData && oData.Result)
			{
				this.testContactsErrorMessage(oData.Result.Message || '');
			}
			else
			{
				this.testContactsErrorMessage('');
			}
		}

		this.testing(false);
	};

	AdminSettingsContacts.prototype.onShow = function ()
	{
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
	};

	AdminSettingsContacts.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('../../Storages/AdminAjaxRemoteStorage.js')
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.pdoDsnTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.pdoUserTrigger, self),
				f4 = Utils.settingsSaveHelperSimpleFunction(self.pdoPasswordTrigger, self),
				f5 = Utils.settingsSaveHelperSimpleFunction(self.contactsTypeTrigger, self)
			;

			self.enableContacts.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'ContactsEnable': bValue ? '1' : '0'
				});
			});

			self.contactsSharing.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'ContactsSharing': bValue ? '1' : '0'
				});
			});

			self.contactsSync.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'ContactsSync': bValue ? '1' : '0'
				});
			});

			self.contactsType.subscribe(function (sValue) {
				Remote.saveAdminConfig(f5, {
					'ContactsPdoType': sValue
				});
			});

			self.pdoDsn.subscribe(function (sValue) {
				Remote.saveAdminConfig(f1, {
					'ContactsPdoDsn': Utils.trim(sValue)
				});
			});

			self.pdoUser.subscribe(function (sValue) {
				Remote.saveAdminConfig(f3, {
					'ContactsPdoUser': Utils.trim(sValue)
				});
			});

			self.pdoPassword.subscribe(function (sValue) {
				Remote.saveAdminConfig(f4, {
					'ContactsPdoPassword': Utils.trim(sValue)
				});
			});

			self.contactsType(AppSettings.settingsGet('ContactsPdoType'));

		}, 50);
	};

	module.exports = AdminSettingsContacts;

}(module, require));