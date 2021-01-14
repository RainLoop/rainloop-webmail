
(win => {

	win.Sieve = {
/*
		RegEx: {},
		Grammar: {},
		Commands: {},
		Tests: {},
		parseScript: ()=>{},
*/
		Extensions: {},

		arrayToString: (arr, separator) =>
			arr.map(item => item.toString ? item.toString() : item).join(separator)
	};

})(this);
