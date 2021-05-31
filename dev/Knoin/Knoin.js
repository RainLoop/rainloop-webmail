import ko from 'ko';

import { doc, $htmlCL } from 'Common/Globals';
import { isNonEmptyArray, isFunction } from 'Common/Utils';

let currentScreen = null,
	defaultScreenName = '';

const SCREENS = {},
	autofocus = dom => {
		const af = dom.querySelector('[autofocus]');
		af && af.focus();
	};

export const popupVisibilityNames = ko.observableArray([]);

export const ViewType = {
	Popup: 'Popups',
	Left: 'Left',
	Right: 'Right',
	Content: 'Content'
};

/**
 * @param {Function} fExecute
 * @param {(Function|boolean|null)=} fCanExecute = true
 * @returns {Function}
 */
export function createCommand(fExecute, fCanExecute = true) {
	let fResult = null;

	fResult = fExecute
		? (...args) => {
			if (fResult && fResult.canExecute && fResult.canExecute()) {
				fExecute.apply(null, args);
			}
			return false;
		} : ()=>{};
	fResult.enabled = ko.observable(true);
	fResult.isCommand = true;

	if (isFunction(fCanExecute)) {
		fResult.canExecute = ko.computed(() => fResult && fResult.enabled() && fCanExecute.call(null));
	} else {
		fResult.canExecute = ko.computed(() => fResult && fResult.enabled() && !!fCanExecute);
	}

	return fResult;
}

/**
 * @param {string} screenName
 * @returns {?Object}
 */
function screen(screenName) {
	return screenName && null != SCREENS[screenName] ? SCREENS[screenName] : null;
}

/**
 * @param {Function} ViewModelClassToHide
 * @returns {void}
 */
export function hideScreenPopup(ViewModelClassToHide) {
	if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom) {
		ViewModelClassToHide.__vm.modalVisibility(false);
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
			position = vm.viewModelPosition || '',
			vmPlace = position ? doc.getElementById('rl-' + position.toLowerCase()) : null;

		ViewModelClass.__builded = true;
		ViewModelClass.__vm = vm;

		if (vmPlace) {
			vmDom = Element.fromHTML('<div class="rl-view-model RL-' + vm.viewModelTemplateID + '" hidden=""></div>');
			vmPlace.append(vmDom);

			vm.viewModelDom = vmDom;
			ViewModelClass.__dom = vmDom;

			if (ViewType.Popup === position) {
				vm.cancelCommand = vm.closeCommand = createCommand(() => {
					hideScreenPopup(ViewModelClass);
				});

				// show/hide popup/modal
				const endShowHide = e => {
					if (e.target === vmDom) {
						if (vmDom.classList.contains('show')) {
							autofocus(vmDom);
							vm.onShowWithDelay && vm.onShowWithDelay();
						} else {
							vmDom.hidden = true;
							vm.onHideWithDelay && vm.onHideWithDelay();
						}
					}
				};

				vm.modalVisibility.subscribe(value => {
					if (value) {
						vmDom.style.zIndex = 3000 + popupVisibilityNames().length + 10;
						vmDom.hidden = false;
						vm.storeAndSetScope();
						popupVisibilityNames.push(vm.viewModelName);
						requestAnimationFrame(() => { // wait just before the next paint
							vmDom.offsetHeight; // force a reflow
							vmDom.classList.add('show'); // trigger the transitions
						});
					} else {
						vm.onHide && vm.onHide();
						vmDom.classList.remove('show');
						vm.restoreScope();
						popupVisibilityNames(popupVisibilityNames.filter(v=>v!==vm.viewModelName));
					}
					vmDom.setAttribute('aria-hidden', !value);
				});
				if ('ontransitionend' in vmDom) {
					vmDom.addEventListener('transitionend', endShowHide);
				} else {
					// For Edge < 79 and mobile browsers
					vm.modalVisibility.subscribe(() => ()=>setTimeout(endShowHide({target:vmDom}), 500));
				}
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

			dispatchEvent(new CustomEvent('rl-view-model', {detail:vm}));
		} else {
			console.log('Cannot find view model position: ' + position);
		}
	}

	return ViewModelClass && ViewModelClass.__vm;
}

export function getScreenPopupViewModel(ViewModelClassToShow) {
	return (buildViewModel(ViewModelClassToShow) && ViewModelClassToShow.__dom) && ViewModelClassToShow.__vm;
}

/**
 * @param {Function} ViewModelClassToShow
 * @param {Array=} params
 * @returns {void}
 */
