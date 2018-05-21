import window from 'window';
import $ from 'jquery';

const band = $('<div>', {'class': 'progressjs-percent'});
const progress = $('<div>', {'class': 'progressjs-inner'}).append(band);
const bar = $('<div>', {'class': 'progressjs-progress progressjs-theme-rainloop'}).append(progress);
const container = $('<div>', {'class': 'progressjs-container'}).append(bar);

progress.set = function(percent) {
	$('.progressjs-inner').css('width', percent + '%');
	return progress;
};

progress.start = function() {
	progress.set(0);
	$('body').append(container);
	return progress;
};

progress.end = function() {
	progress.set(100);
	window.setTimeout(() => {
		$('.progressjs-container').detach();
	}, 1000);
	return progress;
};

export default progress;
