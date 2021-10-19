import ko from 'ko';

import { pString } from 'Common/Utils';
import { settings } from 'Common/Links';
import { doc, elementById } from 'Common/Globals';

import { AbstractScreen } from 'Knoin/AbstractScreen';

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
			if (RoutedSettingsViewModel.__builded && RoutedSettingsViewModel.__vm) {
				settingsScreen = RoutedSettingsViewModel.__vm;
			} else {
				const vmPlace = elementById('rl-settings-subscreen');
				if (vmPlace) {
					settingsScreen = new RoutedSettingsViewModel();

					viewModelDom = Element.fromHTML('<div hidden=""></div>');
					vmPlace.append(viewModelDom);

					settingsScreen.viewModelDom = viewModelDom;

					RoutedSettingsViewModel.__dom = viewModelDom;
					RoutedSettingsViewModel.__builded = true;
					RoutedSettingsViewModel.__vm = settingsScreen;

					ko.applyBindingAccessorsToNode(
						viewModelDom,
						{
							i18nInit: true,
							template: () => ({ name: RoutedSettingsViewModel.__rlSettingsData.template })
						},
						settingsScreen
					);

					settingsScreen.onBuild && settingsScreen.onBuild(viewModelDom);
				} else {
					console.log('Cannot find sub settings view model position: SettingsSubScreen');
				}
			}

			if (settingsScreen) {
				setTimeout(() => {
					// hide
					this.onHide();
					// --

					this.oCurrentSubScreen = settingsScreen;

					// show
					settingsScreen.onBeforeShow && settingsScreen.onBeforeShow();
					settingsScreen.viewModelDom.hidden = false;
					settingsScreen.onShow && settingsScreen.onShow();

					this.menu.forEach(item => {
						item.selected(
							item.route === RoutedSettingsViewModel.__rlSettingsData.route
						);
					});

					doc.querySelector('#rl-content .b-settings .b-content').scrollTop = 0;
					// --
				}, 1);
			}
		} else {
			rl.route.setHash(settings(), false, true);
		}
	}

	onHide() {
		let subScreen = this.oCurrentSubScreen;
		if (subScreen) {
			subScreen.onHide && subScreen.onHide();
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
	SettingsViewModelClass.__rlSettingsData = {
		label: labelName,
		route: route,
		selected: ko.observable(false),
		template: template,
		isDefault: !!isDefault
	};

	VIEW_MODELS.push(SettingsViewModelClass);
}
