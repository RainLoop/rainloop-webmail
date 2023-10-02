import ko from 'ko';
import { addEventsListeners, addShortcut, registerShortcut } from 'Common/Globals';
import { isArray } from 'Common/Utils';
import { koComputable } from 'External/ko';

/*
	oCallbacks:
		ItemSelect
		MiddleClick
		canSelect
		ItemGetUid
		UpOrDown
*/

let shiftStart;

export class Selector {
	/**
	 * @param {koProperty} koList
	 * @param {koProperty} koSelectedItem
	 * @param {koProperty} koFocusedItem
	 * @param {string} sItemSelector
	 * @param {string} sItemCheckedSelector
	 * @param {string} sItemFocusedSelector
	 */
	constructor(
		koList,
		koSelectedItem,
		koFocusedItem,
		sItemSelector,
		sItemCheckedSelector,
		sItemFocusedSelector
	) {
		koFocusedItem = (koFocusedItem || ko.observable(null)).extend({ toggleSubscribeProperty: [this, 'focused'] });
		koSelectedItem = (koSelectedItem || ko.observable(null)).extend({ toggleSubscribeProperty: [null, 'selected'] });

		this.list = koList;
		this.listChecked = koComputable(() => koList.filter(item => item.checked())).extend({ rateLimit: 0 });

		this.focusedItem = koFocusedItem;
		this.selectedItem = koSelectedItem;

		this.iSelectNextHelper = 0;
		this.iFocusedNextHelper = 0;
//		this.oContentScrollable = null;

		this.sItemSelector = sItemSelector;
		this.sItemCheckedSelector = sItemCheckedSelector;
		this.sItemFocusedSelector = sItemFocusedSelector;

		this.sLastUid = '';
		this.oCallbacks = {};

		const
			itemSelected = item => {
				if (koList.hasChecked()) {
					item || this.oCallbacks.ItemSelect?.(null);
				} else if (item) {
					this.oCallbacks.ItemSelect?.(item);
				}
			},

			itemSelectedThrottle = (item => itemSelected(item)).debounce(300);

		this.listChecked.subscribe(items => {
			if (items.length) {
				koSelectedItem() ? koSelectedItem(null) : koSelectedItem.valueHasMutated?.();
			} else {
				this.autoSelect();
			}
		});

		let selectedItemUseCallback = true;

		koSelectedItem.subscribe(item => {
			if (item) {
//				koList.forEach(subItem => subItem.checked(false));
				selectedItemUseCallback && itemSelectedThrottle(item);
			} else {
				selectedItemUseCallback && itemSelected();
			}
		});

		koFocusedItem.subscribe(item => item && (this.sLastUid = this.getItemUid(item)));

		/**
		 * Below code is used to keep checked/focused/selected states when array is refreshed.
		 */

		let aCheckedCache = [],
			mFocused = null,
			mSelected = null;

		// Before removing old list
		koList.subscribe(
			items => {
				if (isArray(items)) {
					items.forEach(item => {
						const uid = this.getItemUid(item);
						if (uid) {
							item.checked() && aCheckedCache.push(uid);
							if (!mFocused && item.focused()) {
								mFocused = uid;
							}
							if (!mSelected && item.selected()) {
								mSelected = uid;
							}
						}
					});
				}
			},
			this,
			'beforeChange'
		);

		koList.subscribe(aItems => {
			selectedItemUseCallback = false;

			this.unselect();

			if (isArray(aItems)) {
				let temp,
					isChecked;

				aItems.forEach(item => {
					const uid = this.getItemUid(item);
					if (uid) {

						if (mFocused === uid) {
							koFocusedItem(item);
							mFocused = null;
						}

						if (aCheckedCache.includes(uid)) {
							item.checked(true);
							isChecked = true;
						}

						if (!isChecked && mSelected === uid) {
							koSelectedItem(item);
							mSelected = null;
						}
					}
				});

				selectedItemUseCallback = true;

				if (
					(this.iSelectNextHelper || this.iFocusedNextHelper) &&
					aItems.length &&
					!koFocusedItem()
				) {
					temp = null;
					if (this.iFocusedNextHelper) {
						temp = aItems[-1 === this.iFocusedNextHelper ? aItems.length - 1 : 0];
					}

					if (!temp && this.iSelectNextHelper) {
						temp = aItems[-1 === this.iSelectNextHelper ? aItems.length - 1 : 0];
					}

					if (temp) {
						if (this.iSelectNextHelper) {
							koSelectedItem(temp);
						}

						koFocusedItem(temp);

						this.scrollToFocused();
						setTimeout(this.scrollToFocused, 100);
					}

					this.iSelectNextHelper = 0;
					this.iFocusedNextHelper = 0;
				}

				!isChecked && !koSelectedItem() && this.autoSelect();
			}

			aCheckedCache = [];
			mFocused = null;
			mSelected = null;
			selectedItemUseCallback = true;
		});
	}

	unselect() {
		this.selectedItem(null);
		this.focusedItem(null);
	}

