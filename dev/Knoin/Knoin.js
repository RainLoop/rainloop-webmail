import _ from '_';
import $ from '$';
import ko from 'ko';
import hasher from 'hasher';
import crossroads from 'crossroads';

import { Magics } from 'Common/Enums';
import { runHook } from 'Common/Plugins';
import { $html, VIEW_MODELS, popupVisibilityNames } from 'Common/Globals';

import { isArray, isUnd, pString, log, isFunc, createCommandLegacy, delegateRun, isNonEmptyArray } from 'Common/Utils';

let currentScreen = null,
	defaultScreenName = '';

const SCREENS = {};

export const ViewType = {
	Popup: 'Popups',
	Left: 'Left',
	Right: 'Right',
	Center: 'Center'
};

/**
 * @returns {void}
 */
export function hideLoading() {
	$('#rl-content').addClass('rl-content-show');
	$('#rl-loading')
		.hide()
		.remove();
}

/**
 * @param {Function} fExecute
 * @param {(Function|boolean|null)=} fCanExecute = true
 * @returns {Function}
 */
export function createCommand(fExecute, fCanExecute = true) {
	return createCommandLegacy(null, fExecute, fCanExecute);
}

/**
 * @param {Function} SettingsViewModelClass
 * @param {string} template
 * @param {string} labelName
 * @param {string} route
 * @param {boolean=} isDefault = false
 * @returns {void}
 */
export function addSettingsViewModel(SettingsViewModelClass, template, labelName, route, isDefault = false) {
	SettingsViewModelClass.__rlSettingsData = {
		Label: labelName,
		Template: template,
		Route: route,
		IsDefault: !!isDefault
	};

	VIEW_MODELS.settings.push(SettingsViewModelClass);
}

/**
 * @param {Function} SettingsViewModelClass
 * @returns {void}
 */
export function removeSettingsViewModel(SettingsViewModelClass) {
	VIEW_MODELS['settings-removed'].push(SettingsViewModelClass);
}

/**
 * @param {Function} SettingsViewModelClass
 * @returns {void}
 */
export function disableSettingsViewModel(SettingsViewModelClass) {
	VIEW_MODELS['settings-disabled'].push(SettingsViewModelClass);
}

/**
 * @returns {void}
 */
export function routeOff() {
	hasher.changed.active = false;
}

/**
 * @returns {void}
 */
export function routeOn() {
	hasher.changed.active = true;
}

/**
 * @param {string} screenName
 * @returns {?Object}
 */
export function screen(screenName) {
	return '' !== screenName && !isUnd(SCREENS[screenName]) ? SCREENS[screenName] : null;
}

/**
 * @param {Function} ViewModelClassToShow
 * @returns {Function|null}
 */
export function getScreenPopup(PopuViewModelClass) {
	let result = null;
	if (PopuViewModelClass) {
		result = PopuViewModelClass;
		if (PopuViewModelClass.default) {
			result = PopuViewModelClass.default;
		}
	}

	return result;
}

/**
 * @param {Function} ViewModelClassToHide
 * @returns {void}
 */
export function hideScreenPopup(ViewModelClassToHide) {
	const ModalView = getScreenPopup(ViewModelClassToHide);
	if (ModalView && ModalView.__vm && ModalView.__dom) {
		ModalView.__vm.modalVisibility(false);
	}
}

/**
 * @param {string} hookName
 * @param {Function} ViewModelClass
 * @param {mixed=} params = null
 */
export function vmRunHook(hookName, ViewModelClass, params = null) {
	_.each(ViewModelClass.__names, (name) => {
		runHook(hookName, [name, ViewModelClass.__vm, params]);
	});
}

/**
 * @param {Function} ViewModelClass
 * @param {Object=} vmScreen
 * @returns {*}
 */
