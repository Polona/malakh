var u = {};

(function () {
    // TODO benchmark it.
    /**
     * A faster version of <code>Function.prototype.bind</code>.
     *
     * @param {Function} fn  Function to be bound.
     * @param thisArg
     * @returns {Function}
     */
    u.bind = function bind(fn, thisArg) {
        var boundArgs = [].slice.call(arguments, 2);
        return function () {
            var args = [].slice.call(arguments);
            args.unshift.apply(args, boundArgs);
            return fn.apply(thisArg, args);
        };
    };
    /**
     * A faster version of <code>u.bind</code> when only <code>this</code> binding is needed (i.e. no arguments).
     *
     * @param {Function} fn  Function to be bound.
     * @param thisArg
     * @returns {Function}
     */
    u.bindThis = function bindThis(fn, thisArg) {
        return function () {
            return fn.apply(thisArg, arguments);
        };
    };

    u.forEach = function forEach(array, callback) {
        var element;
        for (var i = 0, length = array.length; i < length; i++) {
            element = array[i];
            if (element !== undefined) { // omit empty parameters, emulates Array.prototype.forEach
                callback(element, i);
            }
        }
    };
})();
