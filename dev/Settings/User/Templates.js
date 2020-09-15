import ko from 'ko';

import { i18n } from 'Common/Translator';

import TemplateStore from 'Stores/User/Template';
import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

class TemplatesUserSettings {
	constructor() {
		this.templates = TemplateStore.templates;

		this.processText = ko.computed(() =>
			TemplateStore.templates.loading() ? i18n('SETTINGS_TEMPLETS/LOADING_PROCESS') : ''
		);
		this.visibility = ko.computed(() => this.processText() ? 'visible' : 'hidden');

		this.templateForDeletion = ko.observable(null).deleteAccessHelper();
	}

	scrollableOptions(sWrapper) {
		return {
			handle: '.drag-handle',
			containment: sWrapper || 'parent',
			axis: 'y'
		};
	}

	addNewTemplate() {
		showScreenPopup(require('View/Popup/Template'));
	}

	editTemplate(oTemplateItem) {
		if (oTemplateItem) {
			showScreenPopup(require('View/Popup/Template'), [oTemplateItem]);
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

export { TemplatesUserSettings, TemplatesUserSettings as default };
