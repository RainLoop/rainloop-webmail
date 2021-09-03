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

		this.addComputables({
			domains: () => DomainAdminStore.filter(item => item && !item.alias),

			domainsOptions: () => this.domains().map(item => ({ optValue: item.name, optText: item.name })),

			canBeSaved: () => !this.saving() && this.name() && this.alias()
		});

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
