import ko from 'ko';

import { $htmlCL, VIEW_MODELS } from 'Common/Globals';

//import { bMobileDevice } from 'Common/Globals';

let currentScreen = null,
	defaultScreenName = '';

const SCREENS = {},
	qs = s => document.querySelector(s),
	isNonEmptyArray = values => Array.isArray(values) && values.length,

	popupVisibilityNames = ko.observableArray([]);

export const popupVisibility = ko.computed(() => 0 < popupVisibilityNames().length);

popupVisibility.subscribe((bValue) => {
	$htmlCL.toggle('rl-modal', bValue);
});

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
	qs('#rl-content').classList.add('rl-content-show');
	qs('#rl-loading').remove();
}

/**
 * @param {Function} fExecute
 * @param {(Function|boolean|null)=} fCanExecute = true
 * @returns {Function}
 */
export function createCommand(fExecute, fCanExecute = true) {
	let fResult = null;
	const fNonEmpty = (...args) => {
		if (fResult && fResult.canExecute && fResult.canExecute()) {
			fExecute.apply(null, args);
		}
		return false;
	};

	fResult = fExecute ? fNonEmpty : ()=>{};
	fResult.enabled = ko.observable(true);
	fResult.isCommand = true;

	if (typeof fCanExecute === 'function') {
		fResult.canExecute = ko.computed(() => fResult && fResult.enabled() && fCanExecute.call(null));
	} else {
		fResult.canExecute = ko.computed(() => fResult && fResult.enabled() && !!fCanExecute);
	}

	return fResult;
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
	return screenName && null != SCREENS[screenName] ? SCREENS[screenName] : null;
}

/**
 * @param {Function} ViewModelClassToShow
 * @returns {Function|null}
 */
