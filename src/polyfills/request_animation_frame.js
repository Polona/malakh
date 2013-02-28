(function () {
    var lastTime = 0;

    if (window.requestAnimationFrame) {
        return; // already defined
    }

    ['webkit', 'moz'].forEach(function (vendorPrefix) {
        if (window.requestAnimationFrame) {
            return;
        }
        window.requestAnimationFrame = window[vendorPrefix + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendorPrefix + 'CancelAnimationFrame'];
    });

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
