import _ from '_';
import ko from 'ko';
import key from 'key';

import { KeyState, Magics, StorageResultType, Notification } from 'Common/Enums';
import { isNonEmptyArray, delegateRun } from 'Common/Utils';
import { getNotification, i18n } from 'Common/Translator';

import Remote from 'Remote/Admin/Ajax';

import { popup, command, isPopupVisible, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Plugin',
	templateID: 'PopupsPlugin'
})
class PluginPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.onPluginSettingsUpdateResponse = _.bind(this.onPluginSettingsUpdateResponse, this);

		this.saveError = ko.observable('');

		this.name = ko.observable('');
		this.readme = ko.observable('');

		this.configures = ko.observableArray([]);

		this.hasReadme = ko.computed(() => '' !== this.readme());
		this.hasConfiguration = ko.computed(() => 0 < this.configures().length);

		this.readmePopoverConf = {
			'placement': 'right',
			'trigger': 'hover',
			'title': i18n('POPUPS_PLUGIN/TOOLTIP_ABOUT_TITLE'),
			'container': 'body',
			'html': true,
			'content': () => `<pre>${this.readme()}</pre>`
		};

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = KeyState.All;

		this.tryToClosePopup = _.debounce(_.bind(this.tryToClosePopup, this), Magics.Time200ms);
	}

	@command((self) => self.hasConfiguration())
	saveCommand() {
		const list = {};
		list.Name = this.name();

		_.each(this.configures(), (oItem) => {
			let value = oItem.value();
			if (false === value || true === value) {
				value = value ? '1' : '0';
			}
			list['_' + oItem.Name] = value;
		});

		this.saveError('');
		Remote.pluginSettingsUpdate(this.onPluginSettingsUpdateResponse, list);
	}

	onPluginSettingsUpdateResponse(result, data) {
		if (StorageResultType.Success === result && data && data.Result) {
			this.cancelCommand();
		} else {
			this.saveError('');
			if (data && data.ErrorCode) {
				this.saveError(getNotification(data.ErrorCode));
			} else {
				this.saveError(getNotification(Notification.CantSavePluginSettings));
			}
		}
	}

	onShow(oPlugin) {
		this.name();
		this.readme();
		this.configures([]);

		if (oPlugin) {
			this.name(oPlugin.Name);
			this.readme(oPlugin.Readme);

			const config = oPlugin.Config;
			if (isNonEmptyArray(config)) {
				this.configures(
					_.map(config, (item) => ({
						'value': ko.observable(item[0]),
						'placeholder': ko.observable(item[6]),
						'Name': item[1],
						'Type': item[2],
						'Label': item[3],
						'Default': item[4],
						'Desc': item[5]
					}))
				);
			}
		}
	}

	tryToClosePopup() {
		const PopupsAskViewModel = require('View/Popup/Ask');
		if (!isPopupVisible(PopupsAskViewModel)) {
			showScreenPopup(PopupsAskViewModel, [
				i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'),
				() => {
					if (this.modalVisibility()) {
						delegateRun(this, 'cancelCommand');
					}
				}
			]);
		}
	}

	onBuild() {
		key('esc', KeyState.All, () => {
			if (this.modalVisibility()) {
				this.tryToClosePopup();
			}

			return false;
		});
	}
}

export { PluginPopupView, PluginPopupView as default };