export function buildViewModel(ViewModelClass, vmScreen) {
	if (ViewModelClass && !ViewModelClass.__builded) {
		let vmDom = null;
		const vm = new ViewModelClass(vmScreen),
			position = ViewModelClass.__type || '',
			vmPlace = position ? $('#rl-content #rl-' + position.toLowerCase()) : null;

		ViewModelClass.__builded = true;
		ViewModelClass.__vm = vm;

		vm.onShowTrigger = ko.observable(false);
		vm.onHideTrigger = ko.observable(false);

		vm.viewModelName = ViewModelClass.__name;
		vm.viewModelNames = ViewModelClass.__names;
		vm.viewModelTemplateID = ViewModelClass.__templateID;
		vm.viewModelPosition = ViewModelClass.__type;

		if (vmPlace && 1 === vmPlace.length) {
			vmDom = $('<div></div>')
				.addClass('rl-view-model')
				.addClass('RL-' + vm.viewModelTemplateID)
				.hide();
			vmDom.appendTo(vmPlace);

			vm.viewModelDom = vmDom;
			ViewModelClass.__dom = vmDom;

			if (ViewType.Popup === position) {
				vm.cancelCommand = vm.closeCommand = createCommand(() => {
					hideScreenPopup(ViewModelClass);
				});

				vm.modalVisibility.subscribe((value) => {
					if (value) {
						vm.viewModelDom.show();
						vm.storeAndSetKeyScope();

						popupVisibilityNames.push(vm.viewModelName);
						vm.viewModelDom.css('z-index', 3000 + popupVisibilityNames().length + 10);

						if (vm.onShowTrigger) {
							vm.onShowTrigger(!vm.onShowTrigger());
						}

						delegateRun(vm, 'onShowWithDelay', [], 500);
					} else {
						delegateRun(vm, 'onHide');
						delegateRun(vm, 'onHideWithDelay', [], 500);

						if (vm.onHideTrigger) {
							vm.onHideTrigger(!vm.onHideTrigger());
						}

						vm.restoreKeyScope();

						vmRunHook('view-model-on-hide', ViewModelClass);

						popupVisibilityNames.remove(vm.viewModelName);
						vm.viewModelDom.css('z-index', 2000);

						_.delay(() => vm.viewModelDom.hide(), 300);
					}
				});
			}

			vmRunHook('view-model-pre-build', ViewModelClass, vmDom);

			ko.applyBindingAccessorsToNode(
				vmDom[0],
				{
					translatorInit: true,
					template: () => ({ name: vm.viewModelTemplateID })
				},
				vm
			);

			delegateRun(vm, 'onBuild', [vmDom]);
			if (vm && ViewType.Popup === position) {
				vm.registerPopupKeyDown();
			}

			vmRunHook('view-model-post-build', ViewModelClass, vmDom);
		} else {
			log('Cannot find view model position: ' + position);
		}
	}

	return ViewModelClass ? ViewModelClass.__vm : null;
}

/**
 * @param {Function} ViewModelClassToShow
 * @param {Array=} params
 * @returns {void}
 */
export function showScreenPopup(ViewModelClassToShow, params = []) {
	const ModalView = getScreenPopup(ViewModelClassToShow);
	if (ModalView) {
		buildViewModel(ModalView);

		if (ModalView.__vm && ModalView.__dom) {
			delegateRun(ModalView.__vm, 'onBeforeShow', params || []);

			ModalView.__vm.modalVisibility(true);

			delegateRun(ModalView.__vm, 'onShow', params || []);

			vmRunHook('view-model-on-show', ModalView, params || []);
		}
	}
}

/**
 * @param {Function} ViewModelClassToShow
 * @returns {void}
 */
export function warmUpScreenPopup(ViewModelClassToShow) {
	const ModalView = getScreenPopup(ViewModelClassToShow);
	if (ModalView) {
		buildViewModel(ModalView);

		if (ModalView.__vm && ModalView.__dom) {
			delegateRun(ModalView.__vm, 'onWarmUp');
		}
	}
}

/**
 * @param {Function} ViewModelClassToShow
 * @returns {boolean}
 */
