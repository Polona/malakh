var utils = {};

(function () {
    // TODO benchmark it.
    /**
     * A faster version of <code>Function.prototype.bind</code>.
     *
     * @param {Function} fn  Function to be bound.
     * @param thisArg
     * @returns {Function}
     */
    utils.bind = function bind(fn, thisArg) {
        var boundArgs = [].slice.call(arguments, 2);
        return function () {
            var args = [].slice.call(arguments);
            args.unshift.apply(args, boundArgs);
            return fn.apply(thisArg, args);
        };
    };
    /**
     * A faster version of <code>utils.bind</code> when only <code>this</code> binding is needed (i.e. no arguments).
     *
     * @param {Function} fn  Function to be bound.
     * @param thisArg
     * @returns {Function}
     */
    utils.bindThis = function bindThis(fn, thisArg) {
        return function () {
            return fn.apply(thisArg, arguments);
        };
    };

    /**
     * A faster version of <code>Array.prototype.forEach</code>. Applies <code>callback</code> to each member of
     * <code>array</code> not strictly equal to <code>undefined</code>.
     *
     * @param {Array} array
     * @param {Function} callback  A function applied on every element; takes element as the first parameter
     *                             and its index in <code>array</code> as the second one.
     */
    utils.forEach = function forEach(array, callback) {
        var element;
        for (var i = 0, length = array.length; i < length; i++) {
            element = array[i];
            if (element !== undefined) { // omit empty parameters, emulates Array.prototype.forEach
                callback(element, i);
            }
        }
    };
})();
