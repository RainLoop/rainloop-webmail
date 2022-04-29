import ko from 'ko';
import { koComputable } from 'External/ko';
import { doc, $htmlCL, elementById, fireEvent } from 'Common/Globals';
import { forEachObjectValue, forEachObjectEntry } from 'Common/Utils';
import { i18nToNodes } from 'Common/Translator';

let
	SCREENS = {},
	currentScreen = null,
	defaultScreenName = '';

const
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
			const
				vm = new ViewModelClass(vmScreen),
				id = vm.viewModelTemplateID,
				position = vm.viewType || '',
				dialog = ViewTypePopup === position,
				vmPlace = position ? doc.getElementById('rl-' + position.toLowerCase()) : null;

			ViewModelClass.__builded = true;
			ViewModelClass.__vm = vm;

			if (vmPlace) {
				vmDom = Element.fromHTML(dialog
					? '<dialog id="V-'+ id + '"></dialog>'
					: '<div id="V-'+ id + '" hidden=""></div>');
				vmPlace.append(vmDom);

				vm.viewModelDom = vmDom;
				ViewModelClass.__dom = vmDom;

				if (ViewTypePopup === position) {
					vm.close = () => hideScreenPopup(ViewModelClass);

					// Firefox / Safari HTMLDialogElement not defined
					if (!vmDom.showModal) {
						vmDom.classList.add('polyfill');
						vmDom.showModal = () => {
							vmDom.backdrop ||
								vmDom.before(vmDom.backdrop = Element.fromHTML('<div class="dialog-backdrop"></div>'));
							vmDom.setAttribute('open','');
							vmDom.open = true;
							vmDom.returnValue = null;
							vmDom.backdrop.hidden = false;
						};
						vmDom.close = v => {
							vmDom.backdrop.hidden = true;
							vmDom.returnValue = v;
							vmDom.removeAttribute('open', null);
							vmDom.open = false;
						};
					}

					// show/hide popup/modal
					const endShowHide = e => {
						if (e.target === vmDom) {
							if (vmDom.classList.contains('animate')) {
								autofocus(vmDom);
								vm.afterShow && vm.afterShow();
							} else {
								vmDom.close();
								vm.afterHide && vm.afterHide();
							}
						}
					};

					vm.modalVisible.subscribe(value => {
						if (value) {
							i18nToNodes(vmDom);
							visiblePopups.add(vm);
							vmDom.style.zIndex = 3000 + (visiblePopups.size * 2);
							vmDom.showModal();
							if (vmDom.backdrop) {
								vmDom.backdrop.style.zIndex = 3000 + visiblePopups.size;
							}
							vm.keyScope.set();
							requestAnimationFrame(() => { // wait just before the next paint
								vmDom.offsetHeight; // force a reflow
								vmDom.classList.add('animate'); // trigger the transitions
							});
						} else {
							visiblePopups.delete(vm);
							vm.onHide && vm.onHide();
							vm.keyScope.unset();
							vmDom.classList.remove('animate'); // trigger the transitions
						}
						arePopupsVisible(0 < visiblePopups.size);
					});
					vmDom.addEventListener('transitionend', endShowHide);
				}

				ko.applyBindingAccessorsToNode(
					vmDom,
					{
						template: () => ({ name: id })
					},
					vm
				);

				vm.onBuild && vm.onBuild(vmDom);

				fireEvent('rl-view-model', vm);
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
				ViewTypePopup !== ViewModelClass.__vm.viewType
			) {
				fn(ViewModelClass.__vm, ViewModelClass.__dom);
			}
		});
	},

	hideScreen = (screenToHide, destroy) => {
		screenToHide.onHide && screenToHide.onHide();
		forEachViewModel(screenToHide, (vm, dom) => {
			dom.hidden = true;
			vm.onHide && vm.onHide();
			destroy && vm.viewModelDom.remove();
		});
	},

	/**
	 * @param {Function} ViewModelClassToHide
	 * @returns {void}
	 */
	hideScreenPopup = ViewModelClassToHide => {
		if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom) {
			ViewModelClassToHide.__vm.modalVisible(false);
		}
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

		if (fireEvent('sm-show-screen', screenName, 1)) {

			// Close all popups
			for (let vm of visiblePopups) {
				false === vm.onClose() || vm.close();
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
							hideScreen(currentScreen);
						}
						// --

						currentScreen = vmScreen;

						// show screen
						if (!isSameScreen) {
							vmScreen.onShow && vmScreen.onShow();

							forEachViewModel(vmScreen, (vm, dom) => {
								vm.beforeShow && vm.beforeShow();
								i18nToNodes(dom);
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
		}
	};


export const
	ViewTypePopup = 'Popups',

	/**
	 * @param {Function} ViewModelClassToShow
	 * @param {Array=} params
	 * @returns {void}
	 */
	showScreenPopup = (ViewModelClassToShow, params = []) => {
		const vm = buildViewModel(ViewModelClassToShow) && ViewModelClassToShow.__dom && ViewModelClassToShow.__vm;

		if (vm) {
			params = params || [];

			vm.beforeShow && vm.beforeShow(...params);

			vm.modalVisible(true);

			vm.onShow && vm.onShow(...params);
		}
	},

	arePopupsVisible = ko.observable(false),

	/**
	 * @param {Array} screensClasses
	 * @returns {void}
	 */
	startScreens = screensClasses => {
		hasher.clear();
		forEachObjectValue(SCREENS, screen => hideScreen(screen, 1));
		SCREENS = {};
		currentScreen = null,
		defaultScreenName = '';

		screensClasses.forEach(CScreen => {
			if (CScreen) {
				const vmScreen = new CScreen(),
					screenName = vmScreen.screenName;
				defaultScreenName || (defaultScreenName = screenName);
				SCREENS[screenName] = vmScreen;
			}
		});

		forEachObjectValue(SCREENS, vmScreen => {
			if (!vmScreen.__started) {
				vmScreen.onStart();
				vmScreen.__started = true;
			}
		});

		const cross = new Crossroads();
		cross.addRoute(/^([a-zA-Z0-9-]*)\/?(.*)$/, screenOnRoute);

		hasher.add(cross.parse.bind(cross));
		hasher.init();

		setTimeout(() => $htmlCL.remove('rl-started-trigger'), 100);

		const c = elementById('rl-content'), l = elementById('rl-loading');
		c && (c.hidden = false);
		l && l.remove();
	},

	/**
	 * Used by ko.bindingHandlers.command (template data-bind="command: ")
	 * to enable/disable click/submit action.
	 */
	decorateKoCommands = (thisArg, commands) =>
		forEachObjectEntry(commands, (key, canExecute) => {
			let command = thisArg[key],
				fn = (...args) => fn.canExecute() && command.apply(thisArg, args);

			fn.canExecute = koComputable(() => canExecute.call(thisArg, thisArg));

			thisArg[key] = fn;
		});

ko.decorateCommands = decorateKoCommands;
