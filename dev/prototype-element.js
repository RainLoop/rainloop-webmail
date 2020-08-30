
(()=>{
	Element.prototype.closestWithin = function(selector, parent) {
		const el = this.closest(selector);
		return (el && el !== parent && parent.contains(el)) ? el : null;
	};

	Element.fromHTML = string => {
		const template = document.createElement('template');
		template.innerHTML = string.trim();
		return template.content.firstChild;
	};
})();
