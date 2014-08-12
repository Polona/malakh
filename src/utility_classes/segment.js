/**
 * Constructs a segment <code>[(x_1, y_1), (x_2, y_2)]</code>. Use cases are as follows:
 * <ul>
 *     <li><code>new Malakh.Segment()</code> (gives segment <code>[(0, 0), (0, 0)])</code></li>
 *     <li><code>new Malakh.Segment({x1: x1, y1: y1, x2: x2, y2: y2})</code></li>
 *     <li><code>new Malakh.Segment(x1, y1, x2, y2)</code></code></li>
 *     <li><code>new Malakh.Segment([x1, y1, x2, y2])</code></code></li>
 * </ul>
 *
 * @class <p>Represents a Segment <code>[(x_1, y_1), (x_2, y_2)]</code> on a 2-dimensional plane.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 */
Malakh.Segment = function Segment() {
    var arguments0 = arguments[0];
    if (arguments0 == null) {
        /**
         * Horizontal start segment parameter.
         * @type number
         * @default 0
         */
        this.x1 = 0;
        /**
         * Vertical start segment parameter.
         * @type number
         * @default 0
         */
        this.y1 = 0;
        /**
         * Horizontal end segment parameter.
         * @type number
         * @default 0
         */
        this.x2 = 0;
        /**
         * Vertical end segment parameter.
         * @type number
         * @default 0
         */
        this.y2 = 0;
    } else if (arguments0.x1 == null) {
        this.x1 = arguments0[0] || arguments0 || 0;
        this.y1 = arguments0[1] || arguments[1] || 0;
        this.x2 = arguments0[2] || arguments[2] || 0;
        this.y2 = arguments0[3] || arguments[3] || 0;
    } else {
        this.x1 = arguments0.x1 || 0;
        this.y1 = arguments0.y1 || 0;
        this.x2 = arguments0.x2 || 0;
        this.y2 = arguments0.y2 || 0;
    }
};

$.extend(Malakh.Segment.prototype,
    /**
     * @lends Malakh.Segment.prototype
     */
    {
        /**
         * Checks if another segment is equal to the current one.
         *
         * @param {Malakh.Segment} segment
         * @return {boolean}
         */
        equals: function equals(segment) {
            return segment instanceof Malakh.Segment &&
                this.x1 === segment.x1 && segment.y1 === segment.y1 &&
                this.x2 === segment.x2 && segment.y2 === segment.y2;
        },

        /**
         * Returns a <code>string</code> representing the segment.
         *
         * @return {string}
         */
        toString: function toString() {
            return '[(' + this.x1 + ', ' + this.y1 + '), ' + '(' + this.x2 + ', ' + this.y2 + ')]';
        },
    }
);
