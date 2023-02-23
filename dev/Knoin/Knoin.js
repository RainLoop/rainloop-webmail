import ko from 'ko';
import { koComputable } from 'External/ko';
import { doc, $htmlCL, elementById, createElement, fireEvent } from 'Common/Globals';
import { forEachObjectEntry } from 'Common/Utils';
import { i18nToNodes } from 'Common/Translator';

import { leftPanelDisabled } from 'Common/Globals';
import { ThemeStore } from 'Stores/Theme';

let
	currentScreen = null,
	defaultScreenName = '';

const
	SCREENS = new Map,

	autofocus = dom => dom.querySelector('[autofocus]')?.focus(),

	visiblePopups = new Set,

	/**
	 * @param {string} screenName
	 * @returns {?Object}
	 */
	screen = screenName => (screenName && SCREENS.get(screenName)) || null,

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
				position = 'rl-' + vm.viewType,
				dialog = ViewTypePopup === vm.viewType,
				vmPlace = doc.getElementById(position);

			ViewModelClass.__builded = true;
			ViewModelClass.__vm = vm;

			if (vmPlace) {
				vmDom = dialog
					? createElement('dialog',{id:'V-'+id})
					: createElement('div',{id:'V-'+id,hidden:''})
				vmPlace.append(vmDom);

				vm.viewModelDom = ViewModelClass.__dom = vmDom;

				if (dialog) {
					// Firefox < 98 / Safari < 15.4 HTMLDialogElement not defined
					if (!vmDom.showModal) {
						vmDom.className = 'polyfill';
						vmDom.showModal = () => {
							vmDom.backdrop ||
								vmDom.before(vmDom.backdrop = createElement('div',{class:'dialog-backdrop'}));
							vmDom.setAttribute('open','');
							vmDom.open = true;
							vmDom.returnValue = null;
							vmDom.backdrop.hidden = false;
						};
						vmDom.close = v => {
//							if (vmDom.dispatchEvent(new CustomEvent('cancel', {cancelable:true}))) {
								vmDom.backdrop.hidden = true;
								vmDom.returnValue = v;
								vmDom.removeAttribute('open', null);
								vmDom.open = false;
//								vmDom.dispatchEvent(new CustomEvent('close'));
//							}
						};
					}
					// https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/cancel_event
//					vmDom.addEventListener('cancel', event => (false === vm.onClose() && event.preventDefault()));
//					vmDom.addEventListener('close', () => vm.modalVisible(false));

					// show/hide popup/modal
					const endShowHide = e => {
						if (e.target === vmDom) {
							if (vmDom.classList.contains('animate')) {
								vm.afterShow?.();
							} else {
								vmDom.close();
								vm.afterHide?.();
							}
						}
					};

					vm.modalVisible.subscribe(value => {
						if (value) {
							i18nToNodes(vmDom);
							visiblePopups.add(vm);
							vmDom.style.zIndex = 3001 + (visiblePopups.size * 2);
							vmDom.showModal();
							if (vmDom.backdrop) {
								vmDom.backdrop.style.zIndex = 3000 + (visiblePopups.size * 2);
							}
							vm.keyScope.set();
							setTimeout(()=>autofocus(vmDom),1);
							requestAnimationFrame(() => { // wait just before the next paint
								vmDom.offsetHeight; // force a reflow
								vmDom.classList.add('animate'); // trigger the transitions
							});
						} else {
							visiblePopups.delete(vm);
							vm.onHide?.();
							vm.keyScope.unset();
							vmDom.classList.remove('animate'); // trigger the transitions
						}
						arePopupsVisible(0 < visiblePopups.size);
					});
					vmDom.addEventListener('transitionend', endShowHide);
				}

				fireEvent('rl-view-model.create', vm);

				ko.applyBindingAccessorsToNode(
					vmDom,
					{
						template: () => ({ name: id })
					},
					vm
				);

				vm.onBuild?.(vmDom);

				fireEvent('rl-view-model', vm);
			} else {
				console.log('Cannot find view model position: ' + position);
			}
		}

		return ViewModelClass?.__vm;
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
		screenToHide.onHide?.();
		forEachViewModel(screenToHide, (vm, dom) => {
			dom.hidden = true;
			vm.onHide?.();
			destroy && vm.viewModelDom.remove();
		});
		ThemeStore.isMobile() && leftPanelDisabled(true);
	},

	/**
	 * @param {string} screenName
	 * @param {string} subPart
	 * @returns {void}
	 */
	screenOnRoute = (screenName, subPart) => {
		screenName = screenName || defaultScreenName;
		if (screenName && fireEvent('sm-show-screen', screenName, 1)) {
			// Close all popups
			for (let vm of visiblePopups) {
				(false === vm.onClose()) || vm.close();
			}

			let vmScreen = screen(screenName);
			if (!vmScreen) {
				vmScreen = screen(defaultScreenName);
				if (vmScreen) {
					subPart = screenName + '/' + subPart;
					screenName = defaultScreenName;
				}
			}

			if (vmScreen?.__started) {
				let isSameScreen = currentScreen && vmScreen === currentScreen;

				if (!vmScreen.__builded) {
					vmScreen.__builded = true;

					vmScreen.viewModels.forEach(ViewModelClass =>
						buildViewModel(ViewModelClass, vmScreen)
					);

					vmScreen.onBuild?.();
				}

				setTimeout(() => {
					// hide screen
					currentScreen && !isSameScreen && hideScreen(currentScreen);
					// --

					currentScreen = vmScreen;

					// show screen
					if (!isSameScreen) {
						vmScreen.onShow?.();

						forEachViewModel(vmScreen, (vm, dom) => {
							vm.beforeShow?.();
							i18nToNodes(dom);
							dom.hidden = false;
							vm.onShow?.();
							autofocus(dom);
						});
					}
					// --

					vmScreen.__cross?.parse(subPart);
				}, 1);
			}
		}
	};


export const
	ViewTypePopup = 'popups',

	/**
	 * @param {Function} ViewModelClassToShow
	 * @param {Array=} params
	 * @returns {void}
	 */
	showScreenPopup = (ViewModelClassToShow, params = []) => {
		const vm = buildViewModel(ViewModelClassToShow) && ViewModelClassToShow.__dom && ViewModelClassToShow.__vm;

		if (vm) {
			params = params || [];

			vm.beforeShow?.(...params);

			vm.modalVisible(true);

			vm.onShow?.(...params);
		}
	},

	arePopupsVisible = ko.observable(false),

	/**
	 * @param {Array} screensClasses
	 * @returns {void}
	 */
	startScreens = screensClasses => {
		hasher.clear();
		SCREENS.forEach(screen => hideScreen(screen, 1));
		SCREENS.clear();
		currentScreen = null,
		defaultScreenName = '';

		screensClasses.forEach(CScreen => {
			const vmScreen = new CScreen(),
				screenName = vmScreen.screenName;
			defaultScreenName || (defaultScreenName = screenName);
			SCREENS.set(screenName, vmScreen);
		});

		SCREENS.forEach(vmScreen => {
			if (!vmScreen.__started) {
				vmScreen.onStart();
				vmScreen.__started = true;
			}
		});

		const cross = new Crossroads();
		cross.addRoute(/^([^/]*)\/?(.*)$/, screenOnRoute);

		hasher.add(cross.parse.bind(cross));
		hasher.init();

		setTimeout(() => $htmlCL.remove('rl-started-trigger'), 100);

		const c = elementById('rl-content'), l = elementById('rl-loading');
		c && (c.hidden = false);
		l?.remove();
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
