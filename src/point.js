/**
 * <p>Constructs a point. Use cases are as follows:
 * <ul>
 *     <li><code>new Seadragon.Point()</code> gives point <code>(0, 0)</code></li>
 *     <li><code>new Seadragon.Point({x: xVal, y: yVal})</code> gives point <code>(xVal, yVal)</code></li>
 *     <li><code>new Seadragon.Point(x, y)</code> gives point <code>(x, y)</code></li>
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
Seadragon.Point = function Point() {
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
        this.x = arguments0 || 0;
        this.y = arguments[1] || 0;
    } else {
        this.x = arguments0.x || 0;
        this.y = arguments0.y || 0;
    }
};

Seadragon.Point.prototype = {
    /**
     * Returns a sum by current point and another one.
     *
     * @param {Seadragon.Point} point
     * @return {Seadragon.Point}
     */
    plus: function plus(point) {
        return new Seadragon.Point(this.x + point.x, this.y + point.y);
    },

    /**
     * Returns a difference by current point and another one.
     *
     * @param {Seadragon.Point} point
     * @return {Seadragon.Point}
     */
    minus: function minus(point) {
        return new Seadragon.Point(this.x - point.x, this.y - point.y);
    },

    /**
     * Returns the current point multiplied by a given factor.
     *
     * @param {number} factor
     * @return {Seadragon.Point}
     */
    multiply: function multiply(factor) {
        return new Seadragon.Point(this.x * factor, this.y * factor);
    },

    /**
     * Returns the current point divided by a given factor.
     *
     * @param {number} factor
     * @return {Seadragon.Point}
     */
    divide: function divide(factor) {
        return new Seadragon.Point(this.x / factor, this.y / factor);
    },

    /**
     * Returns a negated point (i.e. replaces <code>x</code> by <code>-x</code> etc.).
     *
     * @return {Seadragon.Point}
     */
    negate: function negate() {
        return new Seadragon.Point(-this.x, -this.y);
    },

    /**
     * Returns an inverted point (i.e. replaces <code>x</code> by <code>1/x</code> etc.).
     *
     * @return {Seadragon.Point}
     */
    invert: function invert() {
        return new Seadragon.Point(1 / this.x, 1 / this.y);
    },

    /**
     * Calculates a distance to another point.
     *
     * @param {Seadragon.Point} point
     * @return {number}
     */
    distanceTo: function distanceTo(point) {
        return Math.sqrt(Math.pow(this.x - point.x, 2) + Math.pow(this.y - point.y, 2));
    },

    /**
     * Applies a function to both of point fields.
     *
     * @param {function} func
     * @return {Seadragon.Point}
     */
    apply: function apply(func) {
        return new Seadragon.Point(func(this.x), func(this.y));
    },

    /**
     * Returns the current point with both of fields rounded to integers.
     *
     * @return {Seadragon.Point}
     */
    round: function round() {
        return new Seadragon.Point(Math.round(this.x), Math.round(this.y));
    },

    /**
     * Checks if another point is equal to the current one.
     *
     * @param {Seadragon.Point} point
     * @return {boolean}
     */
    equals: function equals(point) {
        return point instanceof Seadragon.Point && this.x === point.x && this.y === point.y;
    },

    /**
     * Returns a <code>string</code> representing the point.
     *
     * @return {string}
     */
    toString: function toString() {
        return '(' + this.x + ', ' + this.y + ')';
    }
};
