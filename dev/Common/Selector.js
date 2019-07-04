import $ from '$';
import _ from '_';
import key from 'key';
import ko from 'ko';
import { EventKeyCode } from 'Common/Enums';
import { isArray, inArray, noop, noopTrue } from 'Common/Utils';

class Selector {
	list;
	listChecked;
	isListChecked;

	focusedItem;
	selectedItem;

	itemSelectedThrottle;

	selectedItemUseCallback = true;

	iSelectNextHelper = 0;
	iFocusedNextHelper = 0;
	oContentVisible;
	oContentScrollable;

	sItemSelector;
	sItemSelectedSelector;
	sItemCheckedSelector;
	sItemFocusedSelector;

	sLastUid = '';
	oCallbacks = {};

	/**
	 * @param {koProperty} koList
	 * @param {koProperty} koSelectedItem
	 * @param {koProperty} koFocusedItem
	 * @param {string} sItemSelector
	 * @param {string} sItemSelectedSelector
	 * @param {string} sItemCheckedSelector
	 * @param {string} sItemFocusedSelector
	 */
	constructor(
		koList,
		koSelectedItem,
		koFocusedItem,
		sItemSelector,
		sItemSelectedSelector,
		sItemCheckedSelector,
		sItemFocusedSelector
	) {
		this.list = koList;

		this.listChecked = ko.computed(() => _.filter(this.list(), (item) => item.checked())).extend({ rateLimit: 0 });
		this.isListChecked = ko.computed(() => 0 < this.listChecked().length);

		this.focusedItem = koFocusedItem || ko.observable(null);
		this.selectedItem = koSelectedItem || ko.observable(null);

		this.itemSelectedThrottle = _.debounce(_.bind(this.itemSelected, this), 300);

		this.listChecked.subscribe((items) => {
			if (0 < items.length) {
				if (null === this.selectedItem()) {
					if (this.selectedItem.valueHasMutated) {
						this.selectedItem.valueHasMutated();
					}
				} else {
					this.selectedItem(null);
				}
			} else if (this.autoSelect() && this.focusedItem()) {
				this.selectedItem(this.focusedItem());
			}
		}, this);

		this.selectedItem.subscribe((item) => {
			if (item) {
				if (this.isListChecked()) {
					_.each(this.listChecked(), (subItem) => {
						subItem.checked(false);
					});
				}

				if (this.selectedItemUseCallback) {
					this.itemSelectedThrottle(item);
				}
			} else if (this.selectedItemUseCallback) {
				this.itemSelected(null);
			}
		}, this);

		this.selectedItem = this.selectedItem.extend({ toggleSubscribeProperty: [this, 'selected'] });
		this.focusedItem = this.focusedItem.extend({ toggleSubscribeProperty: [null, 'focused'] });

		this.sItemSelector = sItemSelector;
		this.sItemSelectedSelector = sItemSelectedSelector;
		this.sItemCheckedSelector = sItemCheckedSelector;
		this.sItemFocusedSelector = sItemFocusedSelector;

		this.focusedItem.subscribe((item) => {
			if (item) {
				this.sLastUid = this.getItemUid(item);
			}
		}, this);

		let aCache = [],
			aCheckedCache = [],
			mFocused = null,
			mSelected = null;

		this.list.subscribe(
			(items) => {
				if (isArray(items)) {
					_.each(items, (item) => {
						if (item) {
							const uid = this.getItemUid(item);

							aCache.push(uid);
							if (item.checked()) {
								aCheckedCache.push(uid);
							}
							if (null === mFocused && item.focused()) {
								mFocused = uid;
							}
							if (null === mSelected && item.selected()) {
								mSelected = uid;
							}
						}
					});
				}
			},
			this,
			'beforeChange'
		);

		this.list.subscribe((aItems) => {
			let temp = null,
				getNext = false,
				isNextFocused = mFocused,
				isChecked = false,
				isSelected = false,
				len = 0;

			const uids = [];

			this.selectedItemUseCallback = false;

			this.focusedItem(null);
			this.selectedItem(null);

			if (isArray(aItems)) {
				len = aCheckedCache.length;

				_.each(aItems, (item) => {
					const uid = this.getItemUid(item);
					uids.push(uid);

					if (null !== mFocused && mFocused === uid) {
						this.focusedItem(item);
						mFocused = null;
					}

					if (0 < len && -1 < inArray(uid, aCheckedCache)) {
						isChecked = true;
						item.checked(true);
						len -= 1;
					}

					if (!isChecked && null !== mSelected && mSelected === uid) {
						isSelected = true;
						this.selectedItem(item);
						mSelected = null;
					}
				});

				this.selectedItemUseCallback = true;

				if (!isChecked && !isSelected && this.autoSelect()) {
					if (this.focusedItem()) {
						this.selectedItem(this.focusedItem());
					} else if (0 < aItems.length) {
						if (null !== isNextFocused) {
							getNext = false;
							isNextFocused = _.find(aCache, (sUid) => {
								if (getNext && -1 < inArray(sUid, uids)) {
									return sUid;
								} else if (isNextFocused === sUid) {
									getNext = true;
								}
								return false;
							});

							if (isNextFocused) {
								temp = _.find(aItems, (oItem) => isNextFocused === this.getItemUid(oItem));
							}
						}

						this.selectedItem(temp || null);
						this.focusedItem(this.selectedItem());
					}
				}

				if (
					(0 !== this.iSelectNextHelper || 0 !== this.iFocusedNextHelper) &&
					0 < aItems.length &&
					!this.focusedItem()
				) {
					temp = null;
					if (0 !== this.iFocusedNextHelper) {
						temp = aItems[-1 === this.iFocusedNextHelper ? aItems.length - 1 : 0] || null;
					}

					if (!temp && 0 !== this.iSelectNextHelper) {
						temp = aItems[-1 === this.iSelectNextHelper ? aItems.length - 1 : 0] || null;
					}

					if (temp) {
						if (0 !== this.iSelectNextHelper) {
							this.selectedItem(temp || null);
						}

						this.focusedItem(temp || null);

						this.scrollToFocused();

						_.delay(() => this.scrollToFocused(), 100);
					}

					this.iSelectNextHelper = 0;
					this.iFocusedNextHelper = 0;
				}
			}

			aCache = [];
			aCheckedCache = [];
			mFocused = null;
			mSelected = null;
		});
	}

