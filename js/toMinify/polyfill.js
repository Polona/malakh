(function () {
    'use strict';

    // Accepting setTimeout/setInterval with >2 parameters
    function correctSetTimeoutOrInterval(setTimeoutOrInterval) {
        return function (fun, timeout) {
            var args = Array.prototype.slice.call(arguments, 2);
            return setTimeoutOrInterval(function () {
                fun.apply(this, args);
            }, timeout);
        };
    }

    if (this) { // => strict mode not supported so we catch IE <=10.
        window.setTimeout = correctSetTimeoutOrInterval(window.setTimeout);
        window.setInterval = correctSetTimeoutOrInterval(window.setInterval);
    }

    // Avoid console errors in browsers that lack a console. (Credits: HTML5 Boilerplate)
    if (!(window.console && console.log)) {
        (function () {
            var noop = function () {
            };
            var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception',
                'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd',
                'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
            var length = methods.length;
            var console = window.console = {};
            while (length--) {
                console[methods[length]] = noop;
            }
        }());
    }
})();
