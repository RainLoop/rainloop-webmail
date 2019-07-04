import window from 'window';
import _ from '_';
import $ from '$';
import Opentip from 'Opentip';
import Pikaday from 'pikaday';

import { SaveSettingsStep, Magics } from 'Common/Enums';

const ko = window.ko,
	$win = $(window),
	fDisposalTooltipHelper = (element) => {
		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			if (element && element.__opentip) {
				element.__opentip.deactivate();
			}
		});
	};

ko.bindingHandlers.updateWidth = {
	init: (element, fValueAccessor) => {
		const $el = $(element),
			fValue = fValueAccessor(),
			fInit = () => {
				fValue($el.width());
				window.setTimeout(() => {
					fValue($el.width());
				}, Magics.Time500ms);
			};

		$win.on('resize', fInit);
		fInit();

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$win.off('resize', fInit);
		});
	}
};

ko.bindingHandlers.editor = {
	init: (element, fValueAccessor) => {
		let editor = null;

		const fValue = fValueAccessor(),
			HtmlEditor = require('Common/HtmlEditor').default,
			fUpdateEditorValue = () => {
				if (fValue && fValue.__editor) {
					fValue.__editor.setHtmlOrPlain(fValue());
				}
			},
			fUpdateKoValue = () => {
				if (fValue && fValue.__editor) {
					fValue(fValue.__editor.getDataWithHtmlMark());
				}
			},
			fOnReady = () => {
				fValue.__editor = editor;
				fUpdateEditorValue();
			};

		if (ko.isObservable(fValue) && HtmlEditor) {
			editor = new HtmlEditor(element, fUpdateKoValue, fOnReady, fUpdateKoValue);

			fValue.__fetchEditorValue = fUpdateKoValue;

			fValue.subscribe(fUpdateEditorValue);

			// ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			// });
		}
	}
};

ko.bindingHandlers.json = {
	init: (element, fValueAccessor) => {
		$(element).text(window.JSON.stringify(ko.unwrap(fValueAccessor())));
	},
	update: (element, fValueAccessor) => {
		$(element).text(window.JSON.stringify(ko.unwrap(fValueAccessor())));
	}
};

ko.bindingHandlers.scrollerShadows = {
	init: (element) => {
		const limit = 8,
			$el = $(element),
			cont = $el.find('[data-scroller-shadows-content]')[0] || null,
			fFunc = _.throttle(() => {
				$el
					.toggleClass('scroller-shadow-top', limit < cont.scrollTop)
					.toggleClass('scroller-shadow-bottom', cont.scrollTop + limit < cont.scrollHeight - cont.clientHeight);
			}, 100);

		if (cont) {
			$(cont).on('scroll resize', fFunc);
			$win.on('resize', fFunc);

			ko.utils.domNodeDisposal.addDisposeCallback(cont, () => {
				$(cont).off();
				$win.off('resize', fFunc);
			});
		}
	}
};

ko.bindingHandlers.pikaday = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel, bindingContext) => {
		ko.bindingHandlers.textInput.init(element, fValueAccessor, fAllBindingsAccessor, viewModel, bindingContext);

		if (Pikaday) {
			element.__pikaday = new Pikaday({
				field: element
			});
		}
	}
};

ko.bindingHandlers.visibleAnimated = {
	init: (element, fValueAccessor) => {
		const $el = $(element);
		$el.addClass('rl-animated-inited');
		if (ko.unwrap(fValueAccessor())) {
			$el.show();
		} else {
			$el.hide();
		}
	},
	update: (element, fValueAccessor) => {
		const $el = $(element);
		if (ko.unwrap(fValueAccessor())) {
			$el.addClass('rl-animated-hidden').show();
			_.delay(() => {
				$el.removeClass('rl-animated-hidden');
			}, 10);
		} else {
			$el.hide().removeClass('rl-animated-hidden');
		}
	}
};

