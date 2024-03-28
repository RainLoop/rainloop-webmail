import { getNotification } from 'Common/Translator';
import { addObservablesTo, addComputablesTo } from 'External/ko';

import { DomainAdminStore } from 'Stores/Admin/Domain';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class DomainAliasPopupView extends AbstractViewPopup {
	constructor() {
		super('DomainAlias');

		addObservablesTo(this, {
			saving: false,
			savingError: '',

			name: '',

			alias: ''
		});

		addComputablesTo(this, {
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
		Remote.request('AdminDomainAliasSave',
			iError => {
				this.saving(false);
				if (iError) {
					this.savingError(getNotification(iError));
				} else {
					DomainAdminStore.fetch();
					this.close();
				}
			}, {
				name: this.name,
				alias: this.alias
			});
	}

	onShow() {
		this.saving(false);
		this.savingError('');
		this.name('');
		this.alias('');
	}
}
