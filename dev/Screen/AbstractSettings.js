import ko from 'ko';

import { pString } from 'Common/Utils';
import { settings } from 'Common/Links';
import { createElement/*, elementById*/ } from 'Common/Globals';

import { AbstractScreen } from 'Knoin/AbstractScreen';
import { i18nToNodes } from 'Common/Translator';

const VIEW_MODELS = [];

export class AbstractSettingsScreen extends AbstractScreen {
	/**
	 * @param {Array} viewModels
	 */
	constructor(viewModels) {
		super('settings', viewModels);

		this.menu = ko.observableArray();

		this.oCurrentSubScreen = null;
	}

	onRoute(subName) {
		let settingsScreen = null,
			viewModelDom = null,
			RoutedSettingsViewModel = VIEW_MODELS.find(
				SettingsViewModel => subName === SettingsViewModel.route
			);

		if (RoutedSettingsViewModel) {
//			const vmPlace = elementById('V-SettingsPane') || elementById('V-AdminPane);
			const vmPlace = this.viewModels[1].__dom,
				SettingsViewModelClass = RoutedSettingsViewModel.vmc;
			if (SettingsViewModelClass.__vm) {
				settingsScreen = SettingsViewModelClass.__vm;
				viewModelDom = settingsScreen.viewModelDom;
			} else if (vmPlace) {
				viewModelDom = createElement('div',{
					id: 'V-Settings-' + SettingsViewModelClass.name.replace(/(User|Admin)Settings/,''),
					hidden: ''
				})
				vmPlace.append(viewModelDom);

				settingsScreen = new SettingsViewModelClass();
				settingsScreen.viewModelDom = viewModelDom;

				SettingsViewModelClass.__dom = viewModelDom;
				SettingsViewModelClass.__vm = settingsScreen;

				ko.applyBindingAccessorsToNode(
					viewModelDom,
					{
						template: () => ({ name: RoutedSettingsViewModel.template })
					},
					settingsScreen
				);

				settingsScreen.onBuild?.(viewModelDom);
			} else {
				console.log('Cannot find sub settings view model position: SettingsSubScreen');
			}

			if (settingsScreen) {
				setTimeout(() => {
					// hide
					this.onHide();
					// --

					this.oCurrentSubScreen = settingsScreen;

					// show
					settingsScreen.beforeShow?.();
					i18nToNodes(viewModelDom);
					viewModelDom.hidden = false;
					settingsScreen.onShow?.();

					this.menu.forEach(item => {
						item.selected(
							item.route === RoutedSettingsViewModel.route
						);
					});

					(vmPlace || {}).scrollTop = 0;
					// --
				}, 1);
			}
		} else {
			hasher.replaceHash(settings());
		}
	}

	onHide() {
		let subScreen = this.oCurrentSubScreen;
		if (subScreen) {
			subScreen.onHide?.();
			subScreen.
			.hidden = true;
		}
	}

	onBuild() {
		// TODO: issue on account switch
		// When current domain has sieve but the new has not, or current has not and the new has
		// SettingsViewModel.disabled() || this.menu.push()
		VIEW_MODELS.forEach(SettingsViewModel => this.menu.push(SettingsViewModel));
	}

	routes() {
		const DefaultViewModel = VIEW_MODELS.find(
				SettingsViewModel => SettingsViewModel.isDefault
			),
			defaultRoute = DefaultViewModel?.route || 'general',
			rules = {
				subname: /^(.*)$/,
				normalize_: (rquest, vals) => {
					vals.subname = null == vals.subname ? defaultRoute : pString(vals.subname);
					return [vals.subname];
				}
			};

		return [
			['{subname}/', rules],
			['{subname}', rules],
			['', rules]
		];
	}
}

/**
 * @param {Function} SettingsViewModelClass
 * @param {string} template
 * @param {string} labelName
 * @param {string} route
 * @param {boolean=} isDefault = false
 * @returns {void}
 */
export function settingsAddViewModel(SettingsViewModelClass, template, labelName, route, isDefault = false) {
	let name = SettingsViewModelClass.name.replace(/(User|Admin)Settings/, '');
	VIEW_MODELS.push({
		vmc: SettingsViewModelClass,
		label: labelName || 'SETTINGS_LABELS/' + name.toUpperCase(),
		route: route || name.toLowerCase(),
		selected: ko.observable(false),
		template: template || SettingsViewModelClass.name,
		isDefault: !!isDefault
	});
}
