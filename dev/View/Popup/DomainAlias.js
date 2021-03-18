import ko from 'ko';

import { getNotification } from 'Common/Translator';

import { DomainAdminStore } from 'Stores/Admin/Domain';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class DomainAliasPopupView extends AbstractViewPopup {
	constructor() {
		super('DomainAlias');

		this.addObservables({
			saving: false,
			savingError: '',

			name: '',

			alias: ''
		});

		this.domains = ko.computed(() => DomainAdminStore.filter(item => item && !item.alias));

		this.domainsOptions = ko.computed(() => this.domains().map(item => ({ optValue: item.name, optText: item.name })));

		this.canBeSaved = ko.computed(() => !this.saving() && this.name() && this.alias());

		decorateKoCommands(this, {
			createCommand: self => self.canBeSaved()
		});
	}

	createCommand() {
		this.saving(true);
		Remote.createDomainAlias(iError => {
			this.saving(false);
			if (iError) {
				this.savingError(getNotification(iError));
			} else {
				DomainAdminStore.fetch();
				this.closeCommand();
			}
		}, this.name(), this.alias());
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
