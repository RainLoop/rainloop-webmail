
export class CSS
{
	/*
		Parses given css string, and returns css object
		keys as selectors and values are css rules
		eliminates all css comments before parsing

		@param source css string to be parsed

		@return object css
	*/
	parse(source) {

		const css = [];

		css.toString = () => css.reduce(
			(ret, tmp) =>
				ret + tmp.selector + ' {\n'
					+ (tmp.type === 'media' ? tmp.subStyles.toString() : tmp.rules)
					+ '}\n'
			,
			''
		);

		/**
		 * Given css array, parses it and then for every selector,
		 * prepends namespace to prevent css collision issues
		 */
		css.applyNamespace = (namespace) => css.forEach(obj => {
			if (obj.type === 'media') {
				obj.subStyles.applyNamespace(namespace);
			} else {
				obj.selector = obj.selector.split(',').map(selector => namespace + ' ' + selector).join(',');
			}
		});

		if (source) {
			source = source
				// strip comments
				.replace(/\/\*[\s\S]*?\*\/|<!--|-->/gi, '')
				// strip import statements
				.replace(/@import .*?;/gi , '')
				// strip keyframe statements
				.replace(/((@.*?keyframes [\s\S]*?){([\s\S]*?}\s*?)})/gi, '');

			// unified regex to match css & media queries together
			let unified = /((\s*?(?:\/\*[\s\S]*?\*\/)?\s*?@media[\s\S]*?){([\s\S]*?)}\s*?})|(([\s\S]*?){([\s\S]*?)})/gi,
				arr;

			while (true) {
				arr = unified.exec(source);
				if (arr === null) {
					break;
				}

				let selector = arr[arr[2] === undefined ? 5 : 2].split('\r\n').join('\n').trim()
					// Never have more than a single line break in a row
					.replace(/\n+/, "\n");

				// determine the type
				if (selector.includes('@media')) {
					// we have a media query
					css.push({
						selector: selector,
						type: 'media',
						subStyles: this.parse(arr[3] + '\n}') //recursively parse media query inner css
					});
				} else if (!selector.includes('@') && ![':root','html','body'].includes(selector)) {
					// we have standard css
					css.push({
						selector: selector,
						rules: arr[6]
					});
				}
			}
		}

		return css;
	}

}
