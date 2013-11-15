/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsContactsViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsContacts');

	var self = this;

	this.imageUploader = ko.observable(null);
	this.imageDom = ko.observable(null);
	this.imageTrigger = ko.observable(false);
	
	this.search = ko.observable('');
	this.contacts = ko.observableArray([]);
	this.contacts.loading = ko.observable(false).extend({'throttle': 200});
	this.currentContact = ko.observable(null);

	this.emptySelection = ko.observable(true);
	this.viewClearSearch = ko.observable(false);

	this.viewID = ko.observable('');
	this.viewName = ko.observable('');
	this.viewName.focused = ko.observable(false);
	this.viewEmail = ko.observable('').validateEmail();
	this.viewEmail.focused = ko.observable(false);
	this.viewImageUrl = ko.observable(RL.link().emptyContactPic());

	this.viewSaving = ko.observable(false);

	this.useCheckboxesInList = RL.data().useCheckboxesInList;

	this.search.subscribe(function () {
		this.reloadContactList();
	}, this);

	this.contacts.subscribe(function () {
		Utils.windowResize();
	}, this);

	this.viewImageUrl.subscribe(function (sUrl) {
		this.imageDom()['src'] = sUrl;
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
				if (oItem && oItem['emails'])
				{
					var oEmail = new EmailModel(oItem['emails'][0] || '', oItem['name']);
					if (oEmail.validate())
					{
						return oEmail;
					}
				}
				
				return null;
			});

			aE = _.compact(aE);
		}

		if (Utils.isNonEmptyArray(aC))
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
		var
			sRequestUid = Utils.fakeMd5(),
			bImageTrigger = this.imageTrigger()
		;

		this.viewSaving(true);
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
				if (bImageTrigger)
				{
					RL.emailsPicsHashes();
				}
			}
//			else
//			{
//				// TODO
//			}
			
		}, sRequestUid, this.viewID(), this.viewName(), this.viewEmail(), bImageTrigger ? this.imageDom()['src'] : '');
		
	}, function () {
		var
			sViewName = this.viewName(),
			sViewEmail = this.viewEmail()
		;
		
		return !this.viewSaving() &&
			('' !== sViewName || '' !== sViewEmail);
	});
}

Utils.extendAsViewModel('PopupsContactsViewModel', PopupsContactsViewModel);

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

/**
 * @param {?ContactModel} oContact
 */
PopupsContactsViewModel.prototype.populateViewContact = function (oContact)
{
	this.imageTrigger(false);
	this.emptySelection(false);
	
	if (oContact)
	{
		this.viewID(oContact.idContact);
		this.viewName(oContact.name);
		this.viewEmail(oContact.emails[0] || '');
		this.viewImageUrl(oContact.srcAttr());
	}
	else
	{
		this.viewID('');
		this.viewName('');
		this.viewEmail('');
		this.viewImageUrl(RL.link().emptyContactPic());
	}
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

	}, this.search());
};

PopupsContactsViewModel.prototype.onBuild = function (oDom)
{
	this.initUploader();

	this.oContentVisible = $('.b-list-content', oDom);
	this.oContentScrollable = $('.content', this.oContentVisible);

	this.selector.init(this.oContentVisible, this.oContentScrollable);

	this.viewImageUrl.valueHasMutated();

	ko.computed(function () {
		var
			bModalVisibility = this.modalVisibility(),
			bUseKeyboardShortcuts = RL.data().useKeyboardShortcuts()
		;
		this.selector.useKeyboard(bModalVisibility && bUseKeyboardShortcuts);
	}, this).extend({'notify': 'always'});
};

PopupsContactsViewModel.prototype.initUploader = function ()
{
	var self = this, oJua = null;
	if (window.File && window.FileReader && this.imageUploader())
	{
		oJua = new Jua({
			'queueSize': 1,
			'multipleSizeLimit': 1,
			'clickElement': this.imageUploader(),
			'disableDragAndDrop': true,
			'disableMultiple': true,
			'onSelect': function (sId, oData) {
				
				if (oData && oData['File'] && oData['File']['type'])
				{
					var
						oReader = null,
						oFile = oData['File'],
						sType = oData['File']['type']
					;

					if (!sType.match(/image.*/))
					{
						window.alert('this file is not an image.');
					}
					else
					{
						oReader = new window.FileReader();
						oReader.onload = function (oEvent) {
							if (oEvent &&  oEvent.target && oEvent.target.result)
							{
								Utils.resizeAndCrop(oEvent.target.result, 150, function (sUrl) {
									self.viewImageUrl(sUrl);
									self.imageTrigger(true);
								});
							}
						};

						oReader.readAsDataURL(oFile);
					}
				}

				return false;
			}
		});
	}

	return oJua;
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
