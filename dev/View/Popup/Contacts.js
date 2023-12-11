import { addObservablesTo, addComputablesTo } from 'External/ko';
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

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { AskPopupView } from 'View/Popup/Ask';

const
	CONTACTS_PER_PAGE = 50,
	ScopeContacts = 'Contacts';

let
	bOpenCompose = false,
	sComposeRecipientsField = '';

export class ContactsPopupView extends AbstractViewPopup {
	constructor() {
		super('Contacts');

		addObservablesTo(this, {
			search: '',
			contactsCount: 0,

			selectorContact: null,

			importButton: null,

			contactsPage: 1,

			isSaving: false,

			contact: null
		});

		this.contacts = ContactUserStore;

		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;

		this.selector = new Selector(
			ContactUserStore,
			this.selectorContact,
			null,
			'.e-contact-item',
			'.e-contact-item .checkboxItem'
		);

		this.selector.on('ItemSelect', contact => this.populateViewContact(contact));

		this.selector.on('ItemGetUid', contact => contact ? contact.generateUid() : '');

		addComputablesTo(this, {
			contactsPaginator: computedPaginatorHelper(
				this.contactsPage,
				() => Math.max(1, Math.ceil(this.contactsCount() / CONTACTS_PER_PAGE))
			),

			contactsCheckedOrSelected: () => {
				const checked = ContactUserStore.filter(item => item.checked()),
					selected = this.selectorContact();
				return checked.length ? checked : (selected ? [selected] : []);
			},

			contactsSyncEnabled: () => ContactUserStore.allowSync() && ContactUserStore.syncMode(),

			isBusy: () => ContactUserStore.syncing() | ContactUserStore.importing() | ContactUserStore.loading()
				| this.isSaving()
		});

		this.search.subscribe(() => this.reloadContactList());

		this.saveCommand = this.saveCommand.bind(this);

		decorateKoCommands(this, {
			deleteCommand: self => !self.isBusy() && 0 < self.contactsCheckedOrSelected().length,
			newMessageCommand: self => !self.isBusy() && 0 < self.contactsCheckedOrSelected().length,
			saveCommand: self => !self.isBusy(),
			syncCommand: self => !self.isBusy()
		});
	}

	newContact() {
		this.populateViewContact(new ContactModel);
		this.selectorContact(null);
	}

	deleteCommand() {
		const contacts = this.contactsCheckedOrSelected();
		if (contacts.length) {
			let selectorContact = this.selectorContact(),
				uids = [],
				count = 0;
			contacts.forEach(contact => {
				uids.push(contact.id());
				if (selectorContact && selectorContact.id() === contact.id()) {
					this.selectorContact(selectorContact = null);
				}
				contact.deleted(true);
				++count;
			});
			Remote.request('ContactsDelete',
				(iError, oData) => {
					if (iError) {
						alert(oData?.ErrorMessage || getNotification(iError));
					} else {
						const page = this.contactsPage();
						if (page > Math.max(1, Math.ceil((this.contactsCount() - count) / CONTACTS_PER_PAGE))) {
							this.contactsPage(page - 1);
						}
//						contacts.forEach(contact => ContactUserStore.remove(contact));
					}
					this.reloadContactList();
				}, {
					uids: uids.join(',')
				}
			);
		}
	}

	newMessageCommand() {
		let aE = [],
			recipients = {to:null,cc:null,bcc:null};

		this.contactsCheckedOrSelected().forEach(oContact => {
			if (oContact) {
				let name = (oContact.givenName() + ' ' + oContact.surName()).trim(),
					email,
					addresses = oContact.email();
				if (!oContact.sendToAll()) {
					addresses = addresses.slice(0,1);
				}
				addresses.forEach(address => {
					email = new EmailModel(address.value(), name);
					email.valid() && aE.push(email);
				});
/*
		//		oContact.jCard.getOne('fn')?.notEmpty() ||
				oContact.jCard.parseFullName({set:true});
		//		let name = oContact.jCard.getOne('nickname'),
				let name = oContact.jCard.getOne('fn'),
					email = [oContact.jCard.getOne('email')];
*/
			}
		});

		if (arrayLength(aE)) {
			bOpenCompose = false;
			this.close();
			recipients[sComposeRecipientsField] = aE;
			showMessageComposer([ComposeType.Empty, null, recipients.to, recipients.cc, recipients.bcc])
		}
	}

	clearSearch() {
		this.search('');
	}

	saveCommand() {
		this.saveContact(this.contact());
	}

	saveContact(contact) {
		const data = contact.toJSON();
		if (data.jCard != JSON.stringify(contact.jCard)) {
			this.isSaving(true);
			Remote.request('ContactSave',
				(iError, oData) => {
					if (iError) {
						alert(oData?.ErrorMessage || getNotification(iError));
					} else if (oData.Result.ResultID) {
						if (contact.id()) {
							contact.id(oData.Result.ResultID);
							contact.jCard = JSON.parse(data.jCard);
						} else {
							this.reloadContactList(); // TODO: remove when e-contact-foreach is dynamic
						}
					}
					this.isSaving(false);
				}, data
			);
		}
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

	/**
	 * @param {?ContactModel} contact
	 */
	populateViewContact(contact) {
		const oldContact = this.contact(),
			fn = () => this.contact(contact);
		if (oldContact?.hasChanges()) {
			AskPopupView.showModal([
				i18n('GLOBAL/SAVE_CHANGES'),
				() => this.saveContact(oldContact) | fn(),
				fn
			]);
		} else fn();
	}

	/**
	 * @param {boolean=} dropPagePosition = false
	 */
	reloadContactList(dropPagePosition = false) {
		let offset = (this.contactsPage() - 1) * CONTACTS_PER_PAGE;

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
				}

				this.contactsCount(0 < count ? count : 0);

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
			if (el && (el = pInt(ko.dataFor(el)?.value))) {
				self.contactsPage(el);
				self.reloadContactList();
			}
		});

		// initUploader

		if (this.importButton()) {
			const j = new Jua({
				action: serverRequest('UploadContacts'),
				limit: 1,
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

	tryToClose() {
		(false === this.onClose()) || this.close();
	}

	onClose() {
		const contact = this.contact();
		if (AskPopupView.hidden() && contact?.hasChanges()) {
			AskPopupView.showModal([
				i18n('GLOBAL/SAVE_CHANGES'),
				() => this.close() | this.saveContact(contact),
				() => this.close()
			]);
			return false;
		}
	}

	onShow(bBackToCompose, sRecipientsField) {
		bOpenCompose = !!bBackToCompose;
		sComposeRecipientsField = ['to','cc','bcc'].includes(sRecipientsField) ? sRecipientsField : 'to';
		this.reloadContactList(true);
	}

	onHide() {
		this.contact(null);
		this.selectorContact(null);
		this.search('');
		this.contactsCount(0);

		ContactUserStore([]);

		bOpenCompose && showMessageComposer();
	}
}