	itemSelected(item) {
		if (this.isListChecked()) {
			if (!item) {
				(this.oCallbacks.onItemSelect || noop)(item || null);
			}
		} else if (item) {
			(this.oCallbacks.onItemSelect || noop)(item);
		}
	}

	/**
	 * @param {boolean} forceSelect
	 */
	goDown(forceSelect) {
		this.newSelectPosition(EventKeyCode.Down, false, forceSelect);
	}

	/**
	 * @param {boolean} forceSelect
	 */
	goUp(forceSelect) {
		this.newSelectPosition(EventKeyCode.Up, false, forceSelect);
	}

	unselect() {
		this.selectedItem(null);
		this.focusedItem(null);
	}

	init(contentVisible, contentScrollable, keyScope = 'all') {
		this.oContentVisible = contentVisible;
		this.oContentScrollable = contentScrollable;

		if (this.oContentVisible && this.oContentScrollable) {
			$(this.oContentVisible)
				.on('selectstart', (event) => {
					if (event && event.preventDefault) {
						event.preventDefault();
					}
				})
				.on('click', this.sItemSelector, (event) => {
					this.actionClick(ko.dataFor(event.currentTarget), event);
				})
				.on('click', this.sItemCheckedSelector, (event) => {
					const item = ko.dataFor(event.currentTarget);
					if (item) {
						if (event && event.shiftKey) {
							this.actionClick(item, event);
						} else {
							this.focusedItem(item);
							item.checked(!item.checked());
						}
					}
				});

			key('enter', keyScope, () => {
				if (this.focusedItem() && !this.focusedItem().selected()) {
					this.actionClick(this.focusedItem());
					return false;
				}

				return true;
			});

			key('ctrl+up, command+up, ctrl+down, command+down', keyScope, () => false);

			key('up, shift+up, down, shift+down, home, end, pageup, pagedown, insert, space', keyScope, (event, handler) => {
				if (event && handler && handler.shortcut) {
					let eventKey = 0;
					switch (handler.shortcut) {
						case 'up':
						case 'shift+up':
							eventKey = EventKeyCode.Up;
							break;
						case 'down':
						case 'shift+down':
							eventKey = EventKeyCode.Down;
							break;
						case 'insert':
							eventKey = EventKeyCode.Insert;
							break;
						case 'space':
							eventKey = EventKeyCode.Space;
							break;
						case 'home':
							eventKey = EventKeyCode.Home;
							break;
						case 'end':
							eventKey = EventKeyCode.End;
							break;
						case 'pageup':
							eventKey = EventKeyCode.PageUp;
							break;
						case 'pagedown':
							eventKey = EventKeyCode.PageDown;
							break;
						// no default
					}

					if (0 < eventKey) {
						this.newSelectPosition(eventKey, key.shift);
						return false;
					}
				}

				return true;
			});
		}
	}