ko.bindingHandlers.tooltip = {
	init: (element, fValueAccessor) => {
		const $el = $(element),
			fValue = fValueAccessor(),
			isMobile = 'on' === ($el.data('tooltip-mobile') || 'off'),
			isI18N = 'on' === ($el.data('tooltip-i18n') || 'on'),
			Globals = require('Common/Globals');

		if (!Globals.bMobileDevice || isMobile) {
			const sValue = !ko.isObservable(fValue) && _.isFunction(fValue) ? fValue() : ko.unwrap(fValue);

			element.__opentip = new Opentip(element, {
				'style': 'rainloopTip',
				'element': element,
				'tipJoint': $el.data('tooltip-join') || 'bottom'
			});

			Globals.dropdownVisibility.subscribe((v) => {
				if (v) {
					element.__opentip.hide();
				}
			});

			if ('' === sValue) {
				element.__opentip.hide();
				element.__opentip.deactivate();
				element.__opentip.setContent('');
			} else {
				element.__opentip.activate();
			}

			if (isI18N) {
				const Translator = require('Common/Translator');

				element.__opentip.setContent(Translator.i18n(sValue));

				Translator.trigger.subscribe(() => {
					element.__opentip.setContent(Translator.i18n(sValue));
				});

				Globals.dropdownVisibility.subscribe(() => {
					if (element && element.__opentip) {
						element.__opentip.setContent(Translator.i18n(sValue));
					}
				});
			} else {
				element.__opentip.setContent(sValue);
			}

			$win.on('rl.tooltips.diactivate', () => {
				element.__opentip.hide();
				element.__opentip.deactivate();
			});

			$win.on('rl.tooltips.activate', () => {
				element.__opentip.activate();
			});
		}
	},
	update: (element, fValueAccessor) => {
		const $el = $(element),
			fValue = fValueAccessor(),
			isMobile = 'on' === ($el.data('tooltip-mobile') || 'off'),
			isI18N = 'on' === ($el.data('tooltip-i18n') || 'on'),
			Globals = require('Common/Globals');

		if ((!Globals.bMobileDevice || isMobile) && element.__opentip) {
			const sValue = !ko.isObservable(fValue) && _.isFunction(fValue) ? fValue() : ko.unwrap(fValue);
			if (sValue) {
				element.__opentip.setContent(isI18N ? require('Common/Translator').i18n(sValue) : sValue);
				element.__opentip.activate();
			} else {
				element.__opentip.hide();
				element.__opentip.deactivate();
				element.__opentip.setContent('');
			}
		}
	}
};

ko.bindingHandlers.tooltipErrorTip = {
	init: function(element) {
		const $el = $(element);

		element.__opentip = new Opentip(element, {
			style: 'rainloopErrorTip',
			hideOn: 'mouseout click',
			element: element,
			tipJoint: $el.data('tooltip-join') || 'top'
		});

		element.__opentip.deactivate();

		$(window.document).on('click', () => {
			if (element && element.__opentip) {
				element.__opentip.hide();
			}
		});

		fDisposalTooltipHelper(element);
	},
	update: (element, fValueAccessor) => {
		const $el = $(element),
			fValue = fValueAccessor(),
			value = !ko.isObservable(fValue) && _.isFunction(fValue) ? fValue() : ko.unwrap(fValue),
			openTips = element.__opentip;

		if (openTips) {
			if ('' === value) {
				openTips.hide();
				openTips.deactivate();
				openTips.setContent('');
			} else {
				_.delay(() => {
					if ($el.is(':visible')) {
						openTips.setContent(value);
						openTips.activate();
						openTips.show();
					} else {
						openTips.hide();
						openTips.deactivate();
						openTips.setContent('');
					}
				}, Magics.Time100ms);
			}
		}
	}
};

ko.bindingHandlers.registrateBootstrapDropdown = {
	init: (element) => {
		const Globals = require('Common/Globals');
		if (Globals && Globals.data.aBootstrapDropdowns) {
			Globals.data.aBootstrapDropdowns.push($(element));

			$(element).click(() => {
				require('Common/Utils').detectDropdownVisibility();
			});

			// ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			// });
		}
	}
};

ko.bindingHandlers.openDropdownTrigger = {
	update: (element, fValueAccessor) => {
		if (ko.unwrap(fValueAccessor())) {
			const $el = $(element);
			if (!$el.hasClass('open')) {
				$el.find('.dropdown-toggle').dropdown('toggle');
			}

			$el.find('.dropdown-toggle').focus();

			require('Common/Utils').detectDropdownVisibility();
			fValueAccessor()(false);
		}
	}
};

