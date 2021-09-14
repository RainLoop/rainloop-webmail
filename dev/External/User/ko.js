import 'External/ko';
import ko from 'ko';
import { HtmlEditor } from 'Common/Html';
import { timeToNode } from 'Common/Momentor';
import { elementById } from 'Common/Globals';
import { isArray } from 'Common/Utils';
import { EmailAddressesComponent } from 'Component/EmailAddresses';
import { ThemeStore } from 'Stores/Theme';

const rlContentType = 'snappymail/action',

	// In Chrome we have no access to dataTransfer.getData unless it's the 'drop' event
	// In Chrome Mobile dataTransfer.types.includes(rlContentType) fails, only text/plain is set
	getDragAction = () => dragData ? dragData.action : false,
	setDragAction = (e, action, effect, data, img) => {
		dragData = {
			action: action,
			data: data
		};
//		e.dataTransfer.setData(rlContentType, action);
		e.dataTransfer.setData('text/plain', rlContentType+'/'+action);
		e.dataTransfer.setDragImage(img, 0, 0);
		e.dataTransfer.effectAllowed = effect;
	},

	dragTimer = {
		id: 0,
		stop: () => clearTimeout(dragTimer.id),
		start: fn => dragTimer.id = setTimeout(fn, 500)
	};

let dragImage,
	dragData;