function getScreenPopup(PopuViewModelClass) {
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
 * @param {Function} ViewModelClass
 * @param {Object=} vmScreen
 * @returns {*}
 */
function buildViewModel(ViewModelClass, vmScreen) {
	if (ViewModelClass && !ViewModelClass.__builded) {
		let vmDom = null;
		const vm = new ViewModelClass(vmScreen),
			position = ViewModelClass.__type || '',
			vmPlace = position ? qs('#rl-content #rl-' + position.toLowerCase()) : null;

		ViewModelClass.__builded = true;
		ViewModelClass.__vm = vm;

		vm.viewModelName = ViewModelClass.__name;
		vm.viewModelNames = ViewModelClass.__names;
		vm.viewModelTemplateID = ViewModelClass.__templateID;
		vm.viewModelPosition = ViewModelClass.__type;

		if (vmPlace) {
			vmDom = Element.fromHTML('<div class="rl-view-model RL-' + vm.viewModelTemplateID + '" hidden=""></div>');
			vmPlace.append(vmDom);

			vm.viewModelDom = vmDom;
			ViewModelClass.__dom = vmDom;

			if (ViewType.Popup === position) {
				vm.cancelCommand = vm.closeCommand = createCommand(() => {
					hideScreenPopup(ViewModelClass);
				});

				vm.modalVisibility.subscribe((value) => {
					if (value) {
						vm.viewModelDom.hidden = false;
						vm.storeAndSetKeyScope();

						popupVisibilityNames.push(vm.viewModelName);
						vm.viewModelDom.style.zIndex = 3000 + popupVisibilityNames().length + 10;

						vm.onShowWithDelay && setTimeout(()=>vm.onShowWithDelay, 500);
					} else {
						vm.onHide && vm.onHide();
						vm.onHideWithDelay && setTimeout(()=>vm.onHideWithDelay, 500);

						vm.restoreKeyScope();

						popupVisibilityNames.remove(vm.viewModelName);
						vm.viewModelDom.style.zIndex = 2000;

						setTimeout(() => vm.viewModelDom.hidden = true, 300);
					}
				});
			}

			ko.applyBindingAccessorsToNode(
				vmDom,
				{
					i18nInit: true,
					template: () => ({ name: vm.viewModelTemplateID })
				},
				vm
			);

			vm.onBuild && vm.onBuild(vmDom);
			if (vm && ViewType.Popup === position) {
				vm.registerPopupKeyDown();
			}
		} else {
			console.log('Cannot find view model position: ' + position);
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
			params = params || [];

			ModalView.__vm.onBeforeShow && ModalView.__vm.onBeforeShow(...params);

			ModalView.__vm.modalVisibility(true);

			ModalView.__vm.onShow && ModalView.__vm.onShow(...params);

//			if (!bMobileDevice) {
			const af = ModalView.__dom.querySelector('[autofocus]');
			af && af.focus();
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
			ModalView.__vm.onWarmUp && ModalView.__vm.onWarmUp();
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
function screenOnRoute(screenName, subPart) {
	let vmScreen = null,
		isSameScreen = false,
		cross = null;

	if (null == screenName || '' == screenName) {
		screenName = defaultScreenName;
	}

	if (screenName) {
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
					vmScreen.viewModels().forEach(ViewModelClass => {
						buildViewModel(ViewModelClass, vmScreen);
					});
				}

				vmScreen.onBuild && vmScreen.onBuild();
			}

			setTimeout(() => {
				// hide screen
				if (currentScreen && !isSameScreen) {
					currentScreen.onHide && currentScreen.onHide();
					currentScreen.onHideWithDelay && setTimeout(()=>currentScreen.onHideWithDelay(), 500);

					if (isNonEmptyArray(currentScreen.viewModels())) {
						currentScreen.viewModels().forEach(ViewModelClass => {
							if (
								ViewModelClass.__vm &&
								ViewModelClass.__dom &&
								ViewType.Popup !== ViewModelClass.__vm.viewModelPosition
							) {
								ViewModelClass.__dom.hidden = true;
								ViewModelClass.__vm.viewModelVisibility(false);

								ViewModelClass.__vm.onHide && ViewModelClass.__vm.onHide();
								ViewModelClass.__vm.onHideWithDelay && setTimeout(()=>ViewModelClass.__vm.onHideWithDelay(), 500);
							}
						});
					}
				}
				// --

				currentScreen = vmScreen;

				// show screen
				if (currentScreen && !isSameScreen) {
					currentScreen.onShow && currentScreen.onShow();

					if (isNonEmptyArray(currentScreen.viewModels())) {
						currentScreen.viewModels().forEach(ViewModelClass => {
							if (
								ViewModelClass.__vm &&
								ViewModelClass.__dom &&
								ViewType.Popup !== ViewModelClass.__vm.viewModelPosition
							) {
								ViewModelClass.__vm.onBeforeShow && ViewModelClass.__vm.onBeforeShow();

								ViewModelClass.__dom.hidden = false;
								ViewModelClass.__vm.viewModelVisibility(true);

								ViewModelClass.__vm.onShow && ViewModelClass.__vm.onShow();

//								if (!bMobileDevice) {
								const af = ViewModelClass.__dom.querySelector('[autofocus]');
								af && af.focus();

								ViewModelClass.__vm.onShowWithDelay && setTimeout(()=>ViewModelClass.__vm.onShowWithDelay, 200);
							}
						});
					}
				}
				// --

				cross = vmScreen && vmScreen.__cross ? vmScreen.__cross() : null;
				if (cross) {
					cross.parse(subPart);
				}
			}, 1);
		}
	}
}

/**
 * @param {Array} screensClasses
 * @returns {void}
 */
export function startScreens(screensClasses) {
	screensClasses.forEach(CScreen => {
		if (CScreen) {
			const vmScreen = new CScreen(),
				screenName = vmScreen ? vmScreen.screenName() : '';

			if (vmScreen && screenName) {
				if (!defaultScreenName) {
					defaultScreenName = screenName;
				}

				SCREENS[screenName] = vmScreen;
			}
		}
	});

	Object.values(SCREENS).forEach(vmScreen => {
		if (vmScreen && !vmScreen.__started && vmScreen.__start) {
			vmScreen.__started = true;
			vmScreen.__start();
			vmScreen.onStart && vmScreen.onStart();
		}
	});

	const cross = new Crossroads();
	cross.addRoute(/^([a-zA-Z0-9-]*)\/?(.*)$/, screenOnRoute);

	hasher.initialized.add(cross.parse, cross);
	hasher.changed.add(cross.parse, cross);
	hasher.init();

	setTimeout(() => {
		$htmlCL.remove('rl-started-trigger');
		$htmlCL.add('rl-started');
	}, 100);
	setTimeout(() => $htmlCL.add('rl-started-delay'), 200);
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
				if (Array.isArray(name)) {
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
			normCanExecute = typeof canExecute === 'function' ? canExecute : () => !!canExecute;

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
function settingsMenuKeysHandler(items) {
	return ((event, handler)=>{
		let index = items.length;
		if (event && index) {
			while (index-- && !items[index].matches('.selected'));
			if (handler && 'up' === handler.shortcut) {
				 index && --index;
			} else if (index < items.length - 1) {
				++index;
			}

			const resultHash = items[index].href;
			if (resultHash) {
				setHash(resultHash, false, true);
			}
		}
	}).throttle(200);
}

export {
	commandDecorator,
	commandDecorator as command,
	viewDecorator,
	viewDecorator as view,
	popupDecorator,
	popupDecorator as popup,
	settingsMenuKeysHandler
};