ko.bindingHandlers.dropdownCloser = {
	init: (element) => {
		$(element)
			.closest('.dropdown')
			.on('click', '.e-item', () => {
				$(element).dropdown('toggle');
			});
	}
};

ko.bindingHandlers.popover = {
	init: function(element, fValueAccessor) {
		$(element).popover(ko.unwrap(fValueAccessor()));

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).popover('destroy');
		});
	}
};

ko.bindingHandlers.csstext = {};
ko.bindingHandlers.csstext.init = ko.bindingHandlers.csstext.update = (element, fValueAccessor) => {
	if (element && element.styleSheet && 'undefined' !== typeof element.styleSheet.cssText) {
		element.styleSheet.cssText = ko.unwrap(fValueAccessor());
	} else {
		$(element).text(ko.unwrap(fValueAccessor()));
	}
};

ko.bindingHandlers.resizecrop = {
	init: (element) => {
		$(element)
			.addClass('resizecrop')
			.resizecrop({
				'width': '100',
				'height': '100',
				'wrapperCSS': {
					'border-radius': '10px'
				}
			});
	},
	update: (element, fValueAccessor) => {
		fValueAccessor()();
		$(element).resizecrop({
			'width': '100',
			'height': '100'
		});
	}
};

ko.bindingHandlers.onKeyDown = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		$(element).on('keydown.koOnKeyDown', (event) => {
			if (event) {
				return fValueAccessor().call(viewModel, event);
			}

			return true;
		});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).off('keydown.koOnKeyDown');
		});
	}
};

ko.bindingHandlers.onEnter = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		$(element).on('keypress.koOnEnter', (event) => {
			if (event && 13 === window.parseInt(event.keyCode, 10)) {
				$(element).trigger('change');
				fValueAccessor().call(viewModel);
			}
		});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).off('keypress.koOnEnter');
		});
	}
};

ko.bindingHandlers.onSpace = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		$(element).on('keyup.koOnSpace', (event) => {
			if (event && 32 === window.parseInt(event.keyCode, 10)) {
				fValueAccessor().call(viewModel, event);
			}
		});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).off('keyup.koOnSpace');
		});
	}
};

ko.bindingHandlers.onTab = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		$(element).on('keydown.koOnTab', (event) => {
			if (event && 9 === window.parseInt(event.keyCode, 10)) {
				return fValueAccessor().call(viewModel, !!event.shiftKey);
			}
			return true;
		});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).off('keydown.koOnTab');
		});
	}
};

ko.bindingHandlers.onEsc = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		$(element).on('keyup.koOnEsc', (event) => {
			if (event && 27 === window.parseInt(event.keyCode, 10)) {
				$(element).trigger('change');
				fValueAccessor().call(viewModel);
			}
		});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).off('keyup.koOnEsc');
		});
	}
};

ko.bindingHandlers.clickOnTrue = {
	update: (element, fValueAccessor) => {
		if (ko.unwrap(fValueAccessor())) {
			$(element).click();
		}
	}
};

ko.bindingHandlers.modal = {
	init: (element, fValueAccessor) => {
		const Globals = require('Common/Globals'),
			Utils = require('Common/Utils');

		$(element)
			.toggleClass('fade', !Globals.bMobileDevice)
			.modal({
				'keyboard': false,
				'show': ko.unwrap(fValueAccessor())
			})
			.on('shown.koModal', Utils.windowResizeCallback)
			.find('.close')
			.on('click.koModal', () => {
				fValueAccessor()(false);
			});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element)
				.off('shown.koModal')
				.find('.close')
				.off('click.koModal');
		});
	},
	update: (element, fValueAccessor) => {
		const Globals = require('Common/Globals');

		$(element).modal(ko.unwrap(fValueAccessor()) ? 'show' : 'hide');

		if (Globals.$html.hasClass('rl-anim')) {
			Globals.$html.addClass('rl-modal-animation');
			_.delay(() => {
				Globals.$html.removeClass('rl-modal-animation');
			}, Magics.Time500ms);
		}
	}
};

ko.bindingHandlers.moment = {
	init: (element, fValueAccessor) => {
		require('Common/Momentor').momentToNode(
			$(element)
				.addClass('moment')
				.data('moment-time', ko.unwrap(fValueAccessor()))
		);
	},
	update: (element, fValueAccessor) => {
		require('Common/Momentor').momentToNode($(element).data('moment-time', ko.unwrap(fValueAccessor())));
	}
};