export function showScreenPopup(ViewModelClassToShow, params = []) {
	const vm = getScreenPopupViewModel(ViewModelClassToShow);
	if (vm) {
		params = params || [];

		vm.onBeforeShow && vm.onBeforeShow(...params);

		vm.modalVisibility(true);

		vm.onShow && vm.onShow(...params);
	}
}

/**
 * @param {Function} ViewModelClassToShow
 * @returns {boolean}
 */
export function isPopupVisible(ViewModelClassToShow) {
	return ViewModelClassToShow && ViewModelClassToShow.__vm && ViewModelClassToShow.__vm.modalVisibility();
}

/**
 * @param {string} screenName
 * @param {string} subPart
 * @returns {void}
 */
function screenOnRoute(screenName, subPart) {
	let vmScreen = null,
		isSameScreen = false;

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

				vmScreen.viewModels.forEach(ViewModelClass =>
					buildViewModel(ViewModelClass, vmScreen)
				);

				vmScreen.onBuild && vmScreen.onBuild();
			}

			setTimeout(() => {
				// hide screen
				if (currentScreen && !isSameScreen) {
					currentScreen.onHide && currentScreen.onHide();
					currentScreen.onHideWithDelay && setTimeout(()=>currentScreen.onHideWithDelay(), 500);

					if (isNonEmptyArray(currentScreen.viewModels)) {
						currentScreen.viewModels.forEach(ViewModelClass => {
							if (
								ViewModelClass.__vm &&
								ViewModelClass.__dom &&
								ViewType.Popup !== ViewModelClass.__vm.viewModelPosition
							) {
								ViewModelClass.__dom.hidden = true;
								ViewModelClass.__vm.viewModelVisible = false;

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

					if (isNonEmptyArray(currentScreen.viewModels)) {
						currentScreen.viewModels.forEach(ViewModelClass => {
							if (
								ViewModelClass.__vm &&
								ViewModelClass.__dom &&
								ViewType.Popup !== ViewModelClass.__vm.viewModelPosition
							) {
								ViewModelClass.__vm.onBeforeShow && ViewModelClass.__vm.onBeforeShow();

								ViewModelClass.__dom.hidden = false;
								ViewModelClass.__vm.viewModelVisible = true;

								ViewModelClass.__vm.onShow && ViewModelClass.__vm.onShow();

								autofocus(ViewModelClass.__dom);

								ViewModelClass.__vm.onShowWithDelay && setTimeout(()=>ViewModelClass.__vm.onShowWithDelay, 200);
							}
						});
					}
				}
				// --

				vmScreen && vmScreen.__cross && vmScreen.__cross.parse(subPart);
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
				screenName = vmScreen && vmScreen.screenName();

			if (screenName) {
				defaultScreenName || (defaultScreenName = screenName);

				SCREENS[screenName] = vmScreen;
			}
		}
	});

	Object.values(SCREENS).forEach(vmScreen =>
		vmScreen && vmScreen.onStart && vmScreen.onStart()
	);

	const cross = new Crossroads();
	cross.addRoute(/^([a-zA-Z0-9-]*)\/?(.*)$/, screenOnRoute);

	hasher.changed.add(cross.parse.bind(cross));
	hasher.init();

	setTimeout(() => $htmlCL.remove('rl-started-trigger'), 100);
	setTimeout(() => $htmlCL.add('rl-started-delay'), 200);
}

function decorateKoCommands(thisArg, commands) {
	Object.entries(commands).forEach(([key, canExecute]) => {
		let command = thisArg[key],
			fn = (...args) => fn.enabled() && fn.canExecute() && command.apply(thisArg, args);

//		fn.__realCanExecute = canExecute;
//		fn.isCommand = true;

		fn.enabled = ko.observable(true);

		fn.canExecute = (typeof canExecute === 'function')
			? ko.computed(() => fn.enabled() && canExecute.call(thisArg, thisArg))
			: ko.computed(() => fn.enabled());

		thisArg[key] = fn;
	});
}
ko.decorateCommands = decorateKoCommands;

/**
 * @param {miced} $items
 * @returns {Function}
 */
function settingsMenuKeysHandler(items) {
	return ((event, handler)=>{
		let index = items.length;
		if (event && index) {
			while (index-- && !items[index].matches('.selected'));
			if (handler && 'arrowup' === handler.shortcut) {
				index && --index;
			} else if (index < items.length - 1) {
				++index;
			}

			const resultHash = items[index].href;
			resultHash && rl.route.setHash(resultHash, false, true);
		}
	}).throttle(200);
}

export {
	decorateKoCommands,
	settingsMenuKeysHandler
};
