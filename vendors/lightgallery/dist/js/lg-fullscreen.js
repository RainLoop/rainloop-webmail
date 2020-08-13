/*! lightgallery - v1.2.21 - 2016-06-28
* http://sachinchoolur.github.io/lightGallery/
* Copyright (c) 2016 Sachin N; Licensed Apache 2.0 */
(($, document) => {

    'use strict';

    var defaults = {
        fullScreen: true
    };

    class Fullscreen
    {
        constructor(element) {

            // get lightGallery core plugin data
            this.core = $(element).data('lightGallery');

            this.$el = $(element);

            // extend module defalut settings with lightGallery core settings
            this.core.s = $.extend({}, defaults, this.core.s);

            this.init();

            return this;
        }

        init() {
            var fullScreen = '';
            if (this.core.s.fullScreen) {

                // check for fullscreen browser support
                if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled &&
                    !document.mozFullScreenEnabled && !document.msFullscreenEnabled) {
                    return;
                } else {
                    fullScreen = '<span class="lg-fullscreen lg-icon"></span>';
                    this.core.$outer.find('.lg-toolbar').append(fullScreen);
                    this.fullScreen();
                }
            }
        }

        requestFullscreen() {
            var el = document.documentElement;
            if (el.requestFullscreen) {
                el.requestFullscreen();
            } else if (el.msRequestFullscreen) {
                el.msRequestFullscreen();
            } else if (el.mozRequestFullScreen) {
                el.mozRequestFullScreen();
            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            }
        }

        exitFullscreen() {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }

        // https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Using_full_screen_mode
        fullScreen() {
            var _this = this;

            $(document).on('fullscreenchange.lg webkitfullscreenchange.lg mozfullscreenchange.lg MSFullscreenChange.lg', () =>
                _this.core.$outer.toggleClass('lg-fullscreen-on')
            );

            this.core.$outer.find('.lg-fullscreen').on('click.lg', () => {
                if (!document.fullscreenElement &&
                    !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                    _this.requestFullscreen();
                } else {
                    _this.exitFullscreen();
                }
            });

        }

        destroy() {

            // exit from fullscreen if activated
            this.exitFullscreen();

            $(document).off('fullscreenchange.lg webkitfullscreenchange.lg mozfullscreenchange.lg MSFullscreenChange.lg');
        }
    }

    $.fn.lightGallery.modules.fullscreen = Fullscreen;

})(jQuery, document);
