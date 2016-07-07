
import _ from '_';
import $ from '$';
import ko from 'ko';
import hasher from 'hasher';
import crossroads from 'crossroads';

import {runHook} from 'Common/Plugins';
import {$html, aViewModels as VIEW_MODELS, popupVisibilityNames} from 'Common/Globals';

import {
	isFunc, isArray, isUnd, pString, log,
	createCommand, delegateRun, isNonEmptyArray
} from 'Common/Utils';

let
	currentScreen = null,
	defaultScreenName = '';

const SCREENS = {};

/**
 * @returns {void}
 */
export function hideLoading()
{
	$('#rl-content').addClass('rl-content-show');
	$('#rl-loading').hide().remove();
}

/**
 * @param {Object} context
 * @returns {void}
 */
export function constructorEnd(context)
{
	if (isFunc(context.__constructor_end))
	{
		context.__constructor_end();
	}
}

/**
 * @param {string|Array} name
 * @param {Function} ViewModelClass
 * @returns {void}
 */
export function extendAsViewModel(name, ViewModelClass)
{
	if (ViewModelClass)
	{
		if (isArray(name))
		{
			ViewModelClass.__names = name;
		}
		else
		{
			ViewModelClass.__names = [name];
		}

		ViewModelClass.__name = ViewModelClass.__names[0];
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
export function addSettingsViewModel(SettingsViewModelClass, template, labelName, route, isDefault = false)
{
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
export function removeSettingsViewModel(SettingsViewModelClass)
{
	VIEW_MODELS['settings-removed'].push(SettingsViewModelClass);
}

/**
 * @param {Function} SettingsViewModelClass
 * @returns {void}
 */
export function disableSettingsViewModel(SettingsViewModelClass)
{
	VIEW_MODELS['settings-disabled'].push(SettingsViewModelClass);
}

/**
 * @returns {void}
 */
export function routeOff()
{
	hasher.changed.active = false;
}

/**
 * @returns {void}
 */
export function routeOn()
{
	hasher.changed.active = true;
}

/**
 * @param {string} screenName
 * @returns {?Object}
 */
export function screen(screenName)
{
	return ('' !== screenName && !isUnd(SCREENS[screenName])) ? SCREENS[screenName] : null;
}

/**
 * @param {Function} ViewModelClassToHide
 * @returns {void}
 */
export function hideScreenPopup(ViewModelClassToHide)
{
	if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom)
	{
		ViewModelClassToHide.__vm.modalVisibility(false);
	}
}

/**
 * @param {string} hookName
 * @param {Function} ViewModelClass
 * @param {mixed=} params = null
 */
export function vmRunHook(hookName, ViewModelClass, params = null)
{
	_.each(ViewModelClass.__names, (name) => {
		runHook(hookName, [name, ViewModelClass.__vm, params]);
	});
}

/**
 * @param {Function} ViewModelClass
 * @param {Object=} vmScreen
 * @returns {*}
 */
export function buildViewModel(ViewModelClass, vmScreen)
{
	if (ViewModelClass && !ViewModelClass.__builded)
	{
		let vmDom = null;
		const
			vm = new ViewModelClass(vmScreen),
			position = vm.viewModelPosition(),
			vmPlace = $('#rl-content #rl-' + position.toLowerCase());

		ViewModelClass.__builded = true;
		ViewModelClass.__vm = vm;

		vm.onShowTrigger = ko.observable(false);
		vm.onHideTrigger = ko.observable(false);

		vm.viewModelName = ViewModelClass.__name;
		vm.viewModelNames = ViewModelClass.__names;

		if (vmPlace && 1 === vmPlace.length)
		{
			vmDom = $('<div></div>').addClass('rl-view-model').addClass('RL-' + vm.viewModelTemplate()).hide();
			vmDom.appendTo(vmPlace);

			vm.viewModelDom = vmDom;
			ViewModelClass.__dom = vmDom;

			if ('Popups' === position)
			{
				vm.cancelCommand = vm.closeCommand = createCommand(vm, () => {
					hideScreenPopup(ViewModelClass);
				});

				vm.modalVisibility.subscribe((value) => {
					if (value)
					{
						vm.viewModelDom.show();
						vm.storeAndSetKeyScope();

						popupVisibilityNames.push(vm.viewModelName);
						vm.viewModelDom.css('z-index', 3000 + popupVisibilityNames().length + 10);

						if (vm.onShowTrigger)
						{
							vm.onShowTrigger(!vm.onShowTrigger());
						}

						delegateRun(vm, 'onShowWithDelay', [], 500);
					}
					else
					{
						delegateRun(vm, 'onHide');
						delegateRun(vm, 'onHideWithDelay', [], 500);

						if (vm.onHideTrigger)
						{
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

			ko.applyBindingAccessorsToNode(vmDom[0], {
				translatorInit: true,
				template: () => ({name: vm.viewModelTemplate()})
			}, vm);

			delegateRun(vm, 'onBuild', [vmDom]);
			if (vm && 'Popups' === position)
			{
				vm.registerPopupKeyDown();
			}

			vmRunHook('view-model-post-build', ViewModelClass, vmDom);
		}
		else
		{
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
export function showScreenPopup(ViewModelClassToShow, params = [])
{
	if (ViewModelClassToShow)
	{
		buildViewModel(ViewModelClassToShow);

		if (ViewModelClassToShow.__vm && ViewModelClassToShow.__dom)
		{
			delegateRun(ViewModelClassToShow.__vm, 'onBeforeShow', params || []);

			ViewModelClassToShow.__vm.modalVisibility(true);

			delegateRun(ViewModelClassToShow.__vm, 'onShow', params || []);

			vmRunHook('view-model-on-show', ViewModelClassToShow, params || []);
		}
	}
}

/**
 * @param {Function} ViewModelClassToShow
 * @returns {boolean}
 */
export function isPopupVisible(ViewModelClassToShow)
{
	return ViewModelClassToShow && ViewModelClassToShow.__vm ? ViewModelClassToShow.__vm.modalVisibility() : false;
}

/**
 * @param {string} screenName
 * @param {string} subPart
 * @returns {void}
 */
export function screenOnRoute(screenName, subPart)
{
	let
		vmScreen = null,
		isSameScreen = false,
		cross = null;

	if ('' === pString(screenName))
	{
		screenName = defaultScreenName;
	}

	if ('' !== screenName)
	{
		vmScreen = screen(screenName);
		if (!vmScreen)
		{
			vmScreen = screen(defaultScreenName);
			if (vmScreen)
			{
				subPart = screenName + '/' + subPart;
				screenName = defaultScreenName;
			}
		}

		if (vmScreen && vmScreen.__started)
		{
			isSameScreen = currentScreen && vmScreen === currentScreen;

			if (!vmScreen.__builded)
			{
				vmScreen.__builded = true;

				if (isNonEmptyArray(vmScreen.viewModels()))
				{
					_.each(vmScreen.viewModels(), (ViewModelClass) => {
						buildViewModel(ViewModelClass, vmScreen);
					});
				}

				delegateRun(vmScreen, 'onBuild');
			}

			_.defer(() => {
				// hide screen
				if (currentScreen && !isSameScreen)
				{
					delegateRun(currentScreen, 'onHide');
					delegateRun(currentScreen, 'onHideWithDelay', [], 500);

					if (currentScreen.onHideTrigger)
					{
						currentScreen.onHideTrigger(!currentScreen.onHideTrigger());
					}

					if (isNonEmptyArray(currentScreen.viewModels()))
					{
						_.each(currentScreen.viewModels(), (ViewModelClass) => {
							if (ViewModelClass.__vm && ViewModelClass.__dom && 'Popups' !== ViewModelClass.__vm.viewModelPosition())
							{
								ViewModelClass.__dom.hide();
								ViewModelClass.__vm.viewModelVisibility(false);

								delegateRun(ViewModelClass.__vm, 'onHide');
								delegateRun(ViewModelClass.__vm, 'onHideWithDelay', [], 500);

								if (ViewModelClass.__vm.onHideTrigger)
								{
									ViewModelClass.__vm.onHideTrigger(!ViewModelClass.__vm.onHideTrigger());
								}
							}
						});
					}
				}
				// --

				currentScreen = vmScreen;

				// show screen
				if (currentScreen && !isSameScreen)
				{
					delegateRun(currentScreen, 'onShow');
					if (currentScreen.onShowTrigger)
					{
						currentScreen.onShowTrigger(!currentScreen.onShowTrigger());
					}

					runHook('screen-on-show', [currentScreen.screenName(), currentScreen]);

					if (isNonEmptyArray(currentScreen.viewModels()))
					{
						_.each(currentScreen.viewModels(), (ViewModelClass) => {

							if (ViewModelClass.__vm && ViewModelClass.__dom && 'Popups' !== ViewModelClass.__vm.viewModelPosition())
							{
								delegateRun(ViewModelClass.__vm, 'onBeforeShow');

								ViewModelClass.__dom.show();
								ViewModelClass.__vm.viewModelVisibility(true);

								delegateRun(ViewModelClass.__vm, 'onShow');
								if (ViewModelClass.__vm.onShowTrigger)
								{
									ViewModelClass.__vm.onShowTrigger(!ViewModelClass.__vm.onShowTrigger());
								}

								delegateRun(ViewModelClass.__vm, 'onShowWithDelay', [], 200);
								vmRunHook('view-model-on-show', ViewModelClass);
							}

						});
					}
				}
				// --

				cross = vmScreen.__cross ? vmScreen.__cross() : null;
				if (cross)
				{
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
export function startScreens(screensClasses)
{
	_.each(screensClasses, (CScreen) => {
		if (CScreen)
		{
			const
				vmScreen = new CScreen(),
				screenName = vmScreen ? vmScreen.screenName() : '';

			if (vmScreen && '' !== screenName)
			{
				if ('' === defaultScreenName)
				{
					defaultScreenName = screenName;
				}

				SCREENS[screenName] = vmScreen;
			}
		}
	});

	_.each(SCREENS, (vmScreen) => {
		if (vmScreen && !vmScreen.__started && vmScreen.__start)
		{
			vmScreen.__started = true;
			vmScreen.__start();

			runHook('screen-pre-start', [vmScreen.screenName(), vmScreen]);
			delegateRun(vmScreen, 'onStart');
			runHook('screen-post-start', [vmScreen.screenName(), vmScreen]);
		}
	});

	const cross = crossroads.create();
	cross.addRoute(/^([a-zA-Z0-9\-]*)\/?(.*)$/, screenOnRoute);

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
export function setHash(hash, silence = false, replace = false)
{
	hash = '#' === hash.substr(0, 1) ? hash.substr(1) : hash;
	hash = '/' === hash.substr(0, 1) ? hash.substr(1) : hash;

	const cmd = replace ? 'replaceHash' : 'setHash';

	if (silence)
	{
		hasher.changed.active = false;
		hasher[cmd](hash);
		hasher.changed.active = true;
	}
	else
	{
		hasher.changed.active = true;
		hasher[cmd](hash);
		hasher.setHash(hash);
	}
}
