
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Selector = require('Common/Selector'),
		Links = require('Common/Links'),
		Translator = require('Common/Translator'),

		SettingsStore = require('Stores/User/Settings'),
		ContactStore = require('Stores/User/Contact'),

		Settings = require('Storage/Settings'),

		Remote = require('Remote/User/Ajax'),

		EmailModel = require('Model/Email'),
		ContactModel = require('Model/Contact'),
		ContactPropertyModel = require('Model/ContactProperty'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function ContactsPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsContacts');

		var
			self = this,
			fFastClearEmptyListHelper = function (aList) {
				if (aList && 0 < aList.length) {
					self.viewProperties.removeAll(aList);
					Utils.delegateRunOnDestroy(aList);
				}
			}
		;

		this.bBackToCompose = false;
		this.sLastComposeFocusedField = '';

		this.allowContactsSync = ContactStore.allowContactsSync;
		this.enableContactsSync = ContactStore.enableContactsSync;
		this.allowExport = !Globals.bMobileDevice;

		this.search = ko.observable('');
		this.contactsCount = ko.observable(0);
		this.contacts = ContactStore.contacts;

		this.currentContact = ko.observable(null);

		this.importUploaderButton = ko.observable(null);

		this.contactsPage = ko.observable(1);
		this.contactsPageCount = ko.computed(function () {
			var iPage = window.Math.ceil(this.contactsCount() / Consts.Defaults.ContactsPerPage);
			return 0 >= iPage ? 1 : iPage;
		}, this);

		this.contactsPagenator = ko.computed(Utils.computedPagenatorHelper(this.contactsPage, this.contactsPageCount));

		this.emptySelection = ko.observable(true);
		this.viewClearSearch = ko.observable(false);

		this.viewID = ko.observable('');
		this.viewReadOnly = ko.observable(false);
		this.viewProperties = ko.observableArray([]);

		this.viewSaveTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.viewPropertiesNames = this.viewProperties.filter(function(oProperty) {
			return -1 < Utils.inArray(oProperty.type(), [
				Enums.ContactPropertyType.FirstName, Enums.ContactPropertyType.LastName
			]);
		});

		this.viewPropertiesOther = this.viewProperties.filter(function(oProperty) {
			return -1 < Utils.inArray(oProperty.type(), [
				Enums.ContactPropertyType.Note
			]);
		});

		this.viewPropertiesOther = ko.computed(function () {

			var aList = _.filter(this.viewProperties(), function (oProperty) {
				return -1 < Utils.inArray(oProperty.type(), [
					Enums.ContactPropertyType.Nick
				]);
			});

			return _.sortBy(aList, function (oProperty) {
				return oProperty.type();
			});

		}, this);

		this.viewPropertiesEmails = this.viewProperties.filter(function(oProperty) {
			return Enums.ContactPropertyType.Email === oProperty.type();
		});

		this.viewPropertiesWeb = this.viewProperties.filter(function(oProperty) {
			return Enums.ContactPropertyType.Web === oProperty.type();
		});

		this.viewHasNonEmptyRequaredProperties = ko.computed(function() {

			var
				aNames = this.viewPropertiesNames(),
				aEmail = this.viewPropertiesEmails(),
				fHelper = function (oProperty) {
					return '' !== Utils.trim(oProperty.value());
				}
			;

			return !!(_.find(aNames, fHelper) || _.find(aEmail, fHelper));
		}, this);

		this.viewPropertiesPhones = this.viewProperties.filter(function(oProperty) {
			return Enums.ContactPropertyType.Phone === oProperty.type();
		});

		this.viewPropertiesEmailsNonEmpty = this.viewPropertiesNames.filter(function(oProperty) {
			return '' !== Utils.trim(oProperty.value());
		});

		this.viewPropertiesEmailsEmptyAndOnFocused = this.viewPropertiesEmails.filter(function(oProperty) {
			var bF = oProperty.focused();
			return '' === Utils.trim(oProperty.value()) && !bF;
		});

		this.viewPropertiesPhonesEmptyAndOnFocused = this.viewPropertiesPhones.filter(function(oProperty) {
			var bF = oProperty.focused();
			return '' === Utils.trim(oProperty.value()) && !bF;
		});

		this.viewPropertiesWebEmptyAndOnFocused = this.viewPropertiesWeb.filter(function(oProperty) {
			var bF = oProperty.focused();
			return '' === Utils.trim(oProperty.value()) && !bF;
		});

		this.viewPropertiesOtherEmptyAndOnFocused = ko.computed(function () {
			return _.filter(this.viewPropertiesOther(), function (oProperty) {
				var bF = oProperty.focused();
				return '' === Utils.trim(oProperty.value()) && !bF;
			});
		}, this);

		this.viewPropertiesEmailsEmptyAndOnFocused.subscribe(function(aList) {
			fFastClearEmptyListHelper(aList);
		});

		this.viewPropertiesPhonesEmptyAndOnFocused.subscribe(function(aList) {
			fFastClearEmptyListHelper(aList);
		});

		this.viewPropertiesWebEmptyAndOnFocused.subscribe(function(aList) {
			fFastClearEmptyListHelper(aList);
		});

		this.viewPropertiesOtherEmptyAndOnFocused.subscribe(function(aList) {
			fFastClearEmptyListHelper(aList);
		});

		this.viewSaving = ko.observable(false);

		this.useCheckboxesInList = SettingsStore.useCheckboxesInList;

		this.search.subscribe(function () {
			this.reloadContactList();
		}, this);

		this.contacts.subscribe(Utils.windowResizeCallback);
		this.viewProperties.subscribe(Utils.windowResizeCallback);

		this.contactsChecked = ko.computed(function () {
			return _.filter(this.contacts(), function (oItem) {
				return oItem.checked();
			});
		}, this);

		this.contactsCheckedOrSelected = ko.computed(function () {

			var
				aChecked = this.contactsChecked(),
				oSelected = this.currentContact()
			;

			return _.union(aChecked, oSelected ? [oSelected] : []);

		}, this);

		this.contactsCheckedOrSelectedUids = ko.computed(function () {
			return _.map(this.contactsCheckedOrSelected(), function (oContact) {
				return oContact.idContact;
			});
		}, this);

		this.selector = new Selector(this.contacts, this.currentContact, null,
			'.e-contact-item .actionHandle', '.e-contact-item.selected', '.e-contact-item .checkboxItem',
				'.e-contact-item.focused');

		this.selector.on('onItemSelect', _.bind(function (oContact) {
			this.populateViewContact(oContact ? oContact : null);
			if (!oContact)
			{
				this.emptySelection(true);
			}
		}, this));

		this.selector.on('onItemGetUid', function (oContact) {
			return oContact ? oContact.generateUid() : '';
		});

		this.newCommand = Utils.createCommand(this, function () {
			this.populateViewContact(null);
			this.currentContact(null);
		});

		this.deleteCommand = Utils.createCommand(this, function () {
			this.deleteSelectedContacts();
			this.emptySelection(true);
		}, function () {
			return 0 < this.contactsCheckedOrSelected().length;
		});

		this.newMessageCommand = Utils.createCommand(this, function () {

			if (!Settings.capa(Enums.Capa.Composer))
			{
				return false;
			}

			var
				aE = [],
				aC = this.contactsCheckedOrSelected(),
				aToEmails = null,
				aCcEmails = null,
				aBccEmails = null
			;

			if (Utils.isNonEmptyArray(aC))
			{
				aE = _.map(aC, function (oItem) {
					if (oItem)
					{
						var
							aData = oItem.getNameAndEmailHelper(),
							oEmail = aData ? new EmailModel(aData[0], aData[1]) : null
						;

						if (oEmail && oEmail.validate())
						{
							return oEmail;
						}
					}

					return null;
				});

				aE = _.compact(aE);
			}

			if (Utils.isNonEmptyArray(aE))
			{
				self.bBackToCompose = false;

				kn.hideScreenPopup(require('View/Popup/Contacts'));

				switch (self.sLastComposeFocusedField)
				{
					default:
					case 'to':
						aToEmails = aE;
						break;
					case 'cc':
						aCcEmails = aE;
						break;
					case 'bcc':
						aBccEmails = aE;
						break;
				}

				self.sLastComposeFocusedField = '';

				_.delay(function () {
					kn.showScreenPopup(require('View/Popup/Compose'),
						[Enums.ComposeType.Empty, null, aToEmails, aCcEmails, aBccEmails]);
				}, 200);
			}

		}, function () {
			return 0 < this.contactsCheckedOrSelected().length;
		});

		this.clearCommand = Utils.createCommand(this, function () {
			this.search('');
		});

		this.saveCommand = Utils.createCommand(this, function () {

			this.viewSaving(true);
			this.viewSaveTrigger(Enums.SaveSettingsStep.Animate);

			var
				sRequestUid = Utils.fakeMd5(),
				aProperties = []
			;

			_.each(this.viewProperties(), function (oItem) {
				if (oItem.type() && '' !== Utils.trim(oItem.value()))
				{
					aProperties.push([oItem.type(), oItem.value(), oItem.typeStr()]);
				}
			});

			Remote.contactSave(function (sResult, oData) {

				var bRes = false;
				self.viewSaving(false);

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
					oData.Result.RequestUid === sRequestUid && 0 < Utils.pInt(oData.Result.ResultID))
				{
					if ('' === self.viewID())
					{
						self.viewID(Utils.pInt(oData.Result.ResultID));
					}

					self.reloadContactList();
					bRes = true;
				}

				_.delay(function () {
					self.viewSaveTrigger(bRes ? Enums.SaveSettingsStep.TrueResult : Enums.SaveSettingsStep.FalseResult);
				}, 300);

				if (bRes)
				{
					self.watchDirty(false);

					_.delay(function () {
						self.viewSaveTrigger(Enums.SaveSettingsStep.Idle);
					}, 1000);
				}

			}, sRequestUid, this.viewID(), aProperties);

		}, function () {
			var
				bV = this.viewHasNonEmptyRequaredProperties(),
				bReadOnly = this.viewReadOnly()
			;
			return !this.viewSaving() && bV && !bReadOnly;
		});

		this.syncCommand = Utils.createCommand(this, function () {

			var self = this;
			require('App/User').contactsSync(function (sResult, oData) {
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					window.alert(Translator.getNotification(
						oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.ContactsSyncError));
				}

				self.reloadContactList(true);
			});

		}, function () {
			return !this.contacts.syncing() && !this.contacts.importing();
		});

		this.bDropPageAfterDelete = false;

		this.watchDirty = ko.observable(false);
		this.watchHash = ko.observable(false);

		this.viewHash = ko.computed(function () {
			return '' + _.map(self.viewProperties(), function (oItem) {
				return oItem.value();
			}).join('');
		});

	//	this.saveCommandDebounce = _.debounce(_.bind(this.saveCommand, this), 1000);

		this.viewHash.subscribe(function () {
			if (this.watchHash() && !this.viewReadOnly() && !this.watchDirty())
			{
				this.watchDirty(true);
			}
		}, this);

		this.sDefaultKeyScope = Enums.KeyState.ContactList;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Contacts', 'PopupsContactsViewModel'], ContactsPopupView);
	_.extend(ContactsPopupView.prototype, AbstractView.prototype);

	ContactsPopupView.prototype.getPropertyPlaceholder = function (sType)
	{
		var sResult = '';
		switch (sType)
		{
			case Enums.ContactPropertyType.LastName:
				sResult = 'CONTACTS/PLACEHOLDER_ENTER_LAST_NAME';
				break;
			case Enums.ContactPropertyType.FirstName:
				sResult = 'CONTACTS/PLACEHOLDER_ENTER_FIRST_NAME';
				break;
			case Enums.ContactPropertyType.Nick:
				sResult = 'CONTACTS/PLACEHOLDER_ENTER_NICK_NAME';
				break;
		}

		return sResult;
	};

	ContactsPopupView.prototype.addNewProperty = function (sType, sTypeStr)
	{
		this.viewProperties.push(new ContactPropertyModel(sType, sTypeStr || '', '', true, this.getPropertyPlaceholder(sType)));
	};

	ContactsPopupView.prototype.addNewOrFocusProperty = function (sType, sTypeStr)
	{
		var oItem = _.find(this.viewProperties(), function (oItem) {
			return sType === oItem.type();
		});

		if (oItem)
		{
			oItem.focused(true);
		}
		else
		{
			this.addNewProperty(sType, sTypeStr);
		}
	};

	ContactsPopupView.prototype.addNewEmail = function ()
	{
		this.addNewProperty(Enums.ContactPropertyType.Email, 'Home');
	};

	ContactsPopupView.prototype.addNewPhone = function ()
	{
		this.addNewProperty(Enums.ContactPropertyType.Phone, 'Mobile');
	};

	ContactsPopupView.prototype.addNewWeb = function ()
	{
		this.addNewProperty(Enums.ContactPropertyType.Web);
	};

	ContactsPopupView.prototype.addNewNickname = function ()
	{
		this.addNewOrFocusProperty(Enums.ContactPropertyType.Nick);
	};

	ContactsPopupView.prototype.addNewNotes = function ()
	{
		this.addNewOrFocusProperty(Enums.ContactPropertyType.Note);
	};

	ContactsPopupView.prototype.addNewBirthday = function ()
	{
		this.addNewOrFocusProperty(Enums.ContactPropertyType.Birthday);
	};

	ContactsPopupView.prototype.exportVcf = function ()
	{
		require('App/User').download(Links.exportContactsVcf());
	};

	ContactsPopupView.prototype.exportCsv = function ()
	{
		require('App/User').download(Links.exportContactsCsv());
	};

	ContactsPopupView.prototype.initUploader = function ()
	{
		if (this.importUploaderButton())
		{
			var
				oJua = new Jua({
					'action': Links.uploadContacts(),
					'name': 'uploader',
					'queueSize': 1,
					'multipleSizeLimit': 1,
					'disableDragAndDrop': true,
					'disableMultiple': true,
					'disableDocumentDropPrevent': true,
					'clickElement': this.importUploaderButton()
				})
			;

			if (oJua)
			{
				oJua
					.on('onStart', _.bind(function () {
						this.contacts.importing(true);
					}, this))
					.on('onComplete', _.bind(function (sId, bResult, oData) {

						this.contacts.importing(false);
						this.reloadContactList();

						if (!sId || !bResult || !oData || !oData.Result)
						{
							window.alert(Translator.i18n('CONTACTS/ERROR_IMPORT_FILE'));
						}

					}, this))
				;
			}
		}
	};

	ContactsPopupView.prototype.removeCheckedOrSelectedContactsFromList = function ()
	{
		var
			self = this,
			oKoContacts = this.contacts,
			oCurrentContact = this.currentContact(),
			iCount = this.contacts().length,
			aContacts = this.contactsCheckedOrSelected()
		;

		if (0 < aContacts.length)
		{
			_.each(aContacts, function (oContact) {

				if (oCurrentContact && oCurrentContact.idContact === oContact.idContact)
				{
					oCurrentContact = null;
					self.currentContact(null);
				}

				oContact.deleted(true);
				iCount--;
			});

			if (iCount <= 0)
			{
				this.bDropPageAfterDelete = true;
			}

			_.delay(function () {

				_.each(aContacts, function (oContact) {
					oKoContacts.remove(oContact);
					Utils.delegateRunOnDestroy(oContact);
				});

			}, 500);
		}
	};

	ContactsPopupView.prototype.deleteSelectedContacts = function ()
	{
		if (0 < this.contactsCheckedOrSelected().length)
		{
			Remote.contactsDelete(
				_.bind(this.deleteResponse, this),
				this.contactsCheckedOrSelectedUids()
			);

			this.removeCheckedOrSelectedContactsFromList();
		}
	};

	/**
	 * @param {string} sResult
	 * @param {AjaxJsonDefaultResponse} oData
	 */
	ContactsPopupView.prototype.deleteResponse = function (sResult, oData)
	{
		if (500 < (Enums.StorageResultType.Success === sResult && oData && oData.Time ? Utils.pInt(oData.Time) : 0))
		{
			this.reloadContactList(this.bDropPageAfterDelete);
		}
		else
		{
			_.delay((function (self) {
				return function () {
					self.reloadContactList(self.bDropPageAfterDelete);
				};
			}(this)), 500);
		}
	};

	ContactsPopupView.prototype.removeProperty = function (oProp)
	{
		this.viewProperties.remove(oProp);
		Utils.delegateRunOnDestroy(oProp);
	};

	/**
	 * @param {?ContactModel} oContact
	 */
	ContactsPopupView.prototype.populateViewContact = function (oContact)
	{
		var
			sId = '',
			sLastName = '',
			sFirstName = '',
			aList = []
		;

		this.watchHash(false);

		this.emptySelection(false);
		this.viewReadOnly(false);

		if (oContact)
		{
			sId = oContact.idContact;
			if (Utils.isNonEmptyArray(oContact.properties))
			{
				_.each(oContact.properties, function (aProperty) {
					if (aProperty && aProperty[0])
					{
						if (Enums.ContactPropertyType.LastName === aProperty[0])
						{
							sLastName = aProperty[1];
						}
						else if (Enums.ContactPropertyType.FirstName === aProperty[0])
						{
							sFirstName = aProperty[1];
						}
						else
						{
							aList.push(new ContactPropertyModel(aProperty[0], aProperty[2] || '', aProperty[1]));
						}
					}
				});
			}

			this.viewReadOnly(!!oContact.readOnly);
		}

		aList.unshift(new ContactPropertyModel(Enums.ContactPropertyType.LastName, '', sLastName, false,
			this.getPropertyPlaceholder(Enums.ContactPropertyType.LastName)));

		aList.unshift(new ContactPropertyModel(Enums.ContactPropertyType.FirstName, '', sFirstName, !oContact,
			this.getPropertyPlaceholder(Enums.ContactPropertyType.FirstName)));

		this.viewID(sId);

		Utils.delegateRunOnDestroy(this.viewProperties());

		this.viewProperties([]);
		this.viewProperties(aList);

		this.watchDirty(false);
		this.watchHash(true);
	};

	/**
	 * @param {boolean=} bDropPagePosition = false
	 */
	ContactsPopupView.prototype.reloadContactList = function (bDropPagePosition)
	{
		var
			self = this,
			iOffset = (this.contactsPage() - 1) * Consts.Defaults.ContactsPerPage
		;

		this.bDropPageAfterDelete = false;

		if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
		{
			this.contactsPage(1);
			iOffset = 0;
		}

		this.contacts.loading(true);
		Remote.contacts(function (sResult, oData) {

			var
				iCount = 0,
				aList = []
			;

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.List)
			{
				if (Utils.isNonEmptyArray(oData.Result.List))
				{
					aList = _.map(oData.Result.List, function (oItem) {
						var oContact = new ContactModel();
						return oContact.parse(oItem) ? oContact : null;
					});

					aList = _.compact(aList);

					iCount = Utils.pInt(oData.Result.Count);
					iCount = 0 < iCount ? iCount : 0;
				}
			}

			self.contactsCount(iCount);

			Utils.delegateRunOnDestroy(self.contacts());
			self.contacts(aList);

			self.contacts.loading(false);
			self.viewClearSearch('' !== self.search());

		}, iOffset, Consts.Defaults.ContactsPerPage, this.search());
	};

	ContactsPopupView.prototype.onBuild = function (oDom)
	{
		this.oContentVisible = $('.b-list-content', oDom);
		this.oContentScrollable = $('.content', this.oContentVisible);

		this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.ContactList);

		var self = this;

		key('delete', Enums.KeyState.ContactList, function () {
			self.deleteCommand();
			return false;
		});

		key('c, w', Enums.KeyState.ContactList, function () {
			self.newMessageCommand();
			return false;
		});

		oDom
			.on('click', '.e-pagenator .e-page', function () {
				var oPage = ko.dataFor(this);
				if (oPage)
				{
					self.contactsPage(Utils.pInt(oPage.value));
					self.reloadContactList();
				}
			})
		;

		this.initUploader();
	};

	ContactsPopupView.prototype.onShow = function (bBackToCompose, sLastComposeFocusedField)
	{
		this.bBackToCompose = Utils.isUnd(bBackToCompose) ? false : !!bBackToCompose;
		this.sLastComposeFocusedField = Utils.isUnd(sLastComposeFocusedField) ? '' : sLastComposeFocusedField;

		kn.routeOff();
		this.reloadContactList(true);
	};

	ContactsPopupView.prototype.onHide = function ()
	{
		kn.routeOn();

		this.currentContact(null);
		this.emptySelection(true);
		this.search('');
		this.contactsCount(0);

		Utils.delegateRunOnDestroy(this.contacts());
		this.contacts([]);

		this.sLastComposeFocusedField = '';

		if (this.bBackToCompose)
		{
			this.bBackToCompose = false;

			if (Settings.capa(Enums.Capa.Composer))
			{
				kn.showScreenPopup(require('View/Popup/Compose'));
			}
		}
	};

	module.exports = ContactsPopupView;

}());