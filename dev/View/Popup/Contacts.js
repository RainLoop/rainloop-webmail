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

import { pInt } from 'Common/Utils';
import { delegateRunOnDestroy, computedPaginatorHelper } from 'Common/UtilsUser';

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

const CONTACTS_PER_PAGE = 50,
	propertyIsMail = prop => prop.isType(ContactPropertyType.Email),
	propertyIsName = prop => prop.isType(ContactPropertyType.FirstName) || prop.isType(ContactPropertyType.LastName);

@popup({
	name: 'View/Popup/Contacts',
	templateID: 'PopupsContacts'
})
class ContactsPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.bBackToCompose = false;
		this.sLastComposeFocusedField = '';

		this.allowContactsSync = ContactStore.allowContactsSync;
		this.enableContactsSync = ContactStore.enableContactsSync;

		this.addObservables({
			search: '',
			contactsCount: 0,

			currentContact: null,

			importUploaderButton: null,

			contactsPage: 1,

			emptySelection: true,
			viewClearSearch: false,

			viewID: '',
			viewReadOnly: false,

			viewSaveTrigger: SaveSettingsStep.Idle,

			viewSaving: false,

			watchDirty: false,
			watchHash: false
		});

		this.contacts = ContactStore.contacts;

		this.viewProperties = ko.observableArray();

/*
		// Somehow this is broken now when calling addNewProperty
		const fFastClearEmptyListHelper = list => {
			if (list && list.length) {
				this.viewProperties.removeAll(list);
				delegateRunOnDestroy(list);
			}
		};
		this.addSubscribables({
			viewPropertiesEmailsEmptyAndOnFocused: fFastClearEmptyListHelper,
			viewPropertiesPhonesEmptyAndOnFocused: fFastClearEmptyListHelper,
			viewPropertiesWebEmptyAndOnFocused: fFastClearEmptyListHelper,
			viewPropertiesOtherEmptyAndOnFocused: fFastClearEmptyListHelper
		});
*/

		this.useCheckboxesInList = SettingsStore.useCheckboxesInList;

		this.selector = new Selector(
			this.contacts,
			this.currentContact,
			null,
			'.e-contact-item .actionHandle',
			'.e-contact-item.selected',
			'.e-contact-item .checkboxItem',
			'.e-contact-item.focused'
		);

		this.selector.on('onItemSelect', contact => {
			this.populateViewContact(contact || null);
			if (!contact) {
				this.emptySelection(true);
			}
		});

		this.selector.on('onItemGetUid', contact => contact ? contact.generateUid() : '');

		this.bDropPageAfterDelete = false;

		// this.saveCommandDebounce = _.debounce(this.saveCommand.bind(this), 1000);

		this.sDefaultKeyScope = KeyState.ContactList;

		const
//			propertyFocused = property => !property.isValid() && !property.focused(),
			pagecount = () => Math.max(1, Math.ceil(this.contactsCount() / CONTACTS_PER_PAGE));

		this.addComputables({
			contactsPageCount: pagecount,

			contactsPaginator: computedPaginatorHelper(this.contactsPage, pagecount),

			viewPropertiesNames: () => this.viewProperties.filter(propertyIsName),

			viewPropertiesEmails: () => this.viewProperties.filter(propertyIsMail),

			viewPropertiesOther: () => this.viewProperties.filter(property => property.isType(ContactPropertyType.Nick)),

			viewPropertiesWeb: () => this.viewProperties.filter(property => property.isType(ContactPropertyType.Web)),

			viewPropertiesPhones: () => this.viewProperties.filter(property => property.isType(ContactPropertyType.Phone)),

			contactHasValidName: () => !!this.viewProperties.find(prop => propertyIsName(prop) && prop.isValid()),
/*
			viewPropertiesEmailsEmptyAndOnFocused: () => this.viewPropertiesEmails().filter(propertyFocused),
			viewPropertiesPhonesEmptyAndOnFocused: () => this.viewPropertiesPhones().filter(propertyFocused),
			viewPropertiesWebEmptyAndOnFocused: () => this.viewPropertiesWeb().filter(propertyFocused),
			viewPropertiesOtherEmptyAndOnFocused: () => this.viewPropertiesOther().filter(propertyFocused),
*/
			contactsCheckedOrSelected: () => {
				const checked = this.contacts.filter(item => item.checked && item.checked()),
					selected = this.currentContact();

				return selected
					? [...checked, selected].unique()
					: checked;
			},

			contactsCheckedOrSelectedUids: () => this.contactsCheckedOrSelected().map(contact => contact.id),

			viewHash: () => '' + this.viewProperties.map(property => property.value && property.value()).join('')
		});

		this.search.subscribe(() => this.reloadContactList());

		this.viewHash.subscribe(() => {
			if (this.watchHash() && !this.viewReadOnly() && !this.watchDirty()) {
				this.watchDirty(true);
			}
		});
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

	@command(self =>
		!self.viewSaving() && !self.viewReadOnly()
			&& (self.contactHasValidName() || self.viewProperties.find(prop => propertyIsMail(prop) && prop.isValid()))
	)
	saveCommand() {
		this.viewSaving(true);
		this.viewSaveTrigger(SaveSettingsStep.Animate);

		const requestUid = Jua.randomId();

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

					this.reloadContactList(); // TODO: remove when e-contact-foreach is dynamic
					res = true;
				}

				setTimeout(() =>
					this.viewSaveTrigger(res ? SaveSettingsStep.TrueResult : SaveSettingsStep.FalseResult)
				, 350);

				if (res) {
					this.watchDirty(false);
					setTimeout(() => this.viewSaveTrigger(SaveSettingsStep.Idle), 1000);
				}
			},
			requestUid,
			this.viewID(),
			this.viewProperties.map(oItem => oItem.toJSON())
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
		const item = this.viewProperties.find(prop => prop.isType(type));
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
			count = this.contacts.length;

		if (contacts.length) {
			contacts.forEach(contact => {
				if (currentContact && currentContact.id === contact.id) {
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
	 * @param {FetchJsonDefaultResponse} oData
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
		let id = '';

		this.watchHash(false);

		this.emptySelection(false);
		this.viewReadOnly(false);

		if (contact) {
			id = contact.id;
			this.viewReadOnly(!!contact.readOnly);
		} else {
			contact = new ContactModel;
			contact.initDefaultProperties();
		}

		this.viewID(id);

//		delegateRunOnDestroy(this.viewProperties());
//		this.viewProperties([]);
		this.viewProperties(contact.properties);

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
						data.Result.List.forEach(item => {
							item = ContactModel.reviveFromJson(item);
							item && list.push(item);
						});

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