ko.bindingHandlers.i18nInit = {
	init: (element) => {
		require('Common/Translator').i18nToNodes(element);
	}
};

ko.bindingHandlers.translatorInit = {
	init: (element) => {
		require('Common/Translator').i18nToNodes(element);
	}
};

ko.bindingHandlers.i18nUpdate = {
	update: (element, fValueAccessor) => {
		ko.unwrap(fValueAccessor());
		require('Common/Translator').i18nToNodes(element);
	}
};

ko.bindingHandlers.link = {
	update: function(element, fValueAccessor) {
		$(element).attr('href', ko.unwrap(fValueAccessor()));
	}
};

ko.bindingHandlers.title = {
	update: function(element, fValueAccessor) {
		$(element).attr('title', ko.unwrap(fValueAccessor()));
	}
};

ko.bindingHandlers.textF = {
	init: function(element, fValueAccessor) {
		$(element).text(ko.unwrap(fValueAccessor()));
	}
};

ko.bindingHandlers.initDom = {
	init: function(element, fValueAccessor) {
		fValueAccessor()(element);
	}
};

ko.bindingHandlers.initFixedTrigger = {
	init: (element, fValueAccessor) => {
		const values = ko.unwrap(fValueAccessor()),
			$el = $(element),
			top = values[1] || 0;

		let $container = $(values[0] || null);
		$container = $container[0] ? $container : null;
		if ($container) {
			$win.resize(() => {
				const offset = $container ? $container.offset() : null;
				if (offset && offset.top) {
					$el.css('top', offset.top + top);
				}
			});
		}
	}
};

ko.bindingHandlers.initResizeTrigger = {
	init: (element, fValueAccessor) => {
		const values = ko.unwrap(fValueAccessor());
		$(element).css({
			'height': values[1],
			'min-height': values[1]
		});
	},
	update: (oElement, fValueAccessor) => {
		const Utils = require('Common/Utils'),
			Globals = require('Common/Globals'),
			values = ko.unwrap(fValueAccessor());

		let value = Utils.pInt(values[1]),
			size = 0,
			offset = $(oElement).offset().top;

		if (0 < offset) {
			offset += Utils.pInt(values[2]);
			size = Globals.$win.height() - offset;

			if (value < size) {
				value = size;
			}

			$(oElement).css({
				'height': value,
				'min-height': value
			});
		}
	}
};

ko.bindingHandlers.appendDom = {
	update: (element, fValueAccessor) => {
		$(element)
			.hide()
			.empty()
			.append(ko.unwrap(fValueAccessor()))
			.show();
	}
};

ko.bindingHandlers.draggable = {
	init: (element, fValueAccessor, fAllBindingsAccessor) => {
		const Globals = require('Common/Globals'),
			Utils = require('Common/Utils');

		if (!Globals.bMobileDevice) {
			const triggerZone = 100,
				scrollSpeed = 3,
				fAllValueFunc = fAllBindingsAccessor(),
				droppableSelector = fAllValueFunc && fAllValueFunc.droppableSelector ? fAllValueFunc.droppableSelector : '',
				conf = {
					distance: 20,
					handle: '.dragHandle',
					cursorAt: { top: 22, left: 3 },
					refreshPositions: true,
					scroll: true,
					drag: null,
					stop: null,
					helper: null
				};

			if (droppableSelector) {
				conf.drag = (event) => {
					$(droppableSelector).each(function() {
						const $this = $(this), // eslint-disable-line no-invalid-this
							offset = $this.offset(),
							bottomPos = offset.top + $this.height();

						window.clearInterval($this.data('timerScroll'));
						$this.data('timerScroll', false);

						if (event.pageX >= offset.left && event.pageX <= offset.left + $this.width()) {
							if (event.pageY >= bottomPos - triggerZone && event.pageY <= bottomPos) {
								const moveUp = () => {
									$this.scrollTop($this.scrollTop() + scrollSpeed);
									Utils.windowResize();
								};

								$this.data('timerScroll', window.setInterval(moveUp, 10));
								moveUp();
							}

							if (event.pageY >= offset.top && event.pageY <= offset.top + triggerZone) {
								const moveDown = () => {
									$this.scrollTop($this.scrollTop() - scrollSpeed);
									Utils.windowResize();
								};

								$this.data('timerScroll', window.setInterval(moveDown, 10));
								moveDown();
							}
						}
					});
				};

				conf.stop = () => {
					$(droppableSelector).each(function() {
						const $this = $(this); // eslint-disable-line no-invalid-this
						window.clearInterval($this.data('timerScroll'));
						$this.data('timerScroll', false);
					});
				};
			}

			conf.helper = (event) => fValueAccessor()(event && event.target ? ko.dataFor(event.target) : null);

			$(element)
				.draggable(conf)
				.on('mousedown.koDraggable', () => {
					Utils.removeInFocus();
				});

			ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
				$(element)
					.off('mousedown.koDraggable')
					.draggable('destroy');
			});
		}
	}
};