export function isPopupVisible(ViewModelClassToShow) {
	const ModalView = getScreenPopup(ViewModelClassToShow);
	return ModalView && ModalView.__vm ? ModalView.__vm.modalVisibility() : false;
}

/**
 * @param {string} screenName
 * @param {string} subPart
 * @returns {void}
 */
export function screenOnRoute(screenName, subPart) {
	let vmScreen = null,
		isSameScreen = false,
		cross = null;

	if ('' === pString(screenName)) {
		screenName = defaultScreenName;
	}

	if ('' !== screenName) {
		vmScreen = screen(screenName);
		if (!vmScreen) {
			vmScreen = screen(defaultScreenName);
			if (vmScreen) {
				subPart = screenName + '/' + subPart;
				screenName = defaultScreenName;
			}
		}

		if (vmScreen && vmScreen.__started) {
			isSameScreen = currentScreen && vmScreen === currentScreen;

			if (!vmScreen.__builded) {
				vmScreen.__builded = true;

				if (isNonEmptyArray(vmScreen.viewModels())) {
					_.each(vmScreen.viewModels(), (ViewModelClass) => {
						buildViewModel(ViewModelClass, vmScreen);
					});
				}

				delegateRun(vmScreen, 'onBuild');
			}

			_.defer(() => {
				// hide screen
				if (currentScreen && !isSameScreen) {
					delegateRun(currentScreen, 'onHide');
					delegateRun(currentScreen, 'onHideWithDelay', [], 500);

					if (currentScreen.onHideTrigger) {
						currentScreen.onHideTrigger(!currentScreen.onHideTrigger());
					}

					if (isNonEmptyArray(currentScreen.viewModels())) {
						_.each(currentScreen.viewModels(), (ViewModelClass) => {
							if (
								ViewModelClass.__vm &&
								ViewModelClass.__dom &&
								ViewType.Popup !== ViewModelClass.__vm.viewModelPosition
							) {
								ViewModelClass.__dom.hide();
								ViewModelClass.__vm.viewModelVisibility(false);

								delegateRun(ViewModelClass.__vm, 'onHide');
								delegateRun(ViewModelClass.__vm, 'onHideWithDelay', [], 500);

								if (ViewModelClass.__vm.onHideTrigger) {
									ViewModelClass.__vm.onHideTrigger(!ViewModelClass.__vm.onHideTrigger());
								}
							}
						});
					}
				}
				// --

				currentScreen = vmScreen;

				// show screen
				if (currentScreen && !isSameScreen) {
					delegateRun(currentScreen, 'onShow');
					if (currentScreen.onShowTrigger) {
						currentScreen.onShowTrigger(!currentScreen.onShowTrigger());
					}

					runHook('screen-on-show', [currentScreen.screenName(), currentScreen]);

					if (isNonEmptyArray(currentScreen.viewModels())) {
						_.each(currentScreen.viewModels(), (ViewModelClass) => {
							if (
								ViewModelClass.__vm &&
								ViewModelClass.__dom &&
								ViewType.Popup !== ViewModelClass.__vm.viewModelPosition
							) {
								delegateRun(ViewModelClass.__vm, 'onBeforeShow');

								ViewModelClass.__dom.show();
								ViewModelClass.__vm.viewModelVisibility(true);

								delegateRun(ViewModelClass.__vm, 'onShow');
								if (ViewModelClass.__vm.onShowTrigger) {
									ViewModelClass.__vm.onShowTrigger(!ViewModelClass.__vm.onShowTrigger());
								}

								delegateRun(ViewModelClass.__vm, 'onShowWithDelay', [], 200);
								vmRunHook('view-model-on-show', ViewModelClass);
							}
						});
					}
				}
				// --

				cross = vmScreen && vmScreen.__cross ? vmScreen.__cross() : null;
				if (cross) {
					cross.parse(subPart);
				}
			});
		}
	}
}

/**
 * @param {Array} screensClasses
 * @returns {void}
 */
