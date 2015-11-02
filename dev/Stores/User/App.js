
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),

		Settings = require('Storage/Settings'),

		AppStore = require('Stores/App')
	;

	/**
	 * @constructor
	 */
	function AppUserStore()
	{
		AppStore.call(this);

		this.currentAudio = ko.observable('');

		this.focusedState = ko.observable(Enums.Focused.None);

		this.focusedState.subscribe(function (mValue) {

			switch (mValue)
			{
				case Enums.Focused.MessageList:
					Globals.keyScope(Enums.KeyState.MessageList);
					break;
				case Enums.Focused.MessageView:
					Globals.keyScope(Enums.KeyState.MessageView);
					break;
				case Enums.Focused.FolderList:
					Globals.keyScope(Enums.KeyState.FolderList);
					break;
			}

		}, this);

		this.projectHash = ko.observable('');
		this.threadsAllowed = ko.observable(false);

		this.composeInEdit = ko.observable(false);

		this.contactsAutosave = ko.observable(false);
		this.useLocalProxyForExternalImages = ko.observable(false);

		this.contactsIsAllowed = ko.observable(false);

		this.attachmentsActions = ko.observableArray([]);

		this.devEmail = '';
		this.devPassword = '';
	}

	AppUserStore.prototype.populate = function()
	{
		AppStore.prototype.populate.call(this);

		this.projectHash(Settings.settingsGet('ProjectHash'));

		this.contactsAutosave(!!Settings.settingsGet('ContactsAutosave'));
		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));

		this.contactsIsAllowed(!!Settings.settingsGet('ContactsIsAllowed'));

		var mAttachmentsActions = Settings.settingsGet('AttachmentsActions');
		this.attachmentsActions(Utils.isNonEmptyArray(mAttachmentsActions) ? mAttachmentsActions : []);

		this.devEmail = Settings.settingsGet('DevEmail');
		this.devPassword = Settings.settingsGet('DevPassword');
	};

	module.exports = new AppUserStore();

}());
