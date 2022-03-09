
export const
	arrayToString = (arr, separator) =>
		arr.map(item => item.toString ? item.toString() : item).join(separator);
