/**
 * Constructs a point. Use cases are as follows:
 * <ul>
 *     <li><code>new Malakh.Point()</code> (gives point <code>(0, 0)</code>)</li>
 *     <li><code>new Malakh.Point({x: x, y: y})</code></li>
 *     <li><code>new Malakh.Point(x, y)</code></code></li>
 *     <li><code>new Malakh.Point([x, y])</code></code></li>
 * </ul>
 *
 * @class <p>Represents a point on a 2-dimensional plane.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 */
Malakh.Point = function Point() {
    var arguments0 = arguments[0];
    if (arguments0 == null) {
        /**
         * Horizontal point parameter.
         * @type number
         * @default 0
         */
        this.x = 0;
        /**
         * Vertical point parameter.
         * @type number
         * @default 0
         */
        this.y = 0;
    } else if (arguments0.x == null) {
        this.x = arguments0[0] || arguments0 || 0;
        this.y = arguments0[1] || arguments[1] || 0;
    } else {
        this.x = arguments0.x || 0;
        this.y = arguments0.y || 0;
    }
};

$.extend(Malakh.Point.prototype,
    /**
     * @lends Malakh.Point.prototype
     */
    {
        /**
         * Returns a sum by current point and another one.
         *
         * @param {Malakh.Point} point
         * @return {Malakh.Point}
         */
        plus: function plus(point) {
            return new Malakh.Point(this.x + point.x, this.y + point.y);
        },

        /**
         * Returns a difference by current point and another one.
         *
         * @param {Malakh.Point} point
         * @return {Malakh.Point}
         */
        minus: function minus(point) {
            return new Malakh.Point(this.x - point.x, this.y - point.y);
        },

        /**
         * Returns the current point multiplied by a given factor.
         *
         * @param {number} factor
         * @return {Malakh.Point}
         */
        multiply: function multiply(factor) {
            return new Malakh.Point(this.x * factor, this.y * factor);
        },

        /**
         * Returns the current point divided by a given factor.
         *
         * @param {number} factor
         * @return {Malakh.Point}
         */
        divide: function divide(factor) {
            return new Malakh.Point(this.x / factor, this.y / factor);
        },

        /**
         * Returns a negated point (i.e. replaces <code>x</code> by <code>-x</code> etc.).
         *
         * @return {Malakh.Point}
         */
        negate: function negate() {
            return new Malakh.Point(-this.x, -this.y);
        },

        /**
         * Returns an inverted point (i.e. replaces <code>x</code> by <code>1/x</code> etc.).
         *
         * @return {Malakh.Point}
         */
        invert: function invert() {
            return new Malakh.Point(1 / this.x, 1 / this.y);
        },

        /**
         * Calculates a distance to another point.
         *
         * @param {Malakh.Point} point
         * @return {number}
         */
        distanceTo: function distanceTo(point) {
            return Math.sqrt(Math.pow(this.x - point.x, 2) + Math.pow(this.y - point.y, 2));
        },

        /**
         * Calculates a distance to (0, 0).
         *
         * @return {number}
         */
        distanceToCenter: function distanceToCenter() {
            // There should be a point here but we use its x & y parameters only anyway.
            return this.distanceTo({x: 0, y: 0});
        },

        /**
         * Applies a function to both of point fields.
         *
         * @param {function} func
         * @return {Malakh.Point}
         */
        apply: function apply(func) {
            return new Malakh.Point(func(this.x), func(this.y));
        },

        /**
         * Returns the current point with both of fields rounded to integers.
         *
         * @return {Malakh.Point}
         */
        round: function round() {
            return new Malakh.Point(Math.round(this.x), Math.round(this.y));
        },

        /**
         * Checks if another point is equal to the current one.
         *
         * @param {Malakh.Point} point
         * @return {boolean}
         */
        equals: function equals(point) {
            return point instanceof Malakh.Point && this.x === point.x && this.y === point.y;
        },

        /**
         * Returns a <code>string</code> representing the point.
         *
         * @return {string}
         */
        toString: function toString() {
            return '(' + this.x + ', ' + this.y + ')';
        },
    }
);