ko.bindingHandlers.droppable = {
	init: (element, fValueAccessor, fAllBindingsAccessor) => {
		const Globals = require('Common/Globals');
		if (!Globals.bMobileDevice) {
			const fValueFunc = fValueAccessor(),
				fAllValueFunc = fAllBindingsAccessor(),
				fOverCallback = fAllValueFunc && fAllValueFunc.droppableOver ? fAllValueFunc.droppableOver : null,
				fOutCallback = fAllValueFunc && fAllValueFunc.droppableOut ? fAllValueFunc.droppableOut : null,
				conf = {
					tolerance: 'pointer',
					hoverClass: 'droppableHover',
					drop: null,
					over: null,
					out: null
				};

			if (fValueFunc) {
				conf.drop = (event, ui) => {
					fValueFunc(event, ui);
				};

				if (fOverCallback) {
					conf.over = (event, ui) => {
						fOverCallback(event, ui);
					};
				}

				if (fOutCallback) {
					conf.out = (event, ui) => {
						fOutCallback(event, ui);
					};
				}

				$(element).droppable(conf);

				ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
					$(element).droppable('destroy');
				});
			}
		}
	}
};

ko.bindingHandlers.nano = {
	init: (element) => {
		const Globals = require('Common/Globals'),
			Settings = require('Storage/Settings');

		if (!Globals.bDisableNanoScroll && !Settings.appSettingsGet('useNativeScrollbars')) {
			$(element)
				.addClass('nano')
				.nanoScroller({
					iOSNativeScrolling: false,
					preventPageScrolling: true
				});
		}
	}
};

ko.bindingHandlers.saveTrigger = {
	init: (element) => {
		const $el = $(element);

		$el.data(
			'save-trigger-type',
			$el.is('input[type=text],input[type=email],input[type=password],select,textarea') ? 'input' : 'custom'
		);

		if ('custom' === $el.data('save-trigger-type')) {
			$el
				.append(
					'&nbsp;&nbsp;' +
						'<i class="icon-spinner animated"></i>' +
						'<i class="icon-remove error"></i>' +
						'<i class="icon-ok success"></i>'
				)
				.addClass('settings-saved-trigger');
		} else {
			$el.addClass('settings-saved-trigger-input');
		}
	},
	update: (element, fValueAccessor) => {
		const value = ko.unwrap(fValueAccessor()),
			$el = $(element);

		if ('custom' === $el.data('save-trigger-type')) {
			switch (value.toString()) {
				case '1':
					$el
						.find('.animated,.error')
						.hide()
						.removeClass('visible')
						.end()
						.find('.success')
						.show()
						.addClass('visible');
					break;
				case '0':
					$el
						.find('.animated,.success')
						.hide()
						.removeClass('visible')
						.end()
						.find('.error')
						.show()
						.addClass('visible');
					break;
				case '-2':
					$el
						.find('.error,.success')
						.hide()
						.removeClass('visible')
						.end()
						.find('.animated')
						.show()
						.addClass('visible');
					break;
				default:
					$el
						.find('.animated')
						.hide()
						.end()
						.find('.error,.success')
						.removeClass('visible');
					break;
			}
		} else {
			switch (value.toString()) {
				case '1':
					$el.addClass('success').removeClass('error');
					break;
				case '0':
					$el.addClass('error').removeClass('success');
					break;
				case '-2':
					break;
				default:
					$el.removeClass('error success');
					break;
			}
		}
	}
};