ko.bindingHandlers.editor = {
	init: (element, fValueAccessor) => {
		let editor = null;

		const fValue = fValueAccessor(),
			fUpdateEditorValue = () => fValue && fValue.__editor && fValue.__editor.setHtmlOrPlain(fValue()),
			fUpdateKoValue = () => fValue && fValue.__editor && fValue(fValue.__editor.getDataWithHtmlMark()),
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

let ttn = (element, fValueAccessor) => timeToNode(element, ko.unwrap(fValueAccessor()));
ko.bindingHandlers.moment = {
	init: ttn,
	update: ttn
};

ko.bindingHandlers.emailsTags = {
	init: (element, fValueAccessor, fAllBindings) => {
		const fValue = fValueAccessor();

		element.addresses = new EmailAddressesComponent(element, {
			focusCallback: value => fValue.focused && fValue.focused(!!value),
			autoCompleteSource: fAllBindings.get('autoCompleteSource'),
			onChange: value => fValue(value)
		});

		if (fValue.focused && fValue.focused.subscribe) {
			fValue.focused.subscribe(value =>
				element.addresses[value ? 'focus' : 'blur']()
			);
		}
	},
	update: (element, fValueAccessor) => {
		element.addresses.value = ko.unwrap(fValueAccessor());
	}
};

// Start dragging selected messages
ko.bindingHandlers.dragmessages = {
	init: (element, fValueAccessor) => {
		element.addEventListener("dragstart", e => {
			let data = fValueAccessor()(e);
			dragImage || (dragImage = elementById('messagesDragImage'));
			if (data && dragImage && !ThemeStore.isMobile()) {
				dragImage.querySelector('.text').textContent = data.uids.length;
				let img = dragImage.querySelector('i');
				img.classList.toggle('icon-copy', e.ctrlKey);
				img.classList.toggle('icon-mail', !e.ctrlKey);

				// Else Chrome doesn't show it
				dragImage.style.left = e.clientX + 'px';
				dragImage.style.top = e.clientY + 'px';
				dragImage.style.right = 'auto';

				setDragAction(e, 'messages', e.ctrlKey ? 'copy' : 'move', data, dragImage);

				// Remove the Chrome visibility
				dragImage.style.cssText = '';
			} else {
				e.preventDefault();
			}

		}, false);
		element.addEventListener("dragend", () => dragData = null);
		element.setAttribute('draggable', true);
	}
};

// Drop selected messages on folder
ko.bindingHandlers.dropmessages = {
	init: (element, fValueAccessor) => {
		const folder = fValueAccessor(),
//			folder = ko.dataFor(element),
			fnStop = e => {
				e.preventDefault();
				element.classList.remove('droppableHover');
				dragTimer.stop();
			},
			fnHover = e => {
				if ('messages' === getDragAction(e)) {
					fnStop(e);
					element.classList.add('droppableHover');
					if (folder && folder.collapsed()) {
						dragTimer.start(() => {
							folder.collapsed(false);
							rl.app.setExpandedFolder(folder.fullNameHash, true);
						}, 500);
					}
				}
			};
		element.addEventListener("dragenter", fnHover);
		element.addEventListener("dragover", fnHover);
		element.addEventListener("dragleave", fnStop);
		element.addEventListener("drop", e => {
			fnStop(e);
			if ('messages' === getDragAction(e) && ['move','copy'].includes(e.dataTransfer.effectAllowed)) {
				let data = dragData.data;
				if (folder && data && data.folder && isArray(data.uids)) {
					rl.app.moveMessagesToFolder(data.folder, data.uids, folder.fullNameRaw, data.copy && e.ctrlKey);
				}
			}
		});
	}
};

ko.bindingHandlers.sortableItem = {
	init: (element, fValueAccessor) => {
		let options = ko.unwrap(fValueAccessor()) || {},
			parent = element.parentNode,
			fnHover = e => {
				if ('sortable' === getDragAction(e)) {
					e.preventDefault();
					let node = (e.target.closest ? e.target : e.target.parentNode).closest('[draggable]');
					if (node && node !== dragData.data && parent.contains(node)) {
						let rect = node.getBoundingClientRect();
						if (rect.top + (rect.height / 2) <= e.clientY) {
							if (node.nextElementSibling !== dragData.data) {
								node.after(dragData.data);
							}
						} else if (node.previousElementSibling !== dragData.data) {
							node.before(dragData.data);
						}
					}
				}
			};
		element.addEventListener("dragstart", e => {
			dragData = {
				action: 'sortable',
				element: element
			};
			setDragAction(e, 'sortable', 'move', element, element);
			element.style.opacity = 0.25;
		});
		element.addEventListener("dragend", e => {
			element.style.opacity = null;
			if ('sortable' === getDragAction(e)) {
				dragData.data.style.cssText = '';
				let row = parent.rows[options.list.indexOf(ko.dataFor(element))];
				if (row != dragData.data) {
					row.before(dragData.data);
				}
				dragData = null;
			}
		});
		if (!parent.sortable) {
			parent.sortable = true;
			parent.addEventListener("dragenter", fnHover);
			parent.addEventListener("dragover", fnHover);
			parent.addEventListener("drop", e => {
				if ('sortable' === getDragAction(e)) {
					e.preventDefault();
					let data = ko.dataFor(dragData.data),
						from = options.list.indexOf(data),
						to = [...parent.children].indexOf(dragData.data);
					if (from != to) {
						let arr = options.list();
						arr.splice(to, 0, ...arr.splice(from, 1));
						options.list(arr);
					}
					dragData = null;
					options.afterMove && options.afterMove();
				}
			});
		}
	}
};

ko.bindingHandlers.initDom = {
	init: (element, fValueAccessor) => fValueAccessor()(element)
};

ko.bindingHandlers.onEsc = {
	init: (element, fValueAccessor, fAllBindings, viewModel) => {
		let fn = event => {
			if ('Escape' == event.key) {
				element.dispatchEvent(new Event('change'));
				fValueAccessor().call(viewModel);
			}
		};
		element.addEventListener('keyup', fn);
		ko.utils.domNodeDisposal.addDisposeCallback(element, () => element.removeEventListener('keyup', fn));
	}
};

ko.bindingHandlers.registerBootstrapDropdown = {
	init: element => {
		rl.Dropdowns.register(element);
		element.ddBtn = new BSN.Dropdown(element.querySelector('.dropdown-toggle'));
	}
};

ko.bindingHandlers.openDropdownTrigger = {
	update: (element, fValueAccessor) => {
		if (ko.unwrap(fValueAccessor())) {
			const el = element.ddBtn;
			el.open || el.toggle();
//			el.focus();

			rl.Dropdowns.detectVisibility();
			fValueAccessor()(false);
		}
	}
};
