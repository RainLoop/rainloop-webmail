import ko from 'ko';

import { Scope } from 'Common/Enums';
import { getNotification, i18n } from 'Common/Translator';
import { arrayLength } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands, isPopupVisible, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';
import { AskPopupView } from 'View/Popup/Ask';

class PluginPopupView extends AbstractViewPopup {
	constructor() {
		super('Plugin');

		this.addObservables({
			saveError: '',
			id: '',
			name: '',
			readme: ''
		});

		this.configures = ko.observableArray();

		this.addComputables({
			hasReadme: () => !!this.readme(),
			hasConfiguration: () => 0 < this.configures().length
		});

		this.bDisabeCloseOnEsc = true;
		this.keyScope.scope = Scope.All;

		this.tryToClosePopup = this.tryToClosePopup.debounce(200);

		decorateKoCommands(this, {
			saveCommand: self => self.hasConfiguration()
		});
	}

	saveCommand() {
		const list = {
			Id: this.id(),
			Settings: {}
		};

		this.configures.forEach(oItem => {
			let value = oItem.value();
			if (false === value || true === value) {
				value = value ? 1 : 0;
			}
			list.Settings[oItem.Name] = value;
		});

		this.saveError('');
		Remote.pluginSettingsUpdate(iError =>
			iError
				? this.saveError(getNotification(iError))
				: this.cancelCommand()
		, list);
	}

	onShow(oPlugin) {
		this.id('');
		this.name('');
		this.readme('');
		this.configures([]);

		if (oPlugin) {
			this.id(oPlugin.Id);
			this.name(oPlugin.Name);
			this.readme(oPlugin.Readme);

			const config = oPlugin.Config;
			if (arrayLength(config)) {
				this.configures(
					config.map(item => ({
						value: ko.observable(item[0]),
						placeholder: ko.observable(item[6]),
						Name: item[1],
						Type: item[2],
						Label: item[3],
						Default: item[4],
						Desc: item[5]
					}))
				);
			}
		}
	}

	tryToClosePopup() {
		if (!isPopupVisible(AskPopupView)) {
			showScreenPopup(AskPopupView, [
				i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'),
				() => this.modalVisibility() && this.cancelCommand()
			]);
		}
	}

	onBuild() {
		shortcuts.add('escape', '', Scope.All, () => {
			if (this.modalVisibility()) {
				this.tryToClosePopup();
				return false;
			}
		});
	}
}

export { PluginPopupView, PluginPopupView as default };