ko.bindingHandlers.emailsTags = {
	init: (element, fValueAccessor, fAllBindingsAccessor) => {
		const Utils = require('Common/Utils'),
			EmailModel = require('Model/Email').default,
			$el = $(element),
			fValue = fValueAccessor(),
			fAllBindings = fAllBindingsAccessor(),
			fAutoCompleteSource = fAllBindings.autoCompleteSource || null,
			inputDelimiters = [',', ';', '\n'],
			fFocusCallback = (value) => {
				if (fValue && fValue.focused) {
					fValue.focused(!!value);
				}
			};

		$el.inputosaurus({
			parseOnBlur: true,
			allowDragAndDrop: true,
			focusCallback: fFocusCallback,
			inputDelimiters: inputDelimiters,
			autoCompleteSource: fAutoCompleteSource,
			splitHook: (value) => {
				const v = Utils.trim(value);
				if (v && -1 < inputDelimiters.indexOf(v.substr(-1))) {
					return EmailModel.splitEmailLine(value);
				}
				return null;
			},
			parseHook: (input) =>
				_.map(
					_.flatten(
						_.map(input, (inputValue) => {
							const values = EmailModel.parseEmailLine(inputValue);
							return values.length ? values : inputValue;
						})
					),
					(item) => (_.isObject(item) ? [item.toLine(false), item] : [item, null])
				),
			change: (event) => {
				$el.data('EmailsTagsValue', event.target.value);
				fValue(event.target.value);
			}
		});

		if (fValue && fValue.focused && fValue.focused.subscribe) {
			fValue.focused.subscribe((value) => {
				$el.inputosaurus(value ? 'focus' : 'blur');
			});
		}
	},
	update: (element, fValueAccessor) => {
		const $oEl = $(element),
			fValue = fValueAccessor(),
			value = ko.unwrap(fValue);

		if ($oEl.data('EmailsTagsValue') !== value) {
			$oEl.val(value);
			$oEl.data('EmailsTagsValue', value);
			$oEl.inputosaurus('refresh');
		}
	}
};

ko.bindingHandlers.command = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel, bindingContext) => {
		const jqElement = $(element),
			command = fValueAccessor();

		if (!command || !command.isCommand) {
			throw new Error('Value should be a command');
		}

		if (!command.enabled) {
			command.enabled = ko.observable(true);
		}

		if (!command.canExecute) {
			const __realCanExecute = command.__realCanExecute;
			if (_.isFunction(__realCanExecute)) {
				command.canExecute = ko.computed(() => command.enabled() && __realCanExecute.call(viewModel, viewModel));
			} else {
				command.canExecute = ko.computed(() => command.enabled() && !!__realCanExecute);
			}
		}

		jqElement.addClass('command');
		ko.bindingHandlers[jqElement.is('form') ? 'submit' : 'click'].init(
			element,
			fValueAccessor,
			fAllBindingsAccessor,
			viewModel,
			bindingContext
		);
	},
	update: (element, fValueAccessor) => {
		const jqElement = $(element),
			command = fValueAccessor();

		let result = command.enabled();

		jqElement.toggleClass('command-not-enabled', !result);

		if (result) {
			result = command.canExecute();
			jqElement.toggleClass('command-can-not-be-execute', !result);
		}

		jqElement.toggleClass('command-disabled disable disabled', !result).toggleClass('no-disabled', !!result);

		if (jqElement.is('input') || jqElement.is('button')) {
			jqElement.prop('disabled', !result);
		}
	}
};

// extenders

ko.extenders.trimmer = (target) => {
	const Utils = require('Common/Utils'),
		result = ko.computed({
			read: target,
			write: (newValue) => {
				target(Utils.trim(newValue.toString()));
			}
		});

	result(target());
	return result;
};

ko.extenders.posInterer = (target, defaultVal) => {
	const Utils = require('Common/Utils'),
		result = ko.computed({
			read: target,
			write: (newValue) => {
				let val = Utils.pInt(newValue.toString(), defaultVal);
				if (0 >= val) {
					val = defaultVal;
				}

				if (val === target() && '' + val !== '' + newValue) {
					target(val + 1);
				}

				target(val);
			}
		});

	result(target());
	return result;
};

