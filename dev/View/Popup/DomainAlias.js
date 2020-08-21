import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { i18n } from 'Common/Translator';

import DomainStore from 'Stores/Admin/Domain';

import Remote from 'Remote/Admin/Ajax';

import { getApp } from 'Helper/Apps/Admin';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/DomainAlias',
	templateID: 'PopupsDomainAlias'
})
class DomainAliasPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.saving = ko.observable(false);
		this.savingError = ko.observable('');

		this.name = ko.observable('');

		this.alias = ko.observable('');

		this.domains = DomainStore.domainsWithoutAliases;

		this.domainsOptions = ko.computed(() =>
			this.domains().map(item => ({ optValue: item.name, optText: item.name }))
		);

		this.canBeSaved = ko.computed(() => !this.saving() && this.name() && this.alias());

		this.onDomainAliasCreateOrSaveResponse = this.onDomainAliasCreateOrSaveResponse.bind(this);
	}

	@command((self) => self.canBeSaved())
	createCommand() {
		this.saving(true);
		Remote.createDomainAlias(this.onDomainAliasCreateOrSaveResponse, this.name(), this.alias());
	}

	onDomainAliasCreateOrSaveResponse(result, data) {
		this.saving(false);
		if (StorageResultType.Success === result && data) {
			if (data.Result) {
				getApp().reloadDomainList();
				this.closeCommand();
			} else if (Notification.DomainAlreadyExists === data.ErrorCode) {
				this.savingError(i18n('ERRORS/DOMAIN_ALREADY_EXISTS'));
			}
		} else {
			this.savingError(i18n('ERRORS/UNKNOWN_ERROR'));
		}
	}

	onShow() {
		this.clearForm();
	}

	clearForm() {
		this.saving(false);
		this.savingError('');

		this.name('');

		this.alias('');
	}
}

export { DomainAliasPopupView, DomainAliasPopupView as default };
