/**
 * Author: Michał Gołębiowski <michal.golebiowski@laboratorium.ee>
 * Author: Brandon Aaron (http://brandonaaron.net)
 * Copyright (c) 2011 Brandon Aaron (http://brandonaaron.net)
 * Copyright (c) 2013 Laboratorium EE (http://laboratorium.ee)
 */

(function ($) {
    if ($.fn.wheel) { // already polyfilled
        return;
    }

    // Modern browsers support 'wheel', others - 'mousewheel'.
    var nativeEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

    // Normalizing event properties for the 'wheel' event (like event.which etc.).
    if (nativeEvent === 'wheel') {
        $.event.fixHooks.wheel = $.event.mouseHooks;
    } else {
        // We can't attach hooks to 'wheel' only since we need a type matching to originalEvent.type
        // and this field is non-mutable.
        $.event.fixHooks.mousewheel = $.event.mouseHooks;
    }

    function handler(orgEvent) {
        // Handler for the 'mousewheel' event (Chrome, Opera, Safari).
        /* jshint validthis: true */ // event handler

        var event = $.event.fix(orgEvent);

        if (nativeEvent === 'wheel') {
            event.deltaMode = orgEvent.deltaMode;
            event.deltaX = orgEvent.deltaX;
            event.deltaY = orgEvent.deltaY;
            event.deltaZ = orgEvent.deltaZ;
        } else {
            event.type = 'wheel';
            event.deltaMode = 0; // deltaMode === 0 => scrolling in pixels (in Chrome default wheelDeltaY is 120)
            event.deltaX = -1 * orgEvent.wheelDeltaX;
            event.deltaY = -1 * orgEvent.wheelDeltaY;
            event.deltaZ = 0; // not supported
        }

        // Exchange original event for the modified one in arguments list.
        var args = [].slice.call(arguments, 0);
        args[0] = event;

        return $.event.dispatch.apply(this, args);
    }

    // Implementing 'wheel' using non-standard 'mousewheel' event.
    $.event.special.wheel = {
        setup: function () {
            this.addEventListener(nativeEvent, handler, false);
        },

        teardown: function () {
            this.removeEventListener(nativeEvent, handler, false);
        }
    };

    // Implement `$object.wheel()` and `$object.wheel(handler)`.
    $.fn.wheel = function (data, fn) {
        return arguments.length > 0 ?
            this.on('wheel', null, data, fn) :
            this.trigger('wheel');
    };
})(jQuery);
