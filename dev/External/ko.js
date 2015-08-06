
(function (ko) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		JSON = require('JSON'),
		Opentip = require('Opentip'),

		fDisposalTooltipHelper = function (oElement) {
			ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {

				if (oElement && oElement.__opentip)
				{
					oElement.__opentip.deactivate();
				}
			});
		}
	;

	ko.bindingHandlers.editor = {
		'init': function (oElement, fValueAccessor) {

			var
				oEditor  = null,
				fValue = fValueAccessor(),

				fUpdateEditorValue = function () {
					if (fValue && fValue.__editor)
					{
						fValue.__editor.setHtmlOrPlain(fValue());
					}
				},

				fUpdateKoValue = function () {
					if (fValue && fValue.__editor)
					{
						fValue(fValue.__editor.getDataWithHtmlMark());
					}
				},

				fOnReady = function () {
					fValue.__editor = oEditor;
					fUpdateEditorValue();
				},

				HtmlEditor = require('Common/HtmlEditor')
			;

			if (ko.isObservable(fValue) && HtmlEditor)
			{
				oEditor = new HtmlEditor(oElement, fUpdateKoValue, fOnReady, fUpdateKoValue);

				fValue.__fetchEditorValue = fUpdateKoValue;

				fValue.subscribe(fUpdateEditorValue);

//				ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
//				});
			}
		}
	};

	ko.bindingHandlers.json = {
		'init': function (oElement, fValueAccessor) {
			$(oElement).text(JSON.stringify(ko.unwrap(fValueAccessor())));
		},
		'update': function (oElement, fValueAccessor) {
			$(oElement).text(JSON.stringify(ko.unwrap(fValueAccessor())));
		}
	};

	ko.bindingHandlers.tooltip = {
		'init': function (oElement, fValueAccessor) {

			var
				bi18n = true,
				sValue = '',
				Translator = null,
				$oEl = $(oElement),
				fValue = fValueAccessor(),
				bMobile = 'on' === ($oEl.data('tooltip-mobile') || 'off'),
				Globals = require('Common/Globals')
			;

			if (!Globals.bMobileDevice || bMobile)
			{
				bi18n = 'on' === ($oEl.data('tooltip-i18n') || 'on');
				sValue = !ko.isObservable(fValue) && _.isFunction(fValue) ? fValue() : ko.unwrap(fValue);

				oElement.__opentip = new Opentip(oElement, {
					'style': 'rainloopTip',
					'element': oElement,
					'tipJoint': $oEl.data('tooltip-join') || 'bottom'
				});

				Globals.dropdownVisibility.subscribe(function (bV) {
					if (bV) {
						oElement.__opentip.hide();
					}
				});

				if ('' === sValue)
				{
					oElement.__opentip.hide();
					oElement.__opentip.deactivate();
					oElement.__opentip.setContent('');
				}
				else
				{
					oElement.__opentip.activate();
				}

				if (bi18n)
				{
					Translator = require('Common/Translator');

					oElement.__opentip.setContent(Translator.i18n(sValue));

					Translator.trigger.subscribe(function () {
						oElement.__opentip.setContent(Translator.i18n(sValue));
					});

					Globals.dropdownVisibility.subscribe(function () {
						if (oElement && oElement.__opentip)
						{
							oElement.__opentip.setContent(require('Common/Translator').i18n(sValue));
						}
					});
				}
				else
				{
					oElement.__opentip.setContent(sValue);
				}
			}
		},
		'update': function (oElement, fValueAccessor) {

			var
				bi18n = true,
				sValue = '',
				$oEl = $(oElement),
				fValue = fValueAccessor(),
				bMobile = 'on' === ($oEl.data('tooltip-mobile') || 'off'),
				Globals = require('Common/Globals')
			;

			if ((!Globals.bMobileDevice || bMobile) && oElement.__opentip)
			{
				bi18n = 'on' === ($oEl.data('tooltip-i18n') || 'on');
				sValue = !ko.isObservable(fValue) && _.isFunction(fValue) ? fValue() : ko.unwrap(fValue);

				if (sValue)
				{
					oElement.__opentip.setContent(
						bi18n ? require('Common/Translator').i18n(sValue) : sValue);
					oElement.__opentip.activate();
				}
				else
				{
					oElement.__opentip.hide();
					oElement.__opentip.deactivate();
					oElement.__opentip.setContent('');
				}
			}
		}
	};

	ko.bindingHandlers.tooltipErrorTip = {
		'init': function (oElement) {

			var $oEl = $(oElement);

			oElement.__opentip = new Opentip(oElement, {
				'style': 'rainloopErrorTip',
				'hideOn': 'mouseout click',
				'element': oElement,
				'tipJoint': $oEl.data('tooltip-join') || 'top'
			});

			oElement.__opentip.deactivate();

			$(window.document).on('click', function () {
				if (oElement && oElement.__opentip)
				{
					oElement.__opentip.hide();
				}
			});

			fDisposalTooltipHelper(oElement);
		},
		'update': function (oElement, fValueAccessor) {

			var
				$oEl = $(oElement),
				fValue = fValueAccessor(),
				sValue = !ko.isObservable(fValue) && _.isFunction(fValue) ? fValue() : ko.unwrap(fValue),
				oOpenTips = oElement.__opentip
			;

			if (oOpenTips)
			{
				if ('' === sValue)
				{
					oOpenTips.hide();
					oOpenTips.deactivate();
					oOpenTips.setContent('');
				}
				else
				{
					_.delay(function () {
						if ($oEl.is(':visible'))
						{
							oOpenTips.setContent(sValue);
							oOpenTips.activate();
							oOpenTips.show();
						}
						else
						{
							oOpenTips.hide();
							oOpenTips.deactivate();
							oOpenTips.setContent('');
						}
					}, 100);
				}
			}
		}
	};

	ko.bindingHandlers.registrateBootstrapDropdown = {
		'init': function (oElement) {
			var Globals = require('Common/Globals');
			if (Globals && Globals.aBootstrapDropdowns)
			{
				Globals.aBootstrapDropdowns.push($(oElement));

				$(oElement).click(function () {
					require('Common/Utils').detectDropdownVisibility();
				});

//				ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
//				});
			}
		}
	};

	ko.bindingHandlers.openDropdownTrigger = {
		'update': function (oElement, fValueAccessor) {
			if (ko.unwrap(fValueAccessor()))
			{
				var $oEl = $(oElement);
				if (!$oEl.hasClass('open'))
				{
					$oEl.find('.dropdown-toggle').dropdown('toggle');
				}

				$oEl.find('.dropdown-toggle').focus();

				require('Common/Utils').detectDropdownVisibility();
				fValueAccessor()(false);
			}
		}
	};

	ko.bindingHandlers.dropdownCloser = {
		'init': function (oElement) {
			$(oElement).closest('.dropdown').on('click', '.e-item', function () {
				$(oElement).dropdown('toggle');
			});
		}
	};

	ko.bindingHandlers.popover = {
		'init': function (oElement, fValueAccessor) {
			$(oElement).popover(ko.unwrap(fValueAccessor()));

			ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
				$(oElement).popover('destroy');
			});
		}
	};

	ko.bindingHandlers.csstext = {
		'init': function (oElement, fValueAccessor) {
			if (oElement && oElement.styleSheet && undefined !== oElement.styleSheet.cssText)
			{
				oElement.styleSheet.cssText = ko.unwrap(fValueAccessor());
			}
			else
			{
				$(oElement).text(ko.unwrap(fValueAccessor()));
			}
		},
		'update': function (oElement, fValueAccessor) {
			if (oElement && oElement.styleSheet && undefined !== oElement.styleSheet.cssText)
			{
				oElement.styleSheet.cssText = ko.unwrap(fValueAccessor());
			}
			else
			{
				$(oElement).text(ko.unwrap(fValueAccessor()));
			}
		}
	};

	ko.bindingHandlers.resizecrop = {
		'init': function (oElement) {
			$(oElement).addClass('resizecrop').resizecrop({
				'width': '100',
				'height': '100',
				'wrapperCSS': {
					'border-radius': '10px'
				}
			});
		},
		'update': function (oElement, fValueAccessor) {
			fValueAccessor()();
			$(oElement).resizecrop({
				'width': '100',
				'height': '100'
			});
		}
	};

	ko.bindingHandlers.onEnter = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
			$(oElement).on('keypress.koOnEnter', function (oEvent) {
				if (oEvent && 13 === window.parseInt(oEvent.keyCode, 10))
				{
					$(oElement).trigger('change');
					fValueAccessor().call(oViewModel);
				}
			});

			ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
				$(oElement).off('keypress.koOnEnter');
			});
		}
	};

	ko.bindingHandlers.onSpace = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
			$(oElement).on('keyup.koOnSpace', function (oEvent) {
				if (oEvent && 32 === window.parseInt(oEvent.keyCode, 10))
				{
					fValueAccessor().call(oViewModel, oEvent);
				}
			});

			ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
				$(oElement).off('keyup.koOnSpace');
			});
		}
	};

	ko.bindingHandlers.onTab = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
			$(oElement).on('keydown.koOnTab', function (oEvent) {
				if (oEvent && 9 === window.parseInt(oEvent.keyCode, 10))
				{
					return fValueAccessor().call(oViewModel, !!oEvent.shiftKey);
				}
			});

			ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
				$(oElement).off('keydown.koOnTab');
			});
		}
	};

	ko.bindingHandlers.onEsc = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
			$(oElement).on('keypress.koOnEsc', function (oEvent) {
				if (oEvent && 27 === window.parseInt(oEvent.keyCode, 10))
				{
					$(oElement).trigger('change');
					fValueAccessor().call(oViewModel);
				}
			});

			ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
				$(oElement).off('keypress.koOnEsc');
			});
		}
	};

	ko.bindingHandlers.clickOnTrue = {
		'update': function (oElement, fValueAccessor) {
			if (ko.unwrap(fValueAccessor()))
			{
				$(oElement).click();
			}
		}
	};

	ko.bindingHandlers.modal = {
		'init': function (oElement, fValueAccessor) {

			var
				Globals = require('Common/Globals'),
				Utils = require('Common/Utils')
			;

			$(oElement).toggleClass('fade', !Globals.bMobileDevice).modal({
				'keyboard': false,
				'show': ko.unwrap(fValueAccessor())
			})
			.on('shown.koModal', Utils.windowResizeCallback)
			.find('.close').on('click.koModal', function () {
				fValueAccessor()(false);
			});

			ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
				$(oElement)
					.off('shown.koModal')
					.find('.close')
					.off('click.koModal')
				;
			});
		},
		'update': function (oElement, fValueAccessor) {

			var Globals = require('Common/Globals');

			$(oElement).modal(!!ko.unwrap(fValueAccessor()) ? 'show' : 'hide');

			if (Globals.$html.hasClass('rl-anim'))
			{
				Globals.$html.addClass('rl-modal-animation');
				_.delay(function () {
					Globals.$html.removeClass('rl-modal-animation');
				}, 400);
			}

		}
	};

	ko.bindingHandlers.moment = {
		'init': function (oElement, fValueAccessor) {
			require('Common/Momentor').momentToNode(
				$(oElement).addClass('moment').data('moment-time', ko.unwrap(fValueAccessor()))
			);
		},
		'update': function (oElement, fValueAccessor) {
			require('Common/Momentor').momentToNode(
				$(oElement).data('moment-time', ko.unwrap(fValueAccessor()))
			);
		}
	};

	ko.bindingHandlers.i18nInit = {
		'init': function (oElement) {
			require('Common/Translator').i18nToNodes(oElement);
		}
	};

	ko.bindingHandlers.translatorInit = {
		'init': function (oElement) {
			require('Common/Translator').i18nToNodes(oElement);
		}
	};

	ko.bindingHandlers.i18nUpdate = {
		'update': function (oElement, fValueAccessor) {
			ko.unwrap(fValueAccessor());
			require('Common/Translator').i18nToNodes(oElement);
		}
	};

	ko.bindingHandlers.link = {
		'update': function (oElement, fValueAccessor) {
			$(oElement).attr('href', ko.unwrap(fValueAccessor()));
		}
	};

	ko.bindingHandlers.title = {
		'update': function (oElement, fValueAccessor) {
			$(oElement).attr('title', ko.unwrap(fValueAccessor()));
		}
	};

	ko.bindingHandlers.textF = {
		'init': function (oElement, fValueAccessor) {
			$(oElement).text(ko.unwrap(fValueAccessor()));
		}
	};

	ko.bindingHandlers.initDom = {
		'init': function (oElement, fValueAccessor) {
			fValueAccessor()(oElement);
		}
	};

	ko.bindingHandlers.initFixedTrigger = {
		'init': function (oElement, fValueAccessor) {
			var
				aValues = ko.unwrap(fValueAccessor()),
				$oContainer = null,
				$oElement = $(oElement),
				oOffset = null,

				iTop = aValues[1] || 0
			;

			$oContainer = $(aValues[0] || null);
			$oContainer = $oContainer[0] ? $oContainer : null;

			if ($oContainer)
			{
				$(window).resize(function () {
					oOffset = $oContainer.offset();
					if (oOffset && oOffset.top)
					{
						$oElement.css('top', oOffset.top + iTop);
					}
				});
			}
		}
	};

	ko.bindingHandlers.initResizeTrigger = {
		'init': function (oElement, fValueAccessor) {
			var aValues = ko.unwrap(fValueAccessor());
			$(oElement).css({
				'height': aValues[1],
				'min-height': aValues[1]
			});
		},
		'update': function (oElement, fValueAccessor) {

			var
				Utils = require('Common/Utils'),
				Globals = require('Common/Globals'),
				aValues = ko.unwrap(fValueAccessor()),
				iValue = Utils.pInt(aValues[1]),
				iSize = 0,
				iOffset = $(oElement).offset().top
			;

			if (0 < iOffset)
			{
				iOffset += Utils.pInt(aValues[2]);
				iSize = Globals.$win.height() - iOffset;

				if (iValue < iSize)
				{
					iValue = iSize;
				}

				$(oElement).css({
					'height': iValue,
					'min-height': iValue
				});
			}
		}
	};

	ko.bindingHandlers.appendDom = {
		'update': function (oElement, fValueAccessor) {
			$(oElement).hide().empty().append(ko.unwrap(fValueAccessor())).show();
		}
	};

	ko.bindingHandlers.draggable = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {

			var
				Globals = require('Common/Globals'),
				Utils = require('Common/Utils')
			;

			if (!Globals.bMobileDevice)
			{
				var
					iTriggerZone = 100,
					iScrollSpeed = 3,
					fAllValueFunc = fAllBindingsAccessor(),
					sDroppableSelector = fAllValueFunc && fAllValueFunc['droppableSelector'] ? fAllValueFunc['droppableSelector'] : '',
					oConf = {
						'distance': 20,
						'handle': '.dragHandle',
						'cursorAt': {'top': 22, 'left': 3},
						'refreshPositions': true,
						'scroll': true
					}
				;

				if (sDroppableSelector)
				{
					oConf['drag'] = function (oEvent) {

						$(sDroppableSelector).each(function () {
							var
								moveUp = null,
								moveDown = null,
								$this = $(this),
								oOffset = $this.offset(),
								bottomPos = oOffset.top + $this.height()
							;

							window.clearInterval($this.data('timerScroll'));
							$this.data('timerScroll', false);

							if (oEvent.pageX >= oOffset.left && oEvent.pageX <= oOffset.left + $this.width())
							{
								if (oEvent.pageY >= bottomPos - iTriggerZone && oEvent.pageY <= bottomPos)
								{
									moveUp = function() {
										$this.scrollTop($this.scrollTop() + iScrollSpeed);
										Utils.windowResize();
									};

									$this.data('timerScroll', window.setInterval(moveUp, 10));
									moveUp();
								}

								if (oEvent.pageY >= oOffset.top && oEvent.pageY <= oOffset.top + iTriggerZone)
								{
									moveDown = function() {
										$this.scrollTop($this.scrollTop() - iScrollSpeed);
										Utils.windowResize();
									};

									$this.data('timerScroll', window.setInterval(moveDown, 10));
									moveDown();
								}
							}
						});
					};

					oConf['stop'] =	function() {
						$(sDroppableSelector).each(function () {
							window.clearInterval($(this).data('timerScroll'));
							$(this).data('timerScroll', false);
						});
					};
				}

				oConf['helper'] = function (oEvent) {
					return fValueAccessor()(oEvent && oEvent.target ? ko.dataFor(oEvent.target) : null);
				};

				$(oElement).draggable(oConf).on('mousedown.koDraggable', function () {
					Utils.removeInFocus();
				});

				ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
					$(oElement)
						.off('mousedown.koDraggable')
						.draggable('destroy')
					;
				});
			}
		}
	};

	ko.bindingHandlers.droppable = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {
			var Globals = require('Common/Globals');
			if (!Globals.bMobileDevice)
			{
				var
					fValueFunc = fValueAccessor(),
					fAllValueFunc = fAllBindingsAccessor(),
					fOverCallback = fAllValueFunc && fAllValueFunc['droppableOver'] ? fAllValueFunc['droppableOver'] : null,
					fOutCallback = fAllValueFunc && fAllValueFunc['droppableOut'] ? fAllValueFunc['droppableOut'] : null,
					oConf = {
						'tolerance': 'pointer',
						'hoverClass': 'droppableHover'
					}
				;

				if (fValueFunc)
				{
					oConf['drop'] = function (oEvent, oUi) {
						fValueFunc(oEvent, oUi);
					};

					if (fOverCallback)
					{
						oConf['over'] = function (oEvent, oUi) {
							fOverCallback(oEvent, oUi);
						};
					}

					if (fOutCallback)
					{
						oConf['out'] = function (oEvent, oUi) {
							fOutCallback(oEvent, oUi);
						};
					}

					$(oElement).droppable(oConf);

					ko.utils.domNodeDisposal.addDisposeCallback(oElement, function () {
						$(oElement).droppable('destroy');
					});
				}
			}
		}
	};

	ko.bindingHandlers.nano = {
		'init': function (oElement) {
			var Globals = require('Common/Globals');
			if (!Globals.bDisableNanoScroll)
			{
				$(oElement)
					.addClass('nano')
					.nanoScroller({
						'iOSNativeScrolling': false,
						'preventPageScrolling': true
					})
				;
			}
		}
	};

	ko.bindingHandlers.saveTrigger = {
		'init': function (oElement) {

			var $oEl = $(oElement);

			$oEl.data('save-trigger-type', $oEl.is('input[type=text],input[type=email],input[type=password],select,textarea') ? 'input' : 'custom');

			if ('custom' === $oEl.data('save-trigger-type'))
			{
				$oEl.append(
					'&nbsp;&nbsp;<i class="icon-spinner animated"></i><i class="icon-remove error"></i><i class="icon-ok success"></i>'
				).addClass('settings-saved-trigger');
			}
			else
			{
				$oEl.addClass('settings-saved-trigger-input');
			}
		},
		'update': function (oElement, fValueAccessor) {
			var
				mValue = ko.unwrap(fValueAccessor()),
				$oEl = $(oElement)
			;

			if ('custom' === $oEl.data('save-trigger-type'))
			{
				switch (mValue.toString())
				{
					case '1':
						$oEl
							.find('.animated,.error').hide().removeClass('visible')
							.end()
							.find('.success').show().addClass('visible')
						;
						break;
					case '0':
						$oEl
							.find('.animated,.success').hide().removeClass('visible')
							.end()
							.find('.error').show().addClass('visible')
						;
						break;
					case '-2':
						$oEl
							.find('.error,.success').hide().removeClass('visible')
							.end()
							.find('.animated').show().addClass('visible')
						;
						break;
					default:
						$oEl
							.find('.animated').hide()
							.end()
							.find('.error,.success').removeClass('visible')
						;
						break;
				}
			}
			else
			{
				switch (mValue.toString())
				{
					case '1':
						$oEl.addClass('success').removeClass('error');
						break;
					case '0':
						$oEl.addClass('error').removeClass('success');
						break;
					case '-2':
	//					$oEl;
						break;
					default:
						$oEl.removeClass('error success');
						break;
				}
			}
		}
	};

	ko.bindingHandlers.emailsTags = {
		'init': function(oElement, fValueAccessor, fAllBindingsAccessor) {

			var
				Utils = require('Common/Utils'),
				EmailModel = require('Model/Email'),

				$oEl = $(oElement),
				fValue = fValueAccessor(),
				fAllBindings = fAllBindingsAccessor(),
				fAutoCompleteSource = fAllBindings['autoCompleteSource'] || null,
				fFocusCallback = function (bValue) {
					if (fValue && fValue.focused)
					{
						fValue.focused(!!bValue);
					}
				}
			;

			$oEl.inputosaurus({
				'parseOnBlur': true,
				'allowDragAndDrop': true,
				'focusCallback': fFocusCallback,
				'inputDelimiters': [',', ';', "\n"],
				'autoCompleteSource': fAutoCompleteSource,
//				'elementHook': function (oEl, oItem) {
//					if (oEl && oItem)
//					{
//						oEl.addClass('pgp');
//						window.console.log(arguments);
//					}
//				},
				'parseHook': function (aInput) {

					return _.map(aInput, function (sInputValue) {

						var
							sValue = Utils.trim(sInputValue),
							oEmail = null
						;

						if ('' !== sValue)
						{
							oEmail = new EmailModel();
							oEmail.mailsoParse(sValue);
							return [oEmail.toLine(false), oEmail];
						}

						return [sValue, null];

					});

//					var aResult = [];
//
//					_.each(aInput, function (sInputValue) {
//
//						var
//							aM = null,
//							aValues = [],
//							sValue = Utils.trim(sInputValue),
//							oEmail = null
//						;
//
//						if ('' !== sValue)
//						{
//							aM = sValue.match(/[@]/g);
//							if (aM && 0 < aM.length)
//							{
//								sValue = sValue.replace(/[\r\n]+/g, '; ').replace(/[\s]+/g, ' ');
//								aValues = EmailModel.splitHelper(sValue, ';');
//
//								_.each(aValues, function (sV) {
//
//									oEmail = new EmailModel();
//									oEmail.mailsoParse(sV);
//
//									if (oEmail.email)
//									{
//										aResult.push([oEmail.toLine(false), oEmail]);
//									}
//									else
//									{
//										aResult.push(['', null]);
//									}
//								});
//							}
//							else
//							{
//								aResult.push([sInputValue, null]);
//							}
//						}
//						else
//						{
//							aResult.push([sInputValue, null]);
//						}
//					});
//
//					return aResult;
				},
				'change': _.bind(function (oEvent) {
					$oEl.data('EmailsTagsValue', oEvent.target.value);
					fValue(oEvent.target.value);
				}, this)
			});

			if (fValue && fValue.focused && fValue.focused.subscribe)
			{
				fValue.focused.subscribe(function (bValue) {
					$oEl.inputosaurus(!!bValue ? 'focus' : 'blur');
				});
			}
		},
		'update': function (oElement, fValueAccessor) {

			var
				$oEl = $(oElement),
				fValue = fValueAccessor(),
				sValue = ko.unwrap(fValue)
			;

			if ($oEl.data('EmailsTagsValue') !== sValue)
			{
				$oEl.val(sValue);
				$oEl.data('EmailsTagsValue', sValue);
				$oEl.inputosaurus('refresh');
			}
		}
	};

	ko.bindingHandlers.command = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
			var
				jqElement = $(oElement),
				oCommand = fValueAccessor()
			;

			if (!oCommand || !oCommand.enabled || !oCommand.canExecute)
			{
				throw new Error('You are not using command function');
			}

			jqElement.addClass('command');
			ko.bindingHandlers[jqElement.is('form') ? 'submit' : 'click'].init.apply(oViewModel, arguments);
		},

		'update': function (oElement, fValueAccessor) {

			var
				bResult = true,
				jqElement = $(oElement),
				oCommand = fValueAccessor()
			;

			bResult = oCommand.enabled();
			jqElement.toggleClass('command-not-enabled', !bResult);

			if (bResult)
			{
				bResult = oCommand.canExecute();
				jqElement.toggleClass('command-can-not-be-execute', !bResult);
			}

			jqElement.toggleClass('command-disabled disable disabled', !bResult).toggleClass('no-disabled', !!bResult);

			if (jqElement.is('input') || jqElement.is('button'))
			{
				jqElement.prop('disabled', !bResult);
			}
		}
	};

	// extenders

	ko.extenders.trimmer = function (oTarget)
	{
		var
			Utils = require('Common/Utils'),
			oResult = ko.computed({
				'read': oTarget,
				'write': function (sNewValue) {
					oTarget(Utils.trim(sNewValue.toString()));
				},
				'owner': this
			})
		;

		oResult(oTarget());
		return oResult;
	};

	ko.extenders.posInterer = function (oTarget, iDefault)
	{
		var
			Utils = require('Common/Utils'),
			oResult = ko.computed({
				'read': oTarget,
				'write': function (sNewValue) {
					var iNew = Utils.pInt(sNewValue.toString(), iDefault);
					if (0 >= iNew)
					{
						iNew = iDefault;
					}

					if (iNew === oTarget() && '' + iNew !== '' + sNewValue)
					{
						oTarget(iNew + 1);
					}

					oTarget(iNew);
				}
			})
		;

		oResult(oTarget());
		return oResult;
	};

	ko.extenders.limitedList = function (oTarget, mList)
	{
		var
			Utils = require('Common/Utils'),
			oResult = ko.computed({
				'read': oTarget,
				'write': function (sNewValue) {

					var
						sCurrentValue = ko.unwrap(oTarget),
						aList = ko.unwrap(mList)
					;

					if (Utils.isNonEmptyArray(aList))
					{
						if (-1 < Utils.inArray(sNewValue, aList))
						{
							oTarget(sNewValue);
						}
						else if (-1 < Utils.inArray(sCurrentValue, aList))
						{
							oTarget(sCurrentValue + ' ');
							oTarget(sCurrentValue);
						}
						else
						{
							oTarget(aList[0] + ' ');
							oTarget(aList[0]);
						}
					}
					else
					{
						oTarget('');
					}
				}
			}).extend({'notify': 'always'})
		;

		oResult(oTarget());

		if (!oResult.valueHasMutated)
		{
			oResult.valueHasMutated = function () {
				oTarget.valueHasMutated();
			};
		}

		return oResult;
	};

	ko.extenders.reversible = function (oTarget)
	{
		var mValue = oTarget();

		oTarget.commit = function ()
		{
			mValue = oTarget();
		};

		oTarget.reverse = function ()
		{
			oTarget(mValue);
		};

		oTarget.commitedValue = function ()
		{
			return mValue;
		};

		return oTarget;
	};

	ko.extenders.toggleSubscribe = function (oTarget, oOptions)
	{
		oTarget.subscribe(oOptions[1], oOptions[0], 'beforeChange');
		oTarget.subscribe(oOptions[2], oOptions[0]);

		return oTarget;
	};

	ko.extenders.toggleSubscribeProperty = function (oTarget, oOptions)
	{
		var sProp = oOptions[1];

		if (sProp)
		{
			oTarget.subscribe(function (oPrev) {
				if (oPrev && oPrev[sProp])
				{
					oPrev[sProp](false);
				}
			}, oOptions[0], 'beforeChange');

			oTarget.subscribe(function (oNext) {
				if (oNext && oNext[sProp])
				{
					oNext[sProp](true);
				}
			}, oOptions[0]);
		}

		return oTarget;
	};

	ko.extenders.falseTimeout = function (oTarget, iOption)
	{
		oTarget.iFalseTimeoutTimeout = 0;
		oTarget.subscribe(function (bValue) {
			if (bValue)
			{
				window.clearTimeout(oTarget.iFalseTimeoutTimeout);
				oTarget.iFalseTimeoutTimeout = window.setTimeout(function () {
					oTarget(false);
					oTarget.iFalseTimeoutTimeout = 0;
				}, require('Common/Utils').pInt(iOption));
			}
		});

		return oTarget;
	};

	ko.extenders.specialThrottle = function (oTarget, iOption)
	{
		oTarget.iSpecialThrottleTimeoutValue = require('Common/Utils').pInt(iOption);
		if (0 < oTarget.iSpecialThrottleTimeoutValue)
		{
			oTarget.iSpecialThrottleTimeout = 0;
			oTarget.valueForRead = ko.observable(!!oTarget()).extend({'throttle': 10});

			return ko.computed({
				'read': oTarget.valueForRead,
				'write': function (bValue) {

					if (bValue)
					{
						oTarget.valueForRead(bValue);
					}
					else
					{
						if (oTarget.valueForRead())
						{
							window.clearTimeout(oTarget.iSpecialThrottleTimeout);
							oTarget.iSpecialThrottleTimeout = window.setTimeout(function () {
								oTarget.valueForRead(false);
								oTarget.iSpecialThrottleTimeout = 0;
							}, oTarget.iSpecialThrottleTimeoutValue);
						}
						else
						{
							oTarget.valueForRead(bValue);
						}
					}
				}
			});
		}

		return oTarget;
	};

	// functions

	ko.observable.fn.validateNone = function ()
	{
		this.hasError = ko.observable(false);
		return this;
	};

	ko.observable.fn.validateEmail = function ()
	{
		var Utils = require('Common/Utils');

		this.hasError = ko.observable(false);

		this.subscribe(function (sValue) {
			sValue = Utils.trim(sValue);
			this.hasError('' !== sValue && !(/^[^@\s]+@[^@\s]+$/.test(sValue)));
		}, this);

		this.valueHasMutated();
		return this;
	};

	ko.observable.fn.validateSimpleEmail = function ()
	{
		var Utils = require('Common/Utils');

		this.hasError = ko.observable(false);

		this.subscribe(function (sValue) {
			sValue = Utils.trim(sValue);
			this.hasError('' !== sValue && !(/^.+@.+$/.test(sValue)));
		}, this);

		this.valueHasMutated();
		return this;
	};

	ko.observable.fn.deleteAccessHelper = function ()
	{
		this.extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [null,
			function (oPrev) {
				if (oPrev && oPrev.deleteAccess)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext && oNext.deleteAccess)
				{
					oNext.deleteAccess(true);
				}
			}
		]});

		return this;
	};

	ko.observable.fn.validateFunc = function (fFunc)
	{
		var Utils = require('Common/Utils');

		this.hasFuncError = ko.observable(false);

		if (Utils.isFunc(fFunc))
		{
			this.subscribe(function (sValue) {
				this.hasFuncError(!fFunc(sValue));
			}, this);

			this.valueHasMutated();
		}

		return this;
	};

	module.exports = ko;

}(ko));