	/**
	 * @returns {boolean}
	 */
	autoSelect() {
		return !!(this.oCallbacks.onAutoSelect || noopTrue)();
	}

	/**
	 * @param {boolean} up
	 */
	doUpUpOrDownDown(up) {
		(this.oCallbacks.onUpUpOrDownDown || noopTrue)(!!up);
	}

	/**
	 * @param {Object} oItem
	 * @returns {string}
	 */
	getItemUid(item) {
		let uid = '';

		const getItemUidCallback = this.oCallbacks.onItemGetUid || null;
		if (getItemUidCallback && item) {
			uid = getItemUidCallback(item);
		}

		return uid.toString();
	}

	/**
	 * @param {number} iEventKeyCode
	 * @param {boolean} bShiftKey
	 * @param {boolean=} bForceSelect = false
	 */
	newSelectPosition(iEventKeyCode, bShiftKey, bForceSelect) {
		let index = 0,
			isNext = false,
			isStop = false,
			result = null;

		const pageStep = 10,
			list = this.list(),
			listLen = list ? list.length : 0,
			focused = this.focusedItem();

		if (0 < listLen) {
			if (!focused) {
				if (
					EventKeyCode.Down === iEventKeyCode ||
					EventKeyCode.Insert === iEventKeyCode ||
					EventKeyCode.Space === iEventKeyCode ||
					EventKeyCode.Home === iEventKeyCode ||
					EventKeyCode.PageUp === iEventKeyCode
				) {
					result = list[0];
				} else if (
					EventKeyCode.Up === iEventKeyCode ||
					EventKeyCode.End === iEventKeyCode ||
					EventKeyCode.PageDown === iEventKeyCode
				) {
					result = list[list.length - 1];
				}
			} else if (focused) {
				if (
					EventKeyCode.Down === iEventKeyCode ||
					EventKeyCode.Up === iEventKeyCode ||
					EventKeyCode.Insert === iEventKeyCode ||
					EventKeyCode.Space === iEventKeyCode
				) {
					_.each(list, (item) => {
						if (!isStop) {
							switch (iEventKeyCode) {
								case EventKeyCode.Up:
									if (focused === item) {
										isStop = true;
									} else {
										result = item;
									}
									break;
								case EventKeyCode.Down:
								case EventKeyCode.Insert:
									if (isNext) {
										result = item;
										isStop = true;
									} else if (focused === item) {
										isNext = true;
									}
									break;
								// no default
							}
						}
					});

					if (!result && (EventKeyCode.Down === iEventKeyCode || EventKeyCode.Up === iEventKeyCode)) {
						this.doUpUpOrDownDown(EventKeyCode.Up === iEventKeyCode);
					}
				} else if (EventKeyCode.Home === iEventKeyCode || EventKeyCode.End === iEventKeyCode) {
					if (EventKeyCode.Home === iEventKeyCode) {
						result = list[0];
					} else if (EventKeyCode.End === iEventKeyCode) {
						result = list[list.length - 1];
					}
				} else if (EventKeyCode.PageDown === iEventKeyCode) {
					for (; index < listLen; index++) {
						if (focused === list[index]) {
							index += pageStep;
							index = listLen - 1 < index ? listLen - 1 : index;
							result = list[index];
							break;
						}
					}
				} else if (EventKeyCode.PageUp === iEventKeyCode) {
					for (index = listLen; 0 <= index; index--) {
						if (focused === list[index]) {
							index -= pageStep;
							index = 0 > index ? 0 : index;
							result = list[index];
							break;
						}
					}
				}
			}
		}

		if (result) {
			this.focusedItem(result);

			if (focused) {
				if (bShiftKey) {
					if (EventKeyCode.Up === iEventKeyCode || EventKeyCode.Down === iEventKeyCode) {
						focused.checked(!focused.checked());
					}
				} else if (EventKeyCode.Insert === iEventKeyCode || EventKeyCode.Space === iEventKeyCode) {
					focused.checked(!focused.checked());
				}
			}

			if ((this.autoSelect() || !!bForceSelect) && !this.isListChecked() && EventKeyCode.Space !== iEventKeyCode) {
				this.selectedItem(result);
			}

			this.scrollToFocused();
		} else if (focused) {
			if (bShiftKey && (EventKeyCode.Up === iEventKeyCode || EventKeyCode.Down === iEventKeyCode)) {
				focused.checked(!focused.checked());
			} else if (EventKeyCode.Insert === iEventKeyCode || EventKeyCode.Space === iEventKeyCode) {
				focused.checked(!focused.checked());
			}

			this.focusedItem(focused);
		}
	}

