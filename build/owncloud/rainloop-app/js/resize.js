$(function (window, document) {

	var
		buffer = 5,
		ifr = document.getElementById('rliframe')
	;


	function pageY(elem) {
		return elem.offsetParent ? (elem.offsetTop + pageY(elem.offsetParent)) : elem.offsetTop;
	}

	function resizeIframe() {
		var height = document.documentElement.clientHeight;
		height -= pageY(ifr) + buffer;
		height = (height < 0) ? 0 : height;
		ifr.style.height = height + 'px';
	}

	if (ifr)
	{
		ifr.onload = resizeIframe;
		window.onresize = resizeIframe;
	}

}(window, document));