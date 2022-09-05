import { ComposeType } from 'Common/EnumsUser';
import { registerShortcut } from 'Common/Globals';
import { arrayLength, pInt } from 'Common/Utils';
import { download, computedPaginatorHelper, showMessageComposer } from 'Common/UtilsUser';

import { Selector } from 'Common/Selector';
import { serverRequestRaw, serverRequest } from 'Common/Links';
import { i18n, getNotification } from 'Common/Translator';

import { SettingsUserStore } from 'Stores/User/Settings';
import { ContactUserStore } from 'Stores/User/Contact';

import Remote from 'Remote/User/Fetch';

import { EmailModel } from 'Model/Email';
import { ContactModel } from 'Model/Contact';

import { decorateKoCommands, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { AskPopupView } from 'View/Popup/Ask';

const
	CONTACTS_PER_PAGE = 50,
	ScopeContacts = 'Contacts';

export class ContactsPopupView extends AbstractViewPopup {
	constructor() {
		super('Contacts');

		this.bBackToCompose = false;
		this.sLastComposeFocusedField = '';

		this.addObservables({
			search: '',
			contactsCount: 0,

			selectorContact: null,

			importButton: null,

			contactsPage: 1,

			isSaving: false,

			hasChanges: false,

			contact: null
		});

		this.contacts = ContactUserStore;

		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;

		this.selector = new Selector(
			ContactUserStore,
			this.selectorContact,
			null,
			'.e-contact-item .actionHandle',
			'.e-contact-item .checkboxItem',
			'.e-contact-item.focused'
		);

		this.selector.on('ItemSelect', contact => {
			this.populateViewContact(contact);
		});

		this.selector.on('ItemGetUid', contact => contact ? contact.generateUid() : '');

		this.bDropPageAfterDelete = false;

		const
			pagecount = () => Math.max(1, Math.ceil(this.contactsCount() / CONTACTS_PER_PAGE));

		this.addComputables({
			contactsPageCount: pagecount,

			contactsPaginator: computedPaginatorHelper(this.contactsPage, pagecount),

			contactsCheckedOrSelected: () => {
				const checked = ContactUserStore.filter(item => item.checked?.()),
					selected = this.selectorContact();

				return selected
					? [...checked, selected].unique()
					: checked;
			},

			contactsCheckedOrSelectedUids: () => this.contactsCheckedOrSelected().map(contact => contact.id()),

			contactsSyncEnabled: () => ContactUserStore.allowSync() && ContactUserStore.syncMode()
		});

		this.search.subscribe(() => this.reloadContactList());

		this.saveCommand = this.saveCommand.bind(this);

//		this.hasChanges(!!contact()?.toJSON().jCard);

		decorateKoCommands(this, {
//			close: self => !self.hasChanges(),
			deleteCommand: self => 0 < self.contactsCheckedOrSelected().length,
			newMessageCommand: self => 0 < self.contactsCheckedOrSelected().length,
			saveCommand: self => !self.isSaving() && !self.hasChanges(),
			syncCommand: self => !self.contacts.syncing() && !self.contacts.importing()
		});
	}

	newContact() {
		this.populateViewContact(null);
		this.selectorContact(null);
	}

	deleteCommand() {
		this.deleteSelectedContacts();
	}

	newMessageCommand() {
		let aE = [],
			toEmails = null,
			ccEmails = null,
			bccEmails = null;

		const aC = this.contactsCheckedOrSelected();
		if (arrayLength(aC)) {
			aE = aC.map(oItem => {
				if (oItem) {
					const data = oItem.getNameAndEmailHelper(),
						email = data ? new EmailModel(data[0], data[1]) : null;

					if (email?.validate()) {
						return email;
					}
				}

				return null;
			});

			aE = aE.filter(value => !!value);
		}

		if (arrayLength(aE)) {
			this.bBackToCompose = false;

			this.close();

			switch (this.sLastComposeFocusedField) {
				case 'cc':
					ccEmails = aE;
					break;
				case 'bcc':
					bccEmails = aE;
					break;
				default:
					toEmails = aE;
					break;
			}

			this.sLastComposeFocusedField = '';

			setTimeout(() =>
				showMessageComposer([ComposeType.Empty, null, toEmails, ccEmails, bccEmails])
			, 200);
		}

		return true;
	}

	clearSearch() {
		this.search('');
	}

	saveCommand() {
		this.isSaving(true);
		const contact = this.contact();
		Remote.request('ContactSave',
			(iError, oData) => {
				this.isSaving(false);
				if (!iError && oData.Result.ResultID) {
					contact.id(oData.Result.ResultID);
					this.reloadContactList(); // TODO: remove when e-contact-foreach is dynamic
					this.hasChanges(false);
				}
			}, {
				Contact: contact
//				Uid: contact.id(),
//				jCard: contact.jCard
			}
		);
	}

	syncCommand() {
		ContactUserStore.sync(iError => {
			iError && alert(getNotification(iError));
			this.reloadContactList(true);
		});
	}

	exportVcf() {
		download(serverRequestRaw('ContactsVcf'), 'contacts.vcf');
	}

	exportCsv() {
		download(serverRequestRaw('ContactsCsv'), 'contacts.csv');
	}

	removeCheckedOrSelectedContactsFromList() {
		const contacts = this.contactsCheckedOrSelected();

		let selectorContact = this.selectorContact(),
			count = ContactUserStore.length;

		if (contacts.length) {
			contacts.forEach(contact => {
				if (selectorContact && selectorContact.id() === contact.id()) {
					selectorContact = null;
					this.selectorContact(null);
				}

				contact.deleted(true);
				--count;
			});

			if (0 >= count) {
				this.bDropPageAfterDelete = true;
			}

			setTimeout(() => {
				contacts.forEach(contact => ContactUserStore.remove(contact));
			}, 500);
		}
	}

	deleteSelectedContacts() {
		if (this.contactsCheckedOrSelected().length) {
			Remote.request('ContactsDelete',
				(iError, oData) => {
					if (500 < (!iError && oData?.Time) ? pInt(oData.Time) : 0) {
						this.reloadContactList(this.bDropPageAfterDelete);
					} else {
						setTimeout(() => this.reloadContactList(this.bDropPageAfterDelete), 500);
					}
				}, {
					Uids: this.contactsCheckedOrSelectedUids().join(',')
				}
			);
			this.removeCheckedOrSelectedContactsFromList();
		}
	}

	/**
	 * @param {?ContactModel} contact
	 */
	populateViewContact(contact) {
		if (!contact) {
			contact = new ContactModel;
		}
		this.contact(contact);

		this.hasChanges(false);
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

		ContactUserStore.loading(true);
		Remote.abort('Contacts').request('Contacts',
			(iError, data) => {
				let count = 0,
					list = [];

				if (iError) {
//					console.error(data);
					alert(data?.ErrorMessage || getNotification(iError));
				} else if (arrayLength(data.Result.List)) {
					data.Result.List.forEach(item => {
						item = ContactModel.reviveFromJson(item);
						item && list.push(item);
					});

					count = pInt(data.Result.Count);
					count = 0 < count ? count : 0;
				}

				this.contactsCount(count);

				ContactUserStore(list);

				ContactUserStore.loading(false);
			},
			{
				Offset: offset,
				Limit: CONTACTS_PER_PAGE,
				Search: this.search()
			}
		);
	}

	onBuild(dom) {
		this.selector.init(dom.querySelector('.b-list-content'), ScopeContacts);

		registerShortcut('delete', '', ScopeContacts, () => {
			this.deleteCommand();
			return false;
		});

		registerShortcut('c,w', '', ScopeContacts, () => {
			this.newMessageCommand();
			return false;
		});

		const self = this;

		dom.addEventListener('click', event => {
			let el = event.target.closestWithin('.e-paginator a', dom);
			if (el && ko.dataFor(el)) {
				self.contactsPage(pInt(ko.dataFor(el).value));
				self.reloadContactList();
			}
		});

		// initUploader

		if (this.importButton()) {
			const j = new Jua({
				action: serverRequest('UploadContacts'),
				limit: 1,
				disableDocumentDropPrevent: true,
				clickElement: this.importButton()
			});

			if (j) {
				j.on('onStart', () => {
					ContactUserStore.importing(true);
				}).on('onComplete', (id, result, data) => {
					ContactUserStore.importing(false);
					this.reloadContactList();
					if (!id || !result || !data || !data.Result) {
						alert(i18n('CONTACTS/ERROR_IMPORT_FILE'));
					}
				});
			}
		}
	}

	onClose() {
		if (this.hasChanges() && AskPopupView.hidden()) {
			showScreenPopup(AskPopupView, [
				i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'),
				() => this.close()
			]);
			return false;
		}
	}

	onShow(bBackToCompose, sLastComposeFocusedField) {
		this.bBackToCompose = !!bBackToCompose;
		this.sLastComposeFocusedField = sLastComposeFocusedField;
		this.reloadContactList(true);
	}

	onHide() {
		this.contact(null);
		this.selectorContact(null);
		this.search('');
		this.contactsCount(0);

		ContactUserStore([]);

		this.sLastComposeFocusedField = '';
		if (this.bBackToCompose) {
			this.bBackToCompose = false;
			showMessageComposer();
		}
	}
}
