import ko from 'ko';

import { i18n } from 'Common/Translator';

import { TemplateUserStore } from 'Stores/User/Template';
import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { TemplatePopupView } from 'View/Popup/Template';
import { addComputablesTo } from 'Common/Utils';

export class TemplatesUserSettings {
	constructor() {
		this.templates = TemplateUserStore.templates;

		addComputablesTo({
			processText: () => TemplateUserStore.templates.loading() ? i18n('SETTINGS_TEMPLETS/LOADING_PROCESS') : '',

			visibility: () => this.processText() ? 'visible' : 'hidden'
		});

		this.templateForDeletion = ko.observable(null).deleteAccessHelper();
	}

	addNewTemplate() {
		showScreenPopup(TemplatePopupView);
	}

	editTemplate(oTemplateItem) {
		if (oTemplateItem) {
			showScreenPopup(TemplatePopupView, [oTemplateItem]);
		}
	}

	deleteTemplate(templateToRemove) {
		if (templateToRemove && templateToRemove.deleteAccess()) {
			this.templateForDeletion(null);

			if (templateToRemove) {
				this.templates.remove((template) => templateToRemove === template);

				Remote.templateDelete(() => {
					this.reloadTemplates();
				}, templateToRemove.id);
			}
		}
	}

	reloadTemplates() {
		rl.app.templates();
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			const el = event.target.closestWithin('.templates-list .template-item .e-action', oDom);
			el && ko.dataFor(el) && this.editTemplate(ko.dataFor(el));
		});

		this.reloadTemplates();
	}
}
