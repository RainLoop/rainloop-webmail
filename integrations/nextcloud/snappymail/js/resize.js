(()=>{

	const
		buffer = 0, //was 5 but this was creating a white space of 5px at the bottom of the page
		ifr = document.getElementById('rliframe'),
		pageY = elem => elem.offsetParent ? (elem.offsetTop + pageY(elem.offsetParent)) : elem.offsetTop,
		resizeIframe = () => {
			var height = document.documentElement.clientHeight;
			height -= pageY(ifr) + buffer;
			height = (height < 0) ? 0 : height;
			ifr.style.height = height + 'px';
		};
	if (ifr) {
		ifr.onload = resizeIframe;
		window.onresize = resizeIframe;
	}

})();
