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
				SettingsViewModel => subName === SettingsViewModel.__rlSettingsData.route
			);

		if (RoutedSettingsViewModel) {
//			const vmPlace = elementById('V-SettingsPane') || elementById('V-AdminPane);
			const vmPlace = this.viewModels[1].__dom;
			if (RoutedSettingsViewModel.__vm) {
				settingsScreen = RoutedSettingsViewModel.__vm;
			} else if (vmPlace) {
				viewModelDom = createElement('div',{
					id: 'V-Settings-' + RoutedSettingsViewModel.name.replace(/(User|Admin)Settings/,''),
					hidden: ''
				})
				vmPlace.append(viewModelDom);

				settingsScreen = new RoutedSettingsViewModel();
				settingsScreen.viewModelDom = viewModelDom;

				RoutedSettingsViewModel.__dom = viewModelDom;
				RoutedSettingsViewModel.__vm = settingsScreen;

				ko.applyBindingAccessorsToNode(
					viewModelDom,
					{
						template: () => ({ name: RoutedSettingsViewModel.__rlSettingsData.template })
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
					i18nToNodes(settingsScreen.viewModelDom);
					settingsScreen.viewModelDom.hidden = false;
					settingsScreen.onShow?.();

					this.menu.forEach(item => {
						item.selected(
							item.route === RoutedSettingsViewModel.__rlSettingsData.route
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
			subScreen.viewModelDom.hidden = true;
		}
	}

	onBuild() {
		VIEW_MODELS.forEach(SettingsViewModel => this.menu.push(SettingsViewModel.__rlSettingsData));
	}

	routes() {
		const DefaultViewModel = VIEW_MODELS.find(
				SettingsViewModel => SettingsViewModel.__rlSettingsData.isDefault
			),
			defaultRoute =
				DefaultViewModel ? DefaultViewModel.__rlSettingsData.route : 'general',
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
	SettingsViewModelClass.__rlSettingsData = {
		label: labelName || 'SETTINGS_LABELS/' + name.toUpperCase(),
		route: route || name.toLowerCase(),
		selected: ko.observable(false),
		template: template || SettingsViewModelClass.name,
		isDefault: !!isDefault
	};

	VIEW_MODELS.push(SettingsViewModelClass);
}
