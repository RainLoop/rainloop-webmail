/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsContactsViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsContacts');

	var
		self = this,
		aNameTypes = [Enums.ContactPropertyType.FullName, Enums.ContactPropertyType.FirstName, Enums.ContactPropertyType.SurName, Enums.ContactPropertyType.MiddleName],
		aEmailTypes = [Enums.ContactPropertyType.EmailPersonal, Enums.ContactPropertyType.EmailBussines, Enums.ContactPropertyType.EmailOther],
		aPhonesTypes = [
			Enums.ContactPropertyType.PhonePersonal, Enums.ContactPropertyType.PhoneBussines, Enums.ContactPropertyType.PhoneOther,
			Enums.ContactPropertyType.MobilePersonal, Enums.ContactPropertyType.MobileBussines, Enums.ContactPropertyType.MobileOther,
			Enums.ContactPropertyType.FaxPesonal, Enums.ContactPropertyType.FaxBussines, Enums.ContactPropertyType.FaxOther
		],
		fFastClearEmptyListHelper = function (aList) {
			if (aList && 0 < aList.length) {
				self.viewProperties.removeAll(aList);
			}
		}
	;

	this.search = ko.observable('');
	this.contacts = ko.observableArray([]);
	this.contacts.loading = ko.observable(false).extend({'throttle': 200});
	this.currentContact = ko.observable(null);

	this.emptySelection = ko.observable(true);
	this.viewClearSearch = ko.observable(false);

	this.viewID = ko.observable('');
	this.viewProperties = ko.observableArray([]);

	this.viewPropertiesNames = this.viewProperties.filter(function(oProperty) {
		return -1 < Utils.inArray(oProperty.type(), aNameTypes);
	});
	
	this.viewPropertiesEmails = this.viewProperties.filter(function(oProperty) {
		return -1 < Utils.inArray(oProperty.type(), aEmailTypes);
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
		return -1 < Utils.inArray(oProperty.type(), aPhonesTypes);
	});

	this.viewPropertiesEmailsEmptyAndOnFocused = this.viewPropertiesEmails.filter(function(oProperty) {
		var bF = oProperty.focused();
		return '' === Utils.trim(oProperty.value()) && !bF;
	});

	this.viewPropertiesPhonesEmptyAndOnFocused = this.viewPropertiesPhones.filter(function(oProperty) {
		var bF = oProperty.focused();
		return '' === Utils.trim(oProperty.value()) && !bF;
	});

	this.viewPropertiesEmailsEmptyAndOnFocused.subscribe(function(aList) {
		fFastClearEmptyListHelper(aList);
	});

	this.viewPropertiesPhonesEmptyAndOnFocused.subscribe(function(aList) {
		fFastClearEmptyListHelper(aList);
	});

	this.viewSaving = ko.observable(false);

	this.useCheckboxesInList = RL.data().useCheckboxesInList;

	this.search.subscribe(function () {
		this.reloadContactList();
	}, this);

	this.contacts.subscribe(function () {
		Utils.windowResize();
	}, this);

	this.viewProperties.subscribe(function () {
		Utils.windowResize();
	}, this);

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

	this.newCommand = Utils.createCommand(this, function () {
		this.populateViewContact(null);
	});

	this.selector = new Selector(this.contacts, this.currentContact,
		'.e-contact-item .actionHandle', '.e-contact-item.selected', '.e-contact-item .checkboxItem');

	this.selector.on('onItemSelect', _.bind(function (oContact) {
		this.populateViewContact(oContact ? oContact : null);
	}, this));

	this.selector.on('onItemGetUid', function (oContact) {
		return oContact ? oContact.generateUid() : '';
	});

	this.selector.on('onDelete', _.bind(function () {
		this.deleteCommand();
	}, this));

	this.newCommand = Utils.createCommand(this, function () {
		this.populateViewContact(null);
		this.currentContact(null);
	});
	
	this.deleteCommand = Utils.createCommand(this, function () {
		this.deleteSelectedContacts();
	}, function () {
		return 0 < this.contactsCheckedOrSelected().length;
	});

	this.newMessageCommand = Utils.createCommand(this, function () {
		var aC = this.contactsCheckedOrSelected(), aE = [];
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
			kn.hideScreenPopup(PopupsContactsViewModel);
			kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Empty, null, aE]);
		}
		
	}, function () {
		return 0 < this.contactsCheckedOrSelected().length;
	});

	this.clearCommand = Utils.createCommand(this, function () {
		this.search('');
	});

	this.saveCommand = Utils.createCommand(this, function () {
		
		this.viewSaving(true);

		var 
			sRequestUid = Utils.fakeMd5(),
			aProperties = []
		;

		_.each(this.viewProperties(), function (oItem) {
			if (oItem.type() && '' !== Utils.trim(oItem.value()))
			{
				aProperties.push([oItem.type(), oItem.value()]);
			}
		});

		RL.remote().contactSave(function (sResult, oData) {

			self.viewSaving(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
				oData.Result.RequestUid === sRequestUid && 0 < Utils.pInt(oData.Result.ResultID))
			{
				if ('' === self.viewID())
				{
					self.viewID(Utils.pInt(oData.Result.ResultID));
				}

				self.reloadContactList();
			}
//			else
//			{
//				// TODO
//			}
			
		}, sRequestUid, this.viewID(), aProperties);
		
	}, function () {
		var bV = this.viewHasNonEmptyRequaredProperties();
		return !this.viewSaving() && bV;
	});
}