	init(contentScrollable, keyScope = 'all') {
		this.oContentScrollable = contentScrollable;

		if (contentScrollable) {
			let getItem = selector => {
				let el = event.target.closestWithin(selector, contentScrollable);
				return el ? ko.dataFor(el) : null;
			};

			addEventsListeners(contentScrollable, {
				click: event => {
					const el = event.target.closestWithin(this.sItemSelector, contentScrollable);
					let item = el && ko.dataFor(el);
					el && (this.oCallbacks.click || (()=>1))(event, item) && this.actionClick(item, event);

					item = getItem(this.sItemCheckedSelector);
					if (item) {
						if (event.shiftKey) {
							this.actionClick(item, event);
						} else {
							this.focusedItem(item);
							item.checked(!item.checked());
						}
					}
				},
				auxclick: event => {
					if (1 == event.button) {
						const item = getItem(this.sItemSelector);
						if (item) {
							this.focusedItem(item);
							this.oCallbacks.MiddleClick?.(item);
						}
					}
				}
			});

			registerShortcut('enter,open', '', keyScope, () => {
				const focused = this.focusedItem();
				if (focused && !focused.selected()) {
					this.actionClick(focused);
					return false;
				}
			});

			addShortcut('arrowup,arrowdown', 'meta', keyScope, () => false);

			addShortcut('arrowup,arrowdown', 'shift', keyScope, event => {
				this.newSelectPosition(event.key, true);
				return false;
			});
			registerShortcut('arrowup,arrowdown,home,end,pageup,pagedown,space', '', keyScope, event => {
				this.newSelectPosition(event.key, false);
				return false;
			});
		}
	}

	/**
	 * @returns {boolean}
	 */
	autoSelect(bForce) {
		(bForce || (this.oCallbacks.canSelect || (()=>1))())
		&& this.focusedItem()
		&& this.selectedItem(this.focusedItem());
	}

	/**
	 * @param {Object} oItem
	 * @returns {string}
	 */
	getItemUid(item) {
		return (item && this.oCallbacks.ItemGetUid?.(item)?.toString()) || '';
	}

	/**
	 * @param {string} sEventKey
	 * @param {boolean} bShiftKey
	 * @param {boolean=} bForceSelect = false
	 */
	newSelectPosition(sEventKey, bShiftKey, bForceSelect) {
		let isArrow = 'ArrowUp' === sEventKey || 'ArrowDown' === sEventKey,
			result;

		const pageStep = 10,
			list = this.list(),
			listLen = list.length,
			focused = this.focusedItem();

		bShiftKey || (shiftStart = -1);

		if (' ' === sEventKey) {
			focused?.checked(!focused.checked());
		} else if (listLen) {
			if (focused) {
				if (isArrow) {
					let i = list.indexOf(focused),
						up = 'ArrowUp' == sEventKey;
					if (bShiftKey) {
						shiftStart = -1 < shiftStart ? shiftStart : i;
						shiftStart == i
							? focused.checked(true)
							: ((up ? shiftStart < i : shiftStart > i) && focused.checked(false));
					}
					if (up) {
						i > 0 && (result = list[--i]);
					} else if (++i < listLen) {
						result = list[i];
					}
					bShiftKey && result?.checked(true);
					result || this.oCallbacks.UpOrDown?.(up);
				} else if ('Home' === sEventKey) {
					result = list[0];
				} else if ('End' === sEventKey) {
					result = list[list.length - 1];
				} else if ('PageDown' === sEventKey) {
					let i = list.indexOf(focused);
					if (i < listLen - 1) {
						result = list[Math.min(i + pageStep, listLen - 1)];
					}
				} else if ('PageUp' === sEventKey) {
					let i = list.indexOf(focused);
					if (i > 0) {
						result = list[Math.max(0, i - pageStep)];
					}
				}
			} else if (
				'Home' == sEventKey ||
				'PageUp' == sEventKey
			) {
				result = list[0];
			} else if (
				'End' === sEventKey ||
				'PageDown' === sEventKey
			) {
				result = list[list.length - 1];
			}

			if (result) {
				this.focusedItem(result);
				!this.list.hasChecked() && this.autoSelect(bForceSelect);
				this.scrollToFocused();
			}
		}
	}

	/**
	 * @returns {boolean}
	 */
	scrollToFocused() {
		const scrollable = this.oContentScrollable;
		if (scrollable) {
			let focused = scrollable.querySelector(this.sItemFocusedSelector);
			if (focused) {
				const fRect = focused.getBoundingClientRect(),
					sRect = scrollable.getBoundingClientRect();
				if (fRect.top < sRect.top) {
					focused.scrollIntoView(true);
				} else if (fRect.bottom > sRect.bottom) {
					focused.scrollIntoView(false);
				}
			} else {
				scrollable.scrollTop = 0;
			}
		}
	}

	/**
	 * @returns {boolean}
	 */
	scrollToTop() {
		this.oContentScrollable && (this.oContentScrollable.scrollTop = 0);
	}

	/**
	 * @param {Object} item
	 * @param {Object=} event
	 */
	actionClick(item, event) {
		if (item) {
			let select = true;
			if (event && !event.altKey) {
				if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
					const uid = this.getItemUid(item);
					if (uid && this.sLastUid && uid !== this.sLastUid) {
						let changeRange = false,
							isInRange = false,
							checked = !item.checked(),
							lineUid = '';
						this.list().forEach(listItem => {
							lineUid = this.getItemUid(listItem);
							changeRange = (lineUid === this.sLastUid || lineUid === uid);
							if (isInRange || changeRange) {
								if (changeRange) {
									isInRange = !isInRange;
								}
								listItem.checked(checked);
							}
						});
					}
					this.sLastUid = uid;
					this.focusedItem(item);
					return;
				}
				if (!event.shiftKey && (event.ctrlKey || event.metaKey)) {
					select = false;
					this.focusedItem(item);
					const selected = this.selectedItem();
					if (selected && item !== selected) {
						selected.checked(true);
					}
				}
			}

			select ? this.selectMessageItem(item) : item.checked(!item.checked());
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
