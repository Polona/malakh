(function () {
    'use strict';

    (function () {
        // requestAnimationFrame polyfill

        var lastTime = 0;
        var vendors = ['moz', 'webkit', 'o'];
        for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
            window.requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'];
        }

        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback) {
                var currTime = Date.now(); // not supported in IE<9!
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function () {
                        callback(currTime + timeToCall);
                    },
                    timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

            window.cancelAnimationFrame = function (id) {
                clearTimeout(id);
            };
        }
    })();
})();
