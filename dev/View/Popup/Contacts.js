import ko from 'ko';

import {
	SaveSettingsStep,
	ContactPropertyType,
	ComposeType,
	Capa,
	StorageResultType,
	Notification,
	KeyState
} from 'Common/Enums';

import {
	delegateRunOnDestroy,
	computedPaginatorHelper,
	pInt
} from 'Common/Utils';

import { Selector } from 'Common/Selector';
import { exportContactsVcf, exportContactsCsv, uploadContacts } from 'Common/Links';
import { i18n, getNotification } from 'Common/Translator';

import SettingsStore from 'Stores/User/Settings';
import ContactStore from 'Stores/User/Contact';

import Remote from 'Remote/User/Fetch';

import { EmailModel } from 'Model/Email';
import { ContactModel } from 'Model/Contact';
import { ContactPropertyModel } from 'Model/ContactProperty';

import { popup, command, showScreenPopup, hideScreenPopup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

const trim = text => null == text ? "" : (text + "").trim(),
	CONTACTS_PER_PAGE = 50;

@popup({
	name: 'View/Popup/Contacts',
	templateID: 'PopupsContacts'
})
class ContactsPopupView extends AbstractViewNext {
	constructor() {
		super();

		const fFastClearEmptyListHelper = (list) => {
			if (list && list.length) {
				this.viewProperties.removeAll(list);
				delegateRunOnDestroy(list);
			}
		};

		this.bBackToCompose = false;
		this.sLastComposeFocusedField = '';

		this.allowContactsSync = ContactStore.allowContactsSync;
		this.enableContactsSync = ContactStore.enableContactsSync;

		this.search = ko.observable('');
		this.contactsCount = ko.observable(0);
		this.contacts = ContactStore.contacts;

		this.currentContact = ko.observable(null);

		this.importUploaderButton = ko.observable(null);

		this.contactsPage = ko.observable(1);
		this.contactsPageCount = ko.computed(() => {
			const iPage = Math.ceil(this.contactsCount() / CONTACTS_PER_PAGE);
			return 0 >= iPage ? 1 : iPage;
		});

		this.contactsPaginator = ko.computed(computedPaginatorHelper(this.contactsPage, this.contactsPageCount));

		this.emptySelection = ko.observable(true);
		this.viewClearSearch = ko.observable(false);

		this.viewID = ko.observable('');
		this.viewReadOnly = ko.observable(false);
		this.viewProperties = ko.observableArray([]);

		this.viewSaveTrigger = ko.observable(SaveSettingsStep.Idle);

		this.viewPropertiesNames = ko.computed(() =>
			this.viewProperties().filter(
				property => [ContactPropertyType.FirstName, ContactPropertyType.LastName].includes(property.type())
			)
		);
		this.viewPropertiesOther = ko.computed(() =>
			this.viewProperties().filter(property => [ContactPropertyType.Nick].includes(property.type()))
		);

		this.viewPropertiesEmails = ko.computed(() =>
			this.viewProperties().filter(property => ContactPropertyType.Email === property.type())
		);

		this.viewPropertiesWeb = ko.computed(() =>
			this.viewProperties().filter(property => ContactPropertyType.Web === property.type())
		);

		this.viewHasNonEmptyRequiredProperties = ko.computed(() => {
			const names = this.viewPropertiesNames(),
				emails = this.viewPropertiesEmails(),
				fFilter = (property) => !!trim(property.value());

			return !!(names.find(fFilter) || emails.find(fFilter));
		});

		this.viewPropertiesPhones = ko.computed(() =>
			this.viewProperties().filter(property => ContactPropertyType.Phone === property.type())
		);

		this.viewPropertiesEmailsNonEmpty = ko.computed(() =>
			this.viewPropertiesNames().filter(property => !!trim(property.value()))
		);

		const propertyFocused = (property) => {
			const focused = property.focused();
			return !trim(property.value()) && !focused;
		};

		this.viewPropertiesEmailsEmptyAndOnFocused = ko.computed(() =>
			this.viewPropertiesEmails().filter(propertyFocused)
		);

		this.viewPropertiesPhonesEmptyAndOnFocused = ko.computed(() =>
			this.viewPropertiesPhones().filter(propertyFocused)
		);

		this.viewPropertiesWebEmptyAndOnFocused = ko.computed(() => this.viewPropertiesWeb().filter(propertyFocused));

		this.viewPropertiesOtherEmptyAndOnFocused = ko.computed(() =>
			this.viewPropertiesOther().filter(propertyFocused)
		);

		this.viewPropertiesEmailsEmptyAndOnFocused.subscribe(fFastClearEmptyListHelper);
		this.viewPropertiesPhonesEmptyAndOnFocused.subscribe(fFastClearEmptyListHelper);
		this.viewPropertiesWebEmptyAndOnFocused.subscribe(fFastClearEmptyListHelper);
		this.viewPropertiesOtherEmptyAndOnFocused.subscribe(fFastClearEmptyListHelper);

		this.viewSaving = ko.observable(false);

		this.useCheckboxesInList = SettingsStore.useCheckboxesInList;

		this.search.subscribe(() => {
			this.reloadContactList();
		});

		this.contactsChecked = ko.computed(() => this.contacts().filter(item => item.checked()));

		this.contactsCheckedOrSelected = ko.computed(() => {
			const checked = this.contactsChecked(),
				selected = this.currentContact();

			return selected
				? checked.concat([selected]).unique()
				: checked;
		});

		this.contactsCheckedOrSelectedUids = ko.computed(() =>
			this.contactsCheckedOrSelected().map(contact => contact.idContact)
		);

		this.selector = new Selector(
			this.contacts,
			this.currentContact,
			null,
			'.e-contact-item .actionHandle',
			'.e-contact-item.selected',
			'.e-contact-item .checkboxItem',
			'.e-contact-item.focused'
		);

		this.selector.on('onItemSelect', (contact) => {
			this.populateViewContact(contact ? contact : null);
			if (!contact) {
				this.emptySelection(true);
			}
		});

		this.selector.on('onItemGetUid', (contact) => (contact ? contact.generateUid() : ''));

		this.bDropPageAfterDelete = false;

		this.watchDirty = ko.observable(false);
		this.watchHash = ko.observable(false);

		this.viewHash = ko.computed(() => '' + this.viewProperties().map(oItem => oItem.value()).join(''));

		// this.saveCommandDebounce = _.debounce(this.saveCommand.bind(this), 1000);

		this.viewHash.subscribe(() => {
			if (this.watchHash() && !this.viewReadOnly() && !this.watchDirty()) {
				this.watchDirty(true);
			}
		});

		this.sDefaultKeyScope = KeyState.ContactList;
	}

	@command()
	newCommand() {
		this.populateViewContact(null);
		this.currentContact(null);
	}

	@command((self) => 0 < self.contactsCheckedOrSelected().length)
	deleteCommand() {
		this.deleteSelectedContacts();
		this.emptySelection(true);
	}

	@command((self) => 0 < self.contactsCheckedOrSelected().length)
	newMessageCommand() {
		if (!rl.settings.capa(Capa.Composer)) {
			return false;
		}

		let aE = [],
			toEmails = null,
			ccEmails = null,
			bccEmails = null;

		const aC = this.contactsCheckedOrSelected();
		if (Array.isNotEmpty(aC)) {
			aE = aC.map(oItem => {
				if (oItem) {
					const data = oItem.getNameAndEmailHelper(),
						email = data ? new EmailModel(data[0], data[1]) : null;

					if (email && email.validate()) {
						return email;
					}
				}

				return null;
			});

			aE = aE.filter(value => !!value);
		}

		if (Array.isNotEmpty(aE)) {
			this.bBackToCompose = false;

			hideScreenPopup(ContactsPopupView);

			switch (this.sLastComposeFocusedField) {
				case 'cc':
					ccEmails = aE;
					break;
				case 'bcc':
					bccEmails = aE;
					break;
				case 'to':
				default:
					toEmails = aE;
					break;
			}

			this.sLastComposeFocusedField = '';

			setTimeout(() => {
				showScreenPopup(require('View/Popup/Compose'), [ComposeType.Empty, null, toEmails, ccEmails, bccEmails]);
			}, 200);
		}

		return true;
	}

	@command()
	clearCommand() {
		this.search('');
	}

	@command((self) => {
		const bV = self.viewHasNonEmptyRequiredProperties(),
			bReadOnly = self.viewReadOnly();
		return !self.viewSaving() && bV && !bReadOnly;
	})
	saveCommand() {
		this.viewSaving(true);
		this.viewSaveTrigger(SaveSettingsStep.Animate);

		const requestUid = Jua.randomId(),
			properties = [];

		this.viewProperties().forEach(oItem => {
			if (oItem.type() && oItem.type() !== ContactPropertyType.FullName && trim(oItem.value())) {
				properties.push([oItem.type(), oItem.value(), oItem.typeStr()]);
			}
		});

		Remote.contactSave(
			(sResult, oData) => {
				let res = false;
				this.viewSaving(false);

				if (
					StorageResultType.Success === sResult &&
					oData &&
					oData.Result &&
					oData.Result.RequestUid === requestUid &&
					0 < pInt(oData.Result.ResultID)
				) {
					if (!this.viewID()) {
						this.viewID(pInt(oData.Result.ResultID));
					}

					this.reloadContactList();
					res = true;
				}

				setTimeout(() => {
					this.viewSaveTrigger(res ? SaveSettingsStep.TrueResult : SaveSettingsStep.FalseResult);
				}, 350);

				if (res) {
					this.watchDirty(false);

					setTimeout(() => {
						this.viewSaveTrigger(SaveSettingsStep.Idle);
					}, 1000);
				}
			},
			requestUid,
			this.viewID(),
			properties
		);
	}

	@command((self) => !self.contacts.syncing() && !self.contacts.importing())
	syncCommand() {
		rl.app.contactsSync((result, data) => {
			if (StorageResultType.Success !== result || !data || !data.Result) {
				alert(getNotification(data && data.ErrorCode ? data.ErrorCode : Notification.ContactsSyncError));
			}

			this.reloadContactList(true);
		});
	}

	getPropertyPlaceholder(type) {
		let result = '';
		switch (type) {
			case ContactPropertyType.LastName:
				result = 'CONTACTS/PLACEHOLDER_ENTER_LAST_NAME';
				break;
			case ContactPropertyType.FirstName:
				result = 'CONTACTS/PLACEHOLDER_ENTER_FIRST_NAME';
				break;
			case ContactPropertyType.Nick:
				result = 'CONTACTS/PLACEHOLDER_ENTER_NICK_NAME';
				break;
			// no default
		}

		return result;
	}

	addNewProperty(type, typeStr) {
		this.viewProperties.push(
			new ContactPropertyModel(type, typeStr || '', '', true, this.getPropertyPlaceholder(type))
		);
	}

	addNewOrFocusProperty(type, typeStr) {
		const item = this.viewProperties().find(prop => type === prop.type());
		if (item) {
			item.focused(true);
		} else {
			this.addNewProperty(type, typeStr);
		}
	}

	addNewEmail() {
		this.addNewProperty(ContactPropertyType.Email, 'Home');
	}

	addNewPhone() {
		this.addNewProperty(ContactPropertyType.Phone, 'Mobile');
	}

	addNewWeb() {
		this.addNewProperty(ContactPropertyType.Web);
	}

	addNewNickname() {
		this.addNewOrFocusProperty(ContactPropertyType.Nick);
	}

	addNewNotes() {
		this.addNewOrFocusProperty(ContactPropertyType.Note);
	}

	addNewBirthday() {
		this.addNewOrFocusProperty(ContactPropertyType.Birthday);
	}

	exportVcf() {
		rl.app.download(exportContactsVcf());
	}

	exportCsv() {
		rl.app.download(exportContactsCsv());
	}

	initUploader() {
		if (this.importUploaderButton()) {
			const j = new Jua({
				action: uploadContacts(),
				name: 'uploader',
				queueSize: 1,
				multipleSizeLimit: 1,
				disableMultiple: true,
				disableDocumentDropPrevent: true,
				clickElement: this.importUploaderButton()
			});

			if (j) {
				j.on('onStart', () => {
					this.contacts.importing(true);
				}).on('onComplete', (id, result, data) => {
					this.contacts.importing(false);
					this.reloadContactList();
					if (!id || !result || !data || !data.Result) {
						alert(i18n('CONTACTS/ERROR_IMPORT_FILE'));
					}
				});
			}
		}
	}

	removeCheckedOrSelectedContactsFromList() {
		const koContacts = this.contacts,
			contacts = this.contactsCheckedOrSelected();

		let currentContact = this.currentContact(),
			count = this.contacts().length;

		if (contacts.length) {
			contacts.forEach(contact => {
				if (currentContact && currentContact.idContact === contact.idContact) {
					currentContact = null;
					this.currentContact(null);
				}

				contact.deleted(true);
				--count;
			});

			if (0 >= count) {
				this.bDropPageAfterDelete = true;
			}

			setTimeout(() => {
				contacts.forEach(contact => {
					koContacts.remove(contact);
					delegateRunOnDestroy(contact);
				});
			}, 500);
		}
	}

	deleteSelectedContacts() {
		if (this.contactsCheckedOrSelected().length) {
			Remote.contactsDelete(this.deleteResponse.bind(this), this.contactsCheckedOrSelectedUids());

			this.removeCheckedOrSelectedContactsFromList();
		}
	}

	/**
	 * @param {string} sResult
	 * @param {AjaxJsonDefaultResponse} oData
	 */
	deleteResponse(sResult, oData) {
		if (500 < (StorageResultType.Success === sResult && oData && oData.Time ? pInt(oData.Time) : 0)) {
			this.reloadContactList(this.bDropPageAfterDelete);
		} else {
			setTimeout(() => {
				this.reloadContactList(this.bDropPageAfterDelete);
			}, 500);
		}
	}

	removeProperty(oProp) {
		this.viewProperties.remove(oProp);
		delegateRunOnDestroy(oProp);
	}

	/**
	 * @param {?ContactModel} contact
	 */
	populateViewContact(contact) {
		let id = '',
			lastName = '',
			firstName = '';
		const list = [];

		this.watchHash(false);

		this.emptySelection(false);
		this.viewReadOnly(false);

		if (contact) {
			id = contact.idContact;
			if (Array.isNotEmpty(contact.properties)) {
				contact.properties.forEach(property => {
					if (property && property[0]) {
						if (ContactPropertyType.LastName === property[0]) {
							lastName = property[1];
						} else if (ContactPropertyType.FirstName === property[0]) {
							firstName = property[1];
						} else {
							list.push(new ContactPropertyModel(property[0], property[2] || '', property[1]));
						}
					}
				});
			}

			this.viewReadOnly(!!contact.readOnly);
		}

		list.unshift(
			new ContactPropertyModel(
				ContactPropertyType.LastName,
				'',
				lastName,
				false,
				this.getPropertyPlaceholder(ContactPropertyType.LastName)
			)
		);

		list.unshift(
			new ContactPropertyModel(
				ContactPropertyType.FirstName,
				'',
				firstName,
				!contact,
				this.getPropertyPlaceholder(ContactPropertyType.FirstName)
			)
		);

		this.viewID(id);

		delegateRunOnDestroy(this.viewProperties());

		this.viewProperties([]);
		this.viewProperties(list);

		this.watchDirty(false);
		this.watchHash(true);
	}

	/**
	 * @param {boolean=} dropPagePosition = false
	 */
	reloadContactList(dropPagePosition = false) {
		let offset = (this.contactsPage() - 1) * CONTACTS_PER_PAGE;

		this.bDropPageAfterDelete = false;

		if (dropPagePosition) {
			this.contactsPage(1);
			offset = 0;
		}

		this.contacts.loading(true);
		Remote.contacts(
			(result, data) => {
				let count = 0,
					list = [];

				if (StorageResultType.Success === result && data && data.Result && data.Result.List) {
					if (Array.isNotEmpty(data.Result.List)) {
						list = data.Result.List.map(item => {
							const contact = new ContactModel();
							return contact.parse(item) ? contact : null;
						});

						list = list.filter(v => v);

						count = pInt(data.Result.Count);
						count = 0 < count ? count : 0;
					}
				}

				this.contactsCount(count);

				delegateRunOnDestroy(this.contacts());
				this.contacts(list);

				this.contacts.loading(false);
				this.viewClearSearch(!!this.search());
			},
			offset,
			CONTACTS_PER_PAGE,
			this.search()
		);
	}

	onBuild(dom) {
		this.selector.init(dom.querySelector('.b-list-content'), KeyState.ContactList);

		shortcuts.add('delete', '', KeyState.ContactList, () => {
			this.deleteCommand();
			return false;
		});

		shortcuts.add('c,w', '', KeyState.ContactList, () => {
			this.newMessageCommand();
			return false;
		});

		const self = this;

		dom.addEventListener('click', event => {
			let el = event.target.closestWithin('.e-paginator .e-page', dom);
			if (el && ko.dataFor(el)) {
				self.contactsPage(pInt(ko.dataFor(el).value));
				self.reloadContactList();
			}
		});

		this.initUploader();
	}

	onShow(bBackToCompose, sLastComposeFocusedField) {
		this.bBackToCompose = undefined === bBackToCompose ? false : !!bBackToCompose;
		this.sLastComposeFocusedField = undefined === sLastComposeFocusedField ? '' : sLastComposeFocusedField;

		rl.route.off();
		this.reloadContactList(true);
	}

	onHide() {
		rl.route.on();

		this.currentContact(null);
		this.emptySelection(true);
		this.search('');
		this.contactsCount(0);

		delegateRunOnDestroy(this.contacts());
		this.contacts([]);

		this.sLastComposeFocusedField = '';

		if (this.bBackToCompose) {
			this.bBackToCompose = false;

			if (rl.settings.capa(Capa.Composer)) {
				showScreenPopup(require('View/Popup/Compose'));
			}
		}
	}
}

export { ContactsPopupView, ContactsPopupView as default };
