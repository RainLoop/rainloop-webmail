
(function () {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 * @param {koProperty} oKoList
	 * @param {koProperty} oKoSelectedItem
	 * @param {koProperty} oKoFocusedItem
	 * @param {string} sItemSelector
	 * @param {string} sItemSelectedSelector
	 * @param {string} sItemCheckedSelector
	 * @param {string} sItemFocusedSelector
	 */
	function Selector(oKoList, oKoSelectedItem, oKoFocusedItem,
		sItemSelector, sItemSelectedSelector, sItemCheckedSelector, sItemFocusedSelector)
	{
		this.list = oKoList;

		this.listChecked = ko.computed(function () {
			return _.filter(this.list(), function (oItem) {
				return oItem.checked();
			});
		}, this).extend({'rateLimit': 0});

		this.isListChecked = ko.computed(function () {
			return 0 < this.listChecked().length;
		}, this);

		this.focusedItem = oKoFocusedItem || ko.observable(null);
		this.selectedItem = oKoSelectedItem || ko.observable(null);
		this.selectedItemUseCallback = true;

		this.itemSelectedThrottle = _.debounce(_.bind(this.itemSelected, this), 300);

		this.listChecked.subscribe(function (aItems) {
			if (0 < aItems.length)
			{
				if (null === this.selectedItem())
				{
					if (this.selectedItem.valueHasMutated)
					{
						this.selectedItem.valueHasMutated();
					}
				}
				else
				{
					this.selectedItem(null);
				}
			}
			else if (this.autoSelect() && this.focusedItem())
			{
				this.selectedItem(this.focusedItem());
			}
		}, this);

		this.selectedItem.subscribe(function (oItem) {

			if (oItem)
			{
				if (this.isListChecked())
				{
					_.each(this.listChecked(), function (oSubItem) {
						oSubItem.checked(false);
					});
				}

				if (this.selectedItemUseCallback)
				{
					this.itemSelectedThrottle(oItem);
				}
			}
			else if (this.selectedItemUseCallback)
			{
				this.itemSelected(null);
			}

		}, this);

		this.selectedItem = this.selectedItem.extend({'toggleSubscribe': [null,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.selected(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.selected(true);
				}
			}
		]});

		this.focusedItem = this.focusedItem.extend({'toggleSubscribe': [null,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.focused(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.focused(true);
				}
			}
		]});

		this.iSelectNextHelper = 0;
		this.iFocusedNextHelper = 0;
		this.oContentVisible = null;
		this.oContentScrollable = null;

		this.sItemSelector = sItemSelector;
		this.sItemSelectedSelector = sItemSelectedSelector;
		this.sItemCheckedSelector = sItemCheckedSelector;
		this.sItemFocusedSelector = sItemFocusedSelector;

		this.sLastUid = '';
		this.oCallbacks = {};

		this.emptyFunction = function () {};
		this.emptyTrueFunction = function () { return true; };

		this.focusedItem.subscribe(function (oItem) {
			if (oItem)
			{
				this.sLastUid = this.getItemUid(oItem);
			}
		}, this);

		var
			aCache = [],
			aCheckedCache = [],
			mFocused = null,
			mSelected = null
		;

		this.list.subscribe(function (aItems) {

			var self = this;
			if (Utils.isArray(aItems))
			{
				_.each(aItems, function (oItem) {
					if (oItem)
					{
						var sUid = self.getItemUid(oItem);

						aCache.push(sUid);
						if (oItem.checked())
						{
							aCheckedCache.push(sUid);
						}
						if (null === mFocused && oItem.focused())
						{
							mFocused = sUid;
						}
						if (null === mSelected && oItem.selected())
						{
							mSelected = sUid;
						}
					}
				});
			}
		}, this, 'beforeChange');

		this.list.subscribe(function (aItems) {

			var
				self = this,
				oTemp = null,
				bGetNext = false,
				aUids = [],
				mNextFocused = mFocused,
				bChecked = false,
				bSelected = false,
				iLen = 0
			;

			this.selectedItemUseCallback = false;

			this.focusedItem(null);
			this.selectedItem(null);

			if (Utils.isArray(aItems))
			{
				iLen = aCheckedCache.length;

				_.each(aItems, function (oItem) {

					var sUid = self.getItemUid(oItem);
					aUids.push(sUid);

					if (null !== mFocused && mFocused === sUid)
					{
						self.focusedItem(oItem);
						mFocused = null;
					}

					if (0 < iLen && -1 < Utils.inArray(sUid, aCheckedCache))
					{
						bChecked = true;
						oItem.checked(true);
						iLen--;
					}

					if (!bChecked && null !== mSelected && mSelected === sUid)
					{
						bSelected = true;
						self.selectedItem(oItem);
						mSelected = null;
					}
				});

				this.selectedItemUseCallback = true;

				if (!bChecked && !bSelected && this.autoSelect())
				{
					if (self.focusedItem())
					{
						self.selectedItem(self.focusedItem());
					}
					else if (0 < aItems.length)
					{
						if (null !== mNextFocused)
						{
							bGetNext = false;
							mNextFocused = _.find(aCache, function (sUid) {
								if (bGetNext && -1 < Utils.inArray(sUid, aUids))
								{
									return sUid;
								}
								else if (mNextFocused === sUid)
								{
									bGetNext = true;
								}
								return false;
							});

							if (mNextFocused)
							{
								oTemp = _.find(aItems, function (oItem) {
									return mNextFocused === self.getItemUid(oItem);
								});
							}
						}

						self.selectedItem(oTemp || null);
						self.focusedItem(self.selectedItem());
					}
				}

				if ((0 !== this.iSelectNextHelper || 0 !== this.iFocusedNextHelper) && 0 < aItems.length && !self.focusedItem())
				{
					oTemp = null;
					if (0 !== this.iFocusedNextHelper)
					{
						oTemp = aItems[-1 === this.iFocusedNextHelper ? aItems.length - 1 : 0] || null;
					}

					if (!oTemp && 0 !== this.iSelectNextHelper)
					{
						oTemp = aItems[-1 === this.iSelectNextHelper ? aItems.length - 1 : 0] || null;
					}

					if (oTemp)
					{
						if (0 !== this.iSelectNextHelper)
						{
							self.selectedItem(oTemp || null);
						}

						self.focusedItem(oTemp || null);

						self.scrollToFocused();

						_.delay(function () {
							self.scrollToFocused();
						}, 100);
					}

					this.iSelectNextHelper = 0;
					this.iFocusedNextHelper = 0;
				}
			}

			aCache = [];
			aCheckedCache = [];
			mFocused = null;
			mSelected = null;

		}, this);
	}

	Selector.prototype.itemSelected = function (oItem)
	{
		if (this.isListChecked())
		{
			if (!oItem)
			{
				(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem || null);
			}
		}
		else
		{
			if (oItem)
			{
				(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem);
			}
		}
	};

	Selector.prototype.goDown = function (bForceSelect)
	{
		this.newSelectPosition(Enums.EventKeyCode.Down, false, bForceSelect);
	};

	Selector.prototype.goUp = function (bForceSelect)
	{
		this.newSelectPosition(Enums.EventKeyCode.Up, false, bForceSelect);
	};

	Selector.prototype.unselect = function ()
	{
		this.selectedItem(null);
		this.focusedItem(null);
	};

	Selector.prototype.init = function (oContentVisible, oContentScrollable, sKeyScope)
	{
		this.oContentVisible = oContentVisible;
		this.oContentScrollable = oContentScrollable;

		sKeyScope = sKeyScope || 'all';

		if (this.oContentVisible && this.oContentScrollable)
		{
			var
				self = this
			;

			$(this.oContentVisible)
				.on('selectstart', function (oEvent) {
					if (oEvent && oEvent.preventDefault)
					{
						oEvent.preventDefault();
					}
				})
				.on('click', this.sItemSelector, function (oEvent) {
					self.actionClick(ko.dataFor(this), oEvent);
				})
				.on('click', this.sItemCheckedSelector, function (oEvent) {
					var oItem = ko.dataFor(this);
					if (oItem)
					{
						if (oEvent && oEvent.shiftKey)
						{
							self.actionClick(oItem, oEvent);
						}
						else
						{
							self.focusedItem(oItem);
							oItem.checked(!oItem.checked());
						}
					}
				})
			;

			key('enter', sKeyScope, function () {
				if (self.focusedItem() && !self.focusedItem().selected())
				{
					self.actionClick(self.focusedItem());
					return false;
				}

				return true;
			});

			key('ctrl+up, command+up, ctrl+down, command+down', sKeyScope, function () {
				return false;
			});

			key('up, shift+up, down, shift+down, home, end, pageup, pagedown, insert, space', sKeyScope, function (event, handler) {
				if (event && handler && handler.shortcut)
				{
					var iKey = 0;
					switch (handler.shortcut)
					{
						case 'up':
						case 'shift+up':
							iKey = Enums.EventKeyCode.Up;
							break;
						case 'down':
						case 'shift+down':
							iKey = Enums.EventKeyCode.Down;
							break;
						case 'insert':
							iKey = Enums.EventKeyCode.Insert;
							break;
						case 'space':
							iKey = Enums.EventKeyCode.Space;
							break;
						case 'home':
							iKey = Enums.EventKeyCode.Home;
							break;
						case 'end':
							iKey = Enums.EventKeyCode.End;
							break;
						case 'pageup':
							iKey = Enums.EventKeyCode.PageUp;
							break;
						case 'pagedown':
							iKey = Enums.EventKeyCode.PageDown;
							break;
					}

					if (0 < iKey)
					{
						self.newSelectPosition(iKey, key.shift);
						return false;
					}
				}
			});
		}
	};

	/**
	 * @return {boolean}
	 */
	Selector.prototype.autoSelect = function ()
	{
		return !!(this.oCallbacks['onAutoSelect'] || this.emptyTrueFunction)();
	};

	/**
	 * @param {boolean}
	 */
	Selector.prototype.doUpUpOrDownDown = function (bUp)
	{
		(this.oCallbacks['onUpUpOrDownDown'] || this.emptyTrueFunction)(!!bUp);
	};

	/**
	 * @param {Object} oItem
	 * @return {string}
	 */
	Selector.prototype.getItemUid = function (oItem)
	{
		var
			sUid = '',
			fGetItemUidCallback = this.oCallbacks['onItemGetUid'] || null
		;

		if (fGetItemUidCallback && oItem)
		{
			sUid = fGetItemUidCallback(oItem);
		}

		return sUid.toString();
	};

	/**
	 * @param {number} iEventKeyCode
	 * @param {boolean} bShiftKey
	 * @param {boolean=} bForceSelect = false
	 */
	Selector.prototype.newSelectPosition = function (iEventKeyCode, bShiftKey, bForceSelect)
	{
		var
			iIndex = 0,
			iPageStep = 10,
			bNext = false,
			bStop = false,
			oResult = null,
			aList = this.list(),
			iListLen = aList ? aList.length : 0,
			oFocused = this.focusedItem()
		;

		if (0 < iListLen)
		{
			if (!oFocused)
			{
				if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode || Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.PageUp === iEventKeyCode)
				{
					oResult = aList[0];
				}
				else if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode || Enums.EventKeyCode.PageDown === iEventKeyCode)
				{
					oResult = aList[aList.length - 1];
				}
			}
			else if (oFocused)
			{
				if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Up === iEventKeyCode ||  Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
				{
					_.each(aList, function (oItem) {
						if (!bStop)
						{
							switch (iEventKeyCode) {
							case Enums.EventKeyCode.Up:
								if (oFocused === oItem)
								{
									bStop = true;
								}
								else
								{
									oResult = oItem;
								}
								break;
							case Enums.EventKeyCode.Down:
							case Enums.EventKeyCode.Insert:
								if (bNext)
								{
									oResult = oItem;
									bStop = true;
								}
								else if (oFocused === oItem)
								{
									bNext = true;
								}
								break;
							}
						}
					});

					if (!oResult && (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Up === iEventKeyCode))
					{
						this.doUpUpOrDownDown(Enums.EventKeyCode.Up === iEventKeyCode);
					}
				}
				else if (Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode)
				{
					if (Enums.EventKeyCode.Home === iEventKeyCode)
					{
						oResult = aList[0];
					}
					else if (Enums.EventKeyCode.End === iEventKeyCode)
					{
						oResult = aList[aList.length - 1];
					}
				}
				else if (Enums.EventKeyCode.PageDown === iEventKeyCode)
				{
					for (; iIndex < iListLen; iIndex++)
					{
						if (oFocused === aList[iIndex])
						{
							iIndex += iPageStep;
							iIndex = iListLen - 1 < iIndex ? iListLen - 1 : iIndex;
							oResult = aList[iIndex];
							break;
						}
					}
				}
				else if (Enums.EventKeyCode.PageUp === iEventKeyCode)
				{
					for (iIndex = iListLen; iIndex >= 0; iIndex--)
					{
						if (oFocused === aList[iIndex])
						{
							iIndex -= iPageStep;
							iIndex = 0 > iIndex ? 0 : iIndex;
							oResult = aList[iIndex];
							break;
						}
					}
				}
			}
		}

		if (oResult)
		{
			this.focusedItem(oResult);

			if (oFocused)
			{
				if (bShiftKey)
				{
					if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode)
					{
						oFocused.checked(!oFocused.checked());
					}
				}
				else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
				{
					oFocused.checked(!oFocused.checked());
				}
			}

			if ((this.autoSelect() || !!bForceSelect) &&
				!this.isListChecked() && Enums.EventKeyCode.Space !== iEventKeyCode)
			{
				this.selectedItem(oResult);
			}

			this.scrollToFocused();
		}
		else if (oFocused)
		{
			if (bShiftKey && (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode))
			{
				oFocused.checked(!oFocused.checked());
			}
			else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
			{
				oFocused.checked(!oFocused.checked());
			}

			this.focusedItem(oFocused);
		}
	};

	/**
	 * @return {boolean}
	 */
	Selector.prototype.scrollToFocused = function ()
	{
		if (!this.oContentVisible || !this.oContentScrollable)
		{
			return false;
		}

		var
			iOffset = 20,
			aList = this.list(),
			oFocused = $(this.sItemFocusedSelector, this.oContentScrollable),
			oPos = oFocused.position(),
			iVisibleHeight = this.oContentVisible.height(),
			iFocusedHeight = oFocused.outerHeight()
		;

		if (aList && aList[0] && aList[0].focused())
		{
			this.oContentScrollable.scrollTop(0);

			return true;
		}
		else if (oPos && (oPos.top < 0 || oPos.top + iFocusedHeight > iVisibleHeight))
		{
			if (oPos.top < 0)
			{
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
			}
			else
			{
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iFocusedHeight + iOffset);
			}

			return true;
		}

		return false;
	};

	/**
	 * @param {boolean=} bFast = false
	 * @return {boolean}
	 */
	Selector.prototype.scrollToTop = function (bFast)
	{
		if (!this.oContentVisible || !this.oContentScrollable)
		{
			return false;
		}

		if (bFast || 50 > this.oContentScrollable.scrollTop())
		{
			this.oContentScrollable.scrollTop(0);
		}
		else
		{
			this.oContentScrollable.stop().animate({'scrollTop': 0}, 200);
		}

		return true;
	};

	Selector.prototype.eventClickFunction = function (oItem, oEvent)
	{
		var
			sUid = this.getItemUid(oItem),
			iIndex = 0,
			iLength = 0,
			oListItem = null,
			sLineUid = '',
			bChangeRange = false,
			bIsInRange = false,
			aList = [],
			bChecked = false
		;

		if (oEvent && oEvent.shiftKey)
		{
			if ('' !== sUid && '' !== this.sLastUid && sUid !== this.sLastUid)
			{
				aList = this.list();
				bChecked = oItem.checked();

				for (iIndex = 0, iLength = aList.length; iIndex < iLength; iIndex++)
				{
					oListItem = aList[iIndex];
					sLineUid = this.getItemUid(oListItem);

					bChangeRange = false;
					if (sLineUid === this.sLastUid || sLineUid === sUid)
					{
						bChangeRange = true;
					}

					if (bChangeRange)
					{
						bIsInRange = !bIsInRange;
					}

					if (bIsInRange || bChangeRange)
					{
						oListItem.checked(bChecked);
					}
				}
			}
		}

		this.sLastUid = '' === sUid ? '' : sUid;
	};

	/**
	 * @param {Object} oItem
	 * @param {Object=} oEvent
	 */
	Selector.prototype.actionClick = function (oItem, oEvent)
	{
		if (oItem)
		{
			var
				bClick = true,
				sUid = this.getItemUid(oItem)
			;

			if (oEvent)
			{
				if (oEvent.shiftKey && !(oEvent.ctrlKey || oEvent.metaKey) && !oEvent.altKey)
				{
					bClick = false;
					if ('' === this.sLastUid)
					{
						this.sLastUid = sUid;
					}

					oItem.checked(!oItem.checked());
					this.eventClickFunction(oItem, oEvent);

					this.focusedItem(oItem);
				}
				else if ((oEvent.ctrlKey || oEvent.metaKey) && !oEvent.shiftKey && !oEvent.altKey)
				{
					bClick = false;
					this.focusedItem(oItem);

					if (this.selectedItem() && oItem !== this.selectedItem())
					{
						this.selectedItem().checked(true);
					}

					oItem.checked(!oItem.checked());
				}
			}

			if (bClick)
			{
				this.selectMessageItem(oItem);
			}
		}
	};

	Selector.prototype.on = function (sEventName, fCallback)
	{
		this.oCallbacks[sEventName] = fCallback;
	};

	Selector.prototype.selectMessageItem = function (oMessageItem)
	{
		this.focusedItem(oMessageItem);
		this.selectedItem(oMessageItem);

		this.scrollToFocused();
	};

	module.exports = Selector;

}());