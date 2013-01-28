/**
 * <p>Constructs a segment <code>[(x_1, y_1), (x_2, y_2)]</code>.
 *
 * @class <p>Represents a Segment <code>[(x_1, y_1), (x_2, y_2)]</code> on a 2-dimensional plane.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {number} [x1=0]
 * @param {number} [y1=0]
 * @param {number} [x2=0]
 * @param {number} [y2=0]
 */
Seadragon.Segment = function Segment(x1, y1, x2, y2) {
    this.x1 = x1 || 0;
    this.y1 = y1 || 0;
    this.x2 = x2 || 0;
    this.y2 = y2 || 0;
};

Seadragon.Segment.prototype = {
    /**
     * Checks if another segment is equal to the current one.
     *
     * @param {Seadragon.Segment} segment
     * @return {boolean}
     */
    equals: function equals(segment) {
        return segment instanceof Seadragon.Segment &&
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
    }
};
