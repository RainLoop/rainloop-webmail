import ko from 'ko';

import { doc, $htmlCL } from 'Common/Globals';
import { isFunction } from 'Common/Utils';

let currentScreen = null,
	defaultScreenName = '';

const SCREENS = {},
	autofocus = dom => {
		const af = dom.querySelector('[autofocus]');
		af && af.focus();
	},

	visiblePopups = new Set,

	/**
	 * @param {string} screenName
	 * @returns {?Object}
	 */
	screen = screenName => screenName && null != SCREENS[screenName] ? SCREENS[screenName] : null,

	/**
	 * @param {Function} ViewModelClass
	 * @param {Object=} vmScreen
	 * @returns {*}
	 */
	buildViewModel = (ViewModelClass, vmScreen) => {
		if (ViewModelClass && !ViewModelClass.__builded) {
			let vmDom = null;
			const vm = new ViewModelClass(vmScreen),
				position = vm.viewType || '',
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
							visiblePopups.add(vm);
							vmDom.style.zIndex = 3000 + visiblePopups.size + 10;
							vmDom.hidden = false;
							vm.keyScope.set();
							arePopupsVisible(true);
							requestAnimationFrame(() => { // wait just before the next paint
								vmDom.offsetHeight; // force a reflow
								vmDom.classList.add('show'); // trigger the transitions
							});
						} else {
							visiblePopups.delete(vm);
							vm.onHide && vm.onHide();
							vmDom.classList.remove('show');
							vm.keyScope.unset();
							arePopupsVisible(0 < visiblePopups.size);
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
	},

	forEachViewModel = (screen, fn) => {
		screen.viewModels.forEach(ViewModelClass => {
			if (
				ViewModelClass.__vm &&
				ViewModelClass.__dom &&
				ViewType.Popup !== ViewModelClass.__vm.viewType
			) {
				fn(ViewModelClass.__vm, ViewModelClass.__dom);
			}
		});
	},

	/**
	 * @param {string} screenName
	 * @param {string} subPart
	 * @returns {void}
	 */
	screenOnRoute = (screenName, subPart) => {
		let vmScreen = null,
			isSameScreen = false;

		if (null == screenName || '' == screenName) {
			screenName = defaultScreenName;
		}

		// Close all popups
		for (let vm of visiblePopups) {
			vm.closeCommand();
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

						forEachViewModel(currentScreen, (vm, dom) => {
							dom.hidden = true;
							vm.onHide && vm.onHide();
						});
					}
					// --

					currentScreen = vmScreen;

					// show screen
					if (!isSameScreen) {
						vmScreen.onShow && vmScreen.onShow();

						forEachViewModel(vmScreen, (vm, dom) => {
							vm.onBeforeShow && vm.onBeforeShow();
							dom.hidden = false;
							vm.onShow && vm.onShow();
							autofocus(dom);
						});
					}
					// --

					vmScreen.__cross && vmScreen.__cross.parse(subPart);
				}, 1);
			}
		}
	};

export const
	ViewType = {
		Popup: 'Popups',
		Left: 'Left',
		Right: 'Right',
		Content: 'Content'
	},

	/**
	 * @param {Function} fExecute
	 * @param {(Function|boolean|null)=} fCanExecute = true
	 * @returns {Function}
	 */
	createCommand = (fExecute, fCanExecute = true) => {
		let fResult = fExecute
			? (...args) => {
				if (fResult && fResult.canExecute && fResult.canExecute()) {
					fExecute.apply(null, args);
				}
				return false;
			} : ()=>0;
		fResult.enabled = ko.observable(true);
		fResult.isCommand = true;

		if (isFunction(fCanExecute)) {
			fResult.canExecute = ko.computed(() => fResult && fResult.enabled() && fCanExecute.call(null));
		} else {
			fResult.canExecute = ko.computed(() => fResult && fResult.enabled() && !!fCanExecute);
		}

		return fResult;
	},

	/**
	 * @param {Function} ViewModelClassToHide
	 * @returns {void}
	 */
	hideScreenPopup = ViewModelClassToHide => {
		if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom) {
			ViewModelClassToHide.__vm.modalVisibility(false);
		}
	},

	getScreenPopupViewModel = ViewModelClassToShow =>
		(buildViewModel(ViewModelClassToShow) && ViewModelClassToShow.__dom) && ViewModelClassToShow.__vm,

	/**
	 * @param {Function} ViewModelClassToShow
	 * @param {Array=} params
	 * @returns {void}
	 */
	showScreenPopup = (ViewModelClassToShow, params = []) => {
		const vm = getScreenPopupViewModel(ViewModelClassToShow);
		if (vm) {
			params = params || [];

			vm.onBeforeShow && vm.onBeforeShow(...params);

			vm.modalVisibility(true);

			vm.onShow && vm.onShow(...params);
		}
	},

	arePopupsVisible = ko.observable(false),

	/**
	 * @param {Function} ViewModelClassToShow
	 * @returns {boolean}
	 */
	isPopupVisible = ViewModelClassToShow =>
		ViewModelClassToShow && ViewModelClassToShow.__vm && ViewModelClassToShow.__vm.modalVisibility(),

	/**
	 * @param {Array} screensClasses
	 * @returns {void}
	 */
	startScreens = screensClasses => {
		screensClasses.forEach(CScreen => {
			if (CScreen) {
				const vmScreen = new CScreen(),
					screenName = vmScreen.screenName;
				defaultScreenName || (defaultScreenName = screenName);
				SCREENS[screenName] = vmScreen;
			}
		});

		Object.values(SCREENS).forEach(vmScreen => vmScreen.onStart());

		const cross = new Crossroads();
		cross.addRoute(/^([a-zA-Z0-9-]*)\/?(.*)$/, screenOnRoute);

		hasher.add(cross.parse.bind(cross));
		hasher.init();

		setTimeout(() => $htmlCL.remove('rl-started-trigger'), 100);
		setTimeout(() => $htmlCL.add('rl-started-delay'), 200);
	},

	decorateKoCommands = (thisArg, commands) =>
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

ko.decorateCommands = decorateKoCommands;
