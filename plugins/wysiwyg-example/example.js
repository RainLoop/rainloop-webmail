(rl => {
	class Example
	{
		constructor(owner, editor) {
			this.mode = 'wysiwyg';
			this.owner = owner;
			this.editor = editor;
console.dir({editor});
		}

		setMode(mode) {
			console.log(`WYSIWYG-Example.setMode(${mode})`);
			this.mode = mode;
		}

		on(type, fn) {
			console.log(`WYSIWYG-Example.on(${type}, ${fn})`);
		}

		execCommand(cmd, cfg) {
			console.log(`WYSIWYG-Example.execCommand(${cmd}, ${cfg})`);
/*
			execCommand('insertSignature', {
				clearCache: true
			}));

			execCommand('insertSignature', {
				isHtml: html,
				insertBefore: insertBefore,
				signature: signature
			}));
*/
		}

		getData() {
			console.log(`WYSIWYG-Example.getData()`);
			return this.editor.innerHTML;
		}

		setData(html) {
			console.log(`WYSIWYG-Example.setData(${html})`);
			this.editor.innerHTML = html;
		}

		getPlainData() {
			console.log(`WYSIWYG-Example.getPlainData()`);
			return this.editor.innerText;
		}

		setPlainData(text) {
			console.log(`WYSIWYG-Example.setPlainData(${text})`);
			return this.editor.textContent = text;
		}

		blur() {
			console.log(`WYSIWYG-Example.blur()`);
			this.editor.blur();
		}

		focus() {
			console.log(`WYSIWYG-Example.focus()`);
		}
	}

	if (rl) {
		const path = rl.settings.app('webVersionPath'),
			script = document.createElement('script');
		script.src = path + 'static/wysiwyg-example/example.min.js';
		document.head.append(script);

		/**
		 * owner = HtmlEditor
		 * container = HTMLElement
		 * onReady = callback(SMQuill)
		 */
		rl.registerWYSIWYG('Example', (owner, container, onReady) => {
			const editor = new Example(owner, container);
			onReady(editor);
		});
	}

})(window.rl);