Utils.extendAsViewModel('PopupsContactsViewModel', PopupsContactsViewModel);

PopupsContactsViewModel.prototype.addNewEmail = function ()
{
//	if (0 === this.viewPropertiesEmailsEmpty().length)
//	{
		var oItem = new ContactPropertyModel(Enums.ContactPropertyType.EmailPersonal, '');
		oItem.focused(true);
		this.viewProperties.push(oItem);
//	}
};

PopupsContactsViewModel.prototype.addNewPhone = function ()
{
//	if (0 === this.viewPropertiesPhonesEmpty().length)
//	{
		var oItem = new ContactPropertyModel(Enums.ContactPropertyType.PhonePersonal, '');
		oItem.focused(true);
		this.viewProperties.push(oItem);
//	}
};

PopupsContactsViewModel.prototype.removeCheckedOrSelectedContactsFromList = function ()
{
	var
		self = this,
		oKoContacts = this.contacts,
		oCurrentContact = this.currentContact(),
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
		});

		_.delay(function () {
			
			_.each(aContacts, function (oContact) {
				oKoContacts.remove(oContact);
			});
			
		}, 500);
	}
};

PopupsContactsViewModel.prototype.deleteSelectedContacts = function ()
{
	if (0 < this.contactsCheckedOrSelected().length)
	{
		RL.remote().contactsDelete(
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
PopupsContactsViewModel.prototype.deleteResponse = function (sResult, oData)
{
	if (500 < (Enums.StorageResultType.Success === sResult && oData && oData.Time ? Utils.pInt(oData.Time) : 0))
	{
		this.reloadContactList();
	}
	else
	{
		_.delay((function (self) {
			return function () {
				self.reloadContactList();
			};
		}(this)), 500);
	}
};

PopupsContactsViewModel.prototype.removeProperty = function (oProp)
{
	this.viewProperties.remove(oProp);
};

/**
 * @param {?ContactModel} oContact
 */
PopupsContactsViewModel.prototype.populateViewContact = function (oContact)
{
	var
		sId = '',
		bHasName = false,
		aList = []
	;

	this.emptySelection(false);
	
	if (oContact)
	{
		sId = oContact.idContact;

		if (Utils.isNonEmptyArray(oContact.properties))
		{
			_.each(oContact.properties, function (aProperty) {
				if (aProperty && aProperty[0])
				{
					aList.push(new ContactPropertyModel(aProperty[0], aProperty[1]));
					if (Enums.ContactPropertyType.FullName === aProperty[0])
					{
						bHasName = true;
					}
				}
			});
		}
	}

	if (!bHasName)
	{
		aList.push(new ContactPropertyModel(Enums.ContactPropertyType.FullName, ''));
	}

	this.viewID(sId);
	this.viewProperties([]);
	this.viewProperties(aList);
};

PopupsContactsViewModel.prototype.reloadContactList = function ()
{
	var self = this;
	this.contacts.loading(true);
	RL.remote().contacts(function (sResult, oData) {
		var	aList = [];
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.List)
		{
			if (Utils.isNonEmptyArray(oData.Result.List))
			{
				aList = _.map(oData.Result.List, function (oItem) {
					var oContact = new ContactModel();
					return oContact.parse(oItem) ? oContact : null;
				});

				aList = _.compact(aList);
			}
		}

		self.contacts(aList);
		self.viewClearSearch('' !== self.search());
		self.contacts.loading(false);

		if ('' !== self.viewID() && !self.currentContact() && self.contacts.setSelectedByUid)
		{
			self.contacts.setSelectedByUid('' + self.viewID());
		}

	}, 0, 20, this.search());
};

PopupsContactsViewModel.prototype.onBuild = function (oDom)
{
	this.oContentVisible = $('.b-list-content', oDom);
	this.oContentScrollable = $('.content', this.oContentVisible);

	this.selector.init(this.oContentVisible, this.oContentScrollable);

	ko.computed(function () {
		var
			bModalVisibility = this.modalVisibility(),
			bUseKeyboardShortcuts = RL.data().useKeyboardShortcuts()
		;
		this.selector.useKeyboard(bModalVisibility && bUseKeyboardShortcuts);
	}, this).extend({'notify': 'always'});
};

PopupsContactsViewModel.prototype.onShow = function ()
{
	kn.routeOff();
	this.reloadContactList();
};

PopupsContactsViewModel.prototype.onHide = function ()
{
	kn.routeOn();
	this.currentContact(null);
	this.emptySelection(true);
	this.search('');

	_.each(this.contacts(), function (oItem) {
		oItem.checked(false);
	});
};