	/**
	 * @returns {boolean}
	 */
	scrollToFocused() {
		if (!this.oContentVisible || !this.oContentScrollable) {
			return false;
		}

		const offset = 20,
			list = this.list(),
			$focused = $(this.sItemFocusedSelector, this.oContentScrollable),
			pos = $focused.position(),
			visibleHeight = this.oContentVisible.height(),
			focusedHeight = $focused.outerHeight();

		if (list && list[0] && list[0].focused()) {
			this.oContentScrollable.scrollTop(0);
			return true;
		} else if (pos && (0 > pos.top || pos.top + focusedHeight > visibleHeight)) {
			this.oContentScrollable.scrollTop(
				0 > pos.top
					? this.oContentScrollable.scrollTop() + pos.top - offset
					: this.oContentScrollable.scrollTop() + pos.top - visibleHeight + focusedHeight + offset
			);

			return true;
		}

		return false;
	}

	/**
	 * @param {boolean=} fast = false
	 * @returns {boolean}
	 */
	scrollToTop(fast = false) {
		if (!this.oContentVisible || !this.oContentScrollable) {
			return false;
		}

		if (fast || 50 > this.oContentScrollable.scrollTop()) {
			this.oContentScrollable.scrollTop(0);
		} else {
			this.oContentScrollable.stop().animate({ scrollTop: 0 }, 200);
		}

		return true;
	}

	eventClickFunction(item, event) {
		let index = 0,
			length = 0,
			changeRange = false,
			isInRange = false,
			list = [],
			checked = false,
			listItem = null,
			lineUid = '';

		const uid = this.getItemUid(item);
		if (event && event.shiftKey) {
			if ('' !== uid && '' !== this.sLastUid && uid !== this.sLastUid) {
				list = this.list();
				checked = item.checked();

				for (index = 0, length = list.length; index < length; index++) {
					listItem = list[index];
					lineUid = this.getItemUid(listItem);

					changeRange = false;
					if (lineUid === this.sLastUid || lineUid === uid) {
						changeRange = true;
					}

					if (changeRange) {
						isInRange = !isInRange;
					}

					if (isInRange || changeRange) {
						listItem.checked(checked);
					}
				}
			}
		}

		this.sLastUid = '' === uid ? '' : uid;
	}

	/**
	 * @param {Object} item
	 * @param {Object=} event
	 */
	actionClick(item, event = null) {
		if (item) {
			let click = true;
			if (event) {
				if (event.shiftKey && !(event.ctrlKey || event.metaKey) && !event.altKey) {
					click = false;
					if ('' === this.sLastUid) {
						this.sLastUid = this.getItemUid(item);
					}

					item.checked(!item.checked());
					this.eventClickFunction(item, event);

					this.focusedItem(item);
				} else if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
					click = false;
					this.focusedItem(item);

					if (this.selectedItem() && item !== this.selectedItem()) {
						this.selectedItem().checked(true);
					}

					item.checked(!item.checked());
				}
			}

			if (click) {
				this.selectMessageItem(item);
			}
		}
	}

	on(eventName, callback) {
		this.oCallbacks[eventName] = callback;
	}

	selectMessageItem(messageItem) {
		this.focusedItem(messageItem);
		this.selectedItem(messageItem);
		this.scrollToFocused();
	}
}

export { Selector, Selector as default };
