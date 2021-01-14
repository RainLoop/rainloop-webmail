
(win => {

	win.Sieve = {
/*
		RegEx: {},
		Grammar: {},
		Commands: {},
		parseScript: ()=>{},
*/
		arrayToString: (arr, separator) =>
			arr.map(item => item.toString ? item.toString() : item).join(separator)
	};

})(this);
