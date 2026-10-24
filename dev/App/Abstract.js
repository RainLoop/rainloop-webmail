import ko from 'ko';

import { logoutLink } from 'Common/Links';
import { i18nToNodes, initOnStartOrLangChange } from 'Common/Translator';

import { arePopupsVisible } from 'Knoin/Knoin';

import { LanguageStore } from 'Stores/Language';
import { initThemes } from 'Stores/Theme';

import { SelectComponent } from 'Component/Select';
import { CheckboxComponent } from 'Component/Checkbox';

export class AbstractApp {
	/**
	 * @param {RemoteStorage|AdminRemoteStorage} Remote
	 */
	constructor(Remote) {
		this.Remote = Remote;
	}

	logoutReload(url) {
		arePopupsVisible(false);
		url = url || logoutLink();
		if (location.href !== url) {
			setTimeout(() => location.href = url, 100);
		} else {
			rl.route.reload();
		}
		// this does not work due to ViewModelClass.__builded = true;
//		rl.settings.set('Auth', false);
//		rl.app.start();
	}

	bootstart() {
		const register = (name, ClassObject) => ko.components.register(name, {
				template: { element: ClassObject.name },
				viewModel: {
					createViewModel: (params, componentInfo) => {
						params = params || {};
						i18nToNodes(componentInfo.element);
						return new ClassObject(params);
					}
				}
			});
		register('Select', SelectComponent);
		register('Checkbox', CheckboxComponent);

		initOnStartOrLangChange();

		LanguageStore.populate();
		initThemes();

		this.start();
	}
}