export function startScreens(screensClasses) {
	_.each(screensClasses, (CScreen) => {
		if (CScreen) {
			const vmScreen = new CScreen(),
				screenName = vmScreen ? vmScreen.screenName() : '';

			if (vmScreen && '' !== screenName) {
				if ('' === defaultScreenName) {
					defaultScreenName = screenName;
				}

				SCREENS[screenName] = vmScreen;
			}
		}
	});

	_.each(SCREENS, (vmScreen) => {
		if (vmScreen && !vmScreen.__started && vmScreen.__start) {
			vmScreen.__started = true;
			vmScreen.__start();

			runHook('screen-pre-start', [vmScreen.screenName(), vmScreen]);
			delegateRun(vmScreen, 'onStart');
			runHook('screen-post-start', [vmScreen.screenName(), vmScreen]);
		}
	});

	const cross = crossroads.create();
	cross.addRoute(/^([a-zA-Z0-9-]*)\/?(.*)$/, screenOnRoute);

	hasher.initialized.add(cross.parse, cross);
	hasher.changed.add(cross.parse, cross);
	hasher.init();

	_.delay(() => $html.removeClass('rl-started-trigger').addClass('rl-started'), 100);
	_.delay(() => $html.addClass('rl-started-delay'), 200);
}

/**
 * @param {string} sHash
 * @param {boolean=} silence = false
 * @param {boolean=} replace = false
 * @returns {void}
 */
export function setHash(hash, silence = false, replace = false) {
	hash = '#' === hash.substr(0, 1) ? hash.substr(1) : hash;
	hash = '/' === hash.substr(0, 1) ? hash.substr(1) : hash;

	const cmd = replace ? 'replaceHash' : 'setHash';

	if (silence) {
		hasher.changed.active = false;
		hasher[cmd](hash);
		hasher.changed.active = true;
	} else {
		hasher.changed.active = true;
		hasher[cmd](hash);
		hasher.setHash(hash);
	}
}

/**
 * @param {Object} params
 * @returns {Function}
 */
function viewDecorator({ name, type, templateID }) {
	return (target) => {
		if (target) {
			if (name) {
				if (isArray(name)) {
					target.__names = name;
				} else {
					target.__names = [name];
				}

				target.__name = target.__names[0];
			}

			if (type) {
				target.__type = type;
			}

			if (templateID) {
				target.__templateID = templateID;
			}
		}
	};
}

/**
 * @param {Object} params
 * @returns {Function}
 */
function popupDecorator({ name, templateID }) {
	return viewDecorator({ name, type: ViewType.Popup, templateID });
}

/**
 * @param {Function} canExecute
 * @returns {Function}
 */
function commandDecorator(canExecute = true) {
	return (target, key, descriptor) => {
		if (!key || !key.match(/Command$/)) {
			throw new Error(`name "${key}" should end with Command suffix`);
		}

		const value = descriptor.value || descriptor.initializer(),
			normCanExecute = isFunc(canExecute) ? canExecute : () => !!canExecute;

		descriptor.value = function(...args) {
			if (normCanExecute.call(this, this)) {
				value.apply(this, args);
			}

			return false;
		};

		descriptor.value.__realCanExecute = normCanExecute;
		descriptor.value.isCommand = true;

		return descriptor;
	};
}

/**
 * @param {miced} $items
 * @returns {Function}
 */
function settingsMenuKeysHandler($items) {
	return _.throttle((event, handler) => {
		const up = handler && 'up' === handler.shortcut;

		if (event && $items.length) {
			let index = $items.index($items.filter('.selected'));
			if (up && 0 < index) {
				index -= 1;
			} else if (!up && index < $items.length - 1) {
				index += 1;
			}

			const resultHash = $items.eq(index).attr('href');
			if (resultHash) {
				setHash(resultHash, false, true);
			}
		}
	}, Magics.Time200ms);
}

export {
	commandDecorator,
	commandDecorator as command,
	viewDecorator,
	viewDecorator as view,
	viewDecorator as viewModel,
	popupDecorator,
	popupDecorator as popup,
	settingsMenuKeysHandler
};
