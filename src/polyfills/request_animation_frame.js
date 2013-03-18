(function () {

    if (window.requestAnimationFrame) {
        return; // already defined
    }

    var lastTime = 0;

    window.requestAnimationFrame = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
        function (callback) {
            var currTime = Date.now(); // not supported in IE<9!
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    window.cancelAnimationFrame = window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame ||
        function (id) {
            clearTimeout(id);
        };
})();