ko.extenders.limitedList = (target, limitedList) => {
	const Utils = require('Common/Utils'),
		result = ko
			.computed({
				read: target,
				write: (newValue) => {
					const currentValue = ko.unwrap(target),
						list = ko.unwrap(limitedList);

					if (Utils.isNonEmptyArray(list)) {
						if (-1 < Utils.inArray(newValue, list)) {
							target(newValue);
						} else if (-1 < Utils.inArray(currentValue, list)) {
							target(currentValue + ' ');
							target(currentValue);
						} else {
							target(list[0] + ' ');
							target(list[0]);
						}
					} else {
						target('');
					}
				}
			})
			.extend({ notify: 'always' });

	result(target());

	if (!result.valueHasMutated) {
		result.valueHasMutated = () => {
			target.valueHasMutated();
		};
	}

	return result;
};

ko.extenders.reversible = (target) => {
	let value = target();

	target.commit = () => {
		value = target();
	};

	target.reverse = () => {
		target(value);
	};

	target.commitedValue = () => value;
	return target;
};

ko.extenders.toggleSubscribe = (target, options) => {
	target.subscribe(options[1], options[0], 'beforeChange');
	target.subscribe(options[2], options[0]);
	return target;
};

ko.extenders.toggleSubscribeProperty = (target, options) => {
	const prop = options[1];
	if (prop) {
		target.subscribe(
			(prev) => {
				if (prev && prev[prop]) {
					prev[prop](false);
				}
			},
			options[0],
			'beforeChange'
		);

		target.subscribe((next) => {
			if (next && next[prop]) {
				next[prop](true);
			}
		}, options[0]);
	}

	return target;
};

ko.extenders.falseTimeout = (target, option) => {
	target.iFalseTimeoutTimeout = 0;
	target.subscribe((value) => {
		if (value) {
			window.clearTimeout(target.iFalseTimeoutTimeout);
			target.iFalseTimeoutTimeout = window.setTimeout(() => {
				target(false);
				target.iFalseTimeoutTimeout = 0;
			}, require('Common/Utils').pInt(option));
		}
	});

	return target;
};

ko.extenders.specialThrottle = (target, option) => {
	target.iSpecialThrottleTimeoutValue = require('Common/Utils').pInt(option);
	if (0 < target.iSpecialThrottleTimeoutValue) {
		target.iSpecialThrottleTimeout = 0;
		target.valueForRead = ko.observable(!!target()).extend({ throttle: 10 });

		return ko.computed({
			read: target.valueForRead,
			write: (bValue) => {
				if (bValue) {
					target.valueForRead(bValue);
				} else {
					if (target.valueForRead()) {
						window.clearTimeout(target.iSpecialThrottleTimeout);
						target.iSpecialThrottleTimeout = window.setTimeout(() => {
							target.valueForRead(false);
							target.iSpecialThrottleTimeout = 0;
						}, target.iSpecialThrottleTimeoutValue);
					} else {
						target.valueForRead(bValue);
					}
				}
			}
		});
	}

	return target;
};

ko.extenders.idleTrigger = (target) => {
	target.trigger = ko.observable(SaveSettingsStep.Idle);
	return target;
};

// functions

ko.observable.fn.idleTrigger = function() {
	return this.extend({ 'idleTrigger': true });
};

ko.observable.fn.validateNone = function() {
	this.hasError = ko.observable(false);
	return this;
};

ko.observable.fn.validateEmail = function() {
	this.hasError = ko.observable(false);

	this.subscribe((value) => {
		this.hasError('' !== value && !/^[^@\s]+@[^@\s]+$/.test(value));
	});

	this.valueHasMutated();
	return this;
};

ko.observable.fn.validateSimpleEmail = function() {
	this.hasError = ko.observable(false);

	this.subscribe((value) => {
		this.hasError('' !== value && !/^.+@.+$/.test(value));
	});

	this.valueHasMutated();
	return this;
};

ko.observable.fn.deleteAccessHelper = function() {
	this.extend({ falseTimeout: 3000 }).extend({ toggleSubscribeProperty: [this, 'deleteAccess'] });
	return this;
};

ko.observable.fn.validateFunc = function(fFunc) {
	this.hasFuncError = ko.observable(false);

	if (_.isFunction(fFunc)) {
		this.subscribe((value) => {
			this.hasFuncError(!fFunc(value));
		});

		this.valueHasMutated();
	}

	return this;
};

export default ko;
