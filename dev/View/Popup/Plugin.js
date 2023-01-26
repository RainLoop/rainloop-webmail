import ko from 'ko';
import { addObservablesTo, addComputablesTo } from 'External/ko';

import { getNotification, i18n } from 'Common/Translator';
import { arrayLength } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';
import { AskPopupView } from 'View/Popup/Ask';

export class PluginPopupView extends AbstractViewPopup {
	constructor() {
		super('Plugin');

		addObservablesTo(this, {
			saveError: '',
			id: '',
			name: '',
			readme: ''
		});

		this.config = ko.observableArray();

		addComputablesTo(this, {
			hasReadme: () => !!this.readme(),
			hasConfiguration: () => 0 < this.config().length
		});

		this.keyScope.scope = 'all';

		decorateKoCommands(this, {
			saveCommand: self => self.hasConfiguration()
		});
	}

	hideError() {
		this.saveError('');
	}

	saveCommand() {
		const oConfig = {
			id: this.id,
			settings: {}
		},
		setItem = item => {
			let value = item.value();
			if (false === value || true === value) {
				value = value ? 1 : 0;
			}
			oConfig.settings[item.name] = value;
		};

		this.config.forEach(oItem => {
			if (7 == oItem.type) {
				// Group
				oItem.config.forEach(oSubItem => setItem(oSubItem));
			} else {
				setItem(oItem);
			}
		});

		this.saveError('');
		Remote.request('AdminPluginSettingsUpdate',
			iError => iError
				? this.saveError(getNotification(iError))
				: this.close(),
			oConfig);
	}

	onShow(oPlugin) {
		this.id('');
		this.name('');
		this.readme('');
		this.config([]);

		if (oPlugin) {
			this.id(oPlugin.id);
			this.name(oPlugin.name);
			this.readme(oPlugin.readme);

			const config = oPlugin.config;
			if (arrayLength(config)) {
				this.config(
					config.map(item => {
						if (7 == item.type) {
							// Group
							item.config.forEach(subItem => {
								subItem.value = ko.observable(subItem.value);
							});
						} else {
							item.value = ko.observable(item.value);
						}
						return item;
					})
				);
			}
		}
	}

	onClose() {
		if (AskPopupView.hidden()) {
			showScreenPopup(AskPopupView, [
				i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'),
				() => this.close()
			]);
		}
		return false;
	}
}
