/*global Seadragon: false */
(function () {
    'use strict';

    /**
     * <p>Constructs a rectangle. Use cases are as follows:
     * <ul>
     *     <li><code>new Seadragon.Rectangle()</code> gives rectangle <code>[0, 0, 0 x 0]</code></li>
     *     <li><code>new Seadragon.Rectangle({x: x, y: y, width: width, height: height})</code>
     *         gives rectangle <code>[x, y, width x height]</code></li>
     *     <li><code>new Seadragon.Rectangle(x, y, width, height)</code>
     *         gives rectangle <code>[x, y, width x height]</code></li>
     * </ul>
     *
     * @class <p>Represents a rectangle on a 2-dimensional plane.
     *
     * <ul>
     *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
     *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
     *     <li>License: MIT (see the licence.txt file for copyright information)</li>
     * <ul>
     */
    Seadragon.Rectangle = function Rectangle() {
        var arguments0 = arguments[0];
        if (arguments0 == null) {
            /**
             * Horizontal left-top corner parameter.
             * @type number
             * @default 0
             */
            this.x = 0;
            /**
             * Vertical left-top corner parameter.
             * @type number
             * @default 0
             */
            this.y = 0;
            /**
             * Rectangle width.
             * @type number
             * @default 0
             */
            this.width = 0;
            /**
             * Rectangle height.
             * @type number
             * @default 0
             */
            this.height = 0;
        } else if (arguments0.x == null) {
            this.x = arguments0 || 0;
            this.y = arguments[1] || 0;
            this.width = arguments[2] || 0;
            this.height = arguments[3] || 0;
        } else {
            this.x = arguments0.x || 0;
            this.y = arguments0.y || 0;
            this.width = arguments0.width || 0;
            this.height = arguments0.height || 0;
        }
    };

    Seadragon.Rectangle.prototype = {
        /**
         * Returns aspect ratio of the rectangle (<code>width / height</code>).
         *
         * @return {number}
         */
        getAspectRatio: function getAspectRatio() {
            return this.width / this.height;
        },

        /**
         * Returns a point representing the top left corner of the rectangle.
         *
         * @return {Seadragon.Point}
         */
        getTopLeft: function getTopLeft() {
            return new Seadragon.Point(this.x, this.y);
        },

        /**
         * Returns a point representing the bottom right corner of the rectangle.
         *
         * @return {Seadragon.Point}
         */
        getBottomRight: function getBottomRight() {
            return new Seadragon.Point(this.x + this.width, this.y + this.height);
        },

        /**
         * Returns a point representing the center of the rectangle.
         *
         * @return {Seadragon.Point}
         */
        getCenter: function getCenter() {
            return new Seadragon.Point(this.x + this.width / 2, this.y + this.height / 2);
        },

        /**
         * Returns a point representing Rectangle size; that is: <code>(width, height)</code>.
         *
         * @return {Seadragon.Point}
         */
        getSize: function getSize() {
            return new Seadragon.Point(this.width, this.height);
        },

        /**
         * Checks if another rectangle is equal to the current one.
         *
         * @param {Seadragon.Rectangle} rectangle
         * @return {boolean}
         */
        equals: function equals(rectangle) {
            return rectangle instanceof Seadragon.Rectangle &&
                this.x === rectangle.x && this.y === rectangle.y &&
                this.width === rectangle.width && this.height === rectangle.height;
        },

        /**
         * Pans the rectangle by a given delta.
         *
         * @param {Seadragon.Point} delta
         */
        panBy: function panBy(delta) {
            var oldCenter = this.getCenter();
            this.panTo(oldCenter.plus(delta));
        },

        /**
         * Pans the rectangle so that it's center matches a given point.
         *
         * @param {Seadragon.Point} center
         */
        panTo: function panTo(center) {
            this.x = center.x - this.width / 2;
            this.y = center.y - this.height / 2;
        },

        /**
         * Checks if the rectangle contains a given point.
         *
         * @param {Seadragon.Point} point
         * @return {boolean}
         */
        containsPoint: function containsPoint(point) {
            return this.x <= point.x && point.x <= this.x + this.width &&
                this.y <= point.y && point.y <= this.y + this.height;
        },

        /**
         * Checks if the rectangle intersects a horizontal/vertical segment.
         * WARNING: it gives incorrect results for other kinds of segments!
         *
         * @param {Seadragon.Segment} segment
         * @param {boolean} horizontal Do we check for a horizontal intersection?
         * @return {boolean}
         */
        intersectsSegment: function intersectsSegment(segment, horizontal) {
            // ('x', 'y', 'height', 'width') or ('y', 'x', 'width', 'height')
            var par1, par2, length1, length2;
            // Parameters of projections of both segment and rectangle to the more
            // important axis.
            var segmentStart, segmentEnd, rectangleStart, rectangleEnd;

            if (!(segment instanceof Seadragon.Segment)) {
                Seadragon.Debug.error('Function intersetsSegment expects a Seadragon.Segment instance as a parameter');
                return false;
            }

            if (horizontal) {
                par1 = 'x';
                par2 = 'y';
                length1 = 'width';
                length2 = 'height';
            } else { // We convert everything to the horizontal case (further comments assume horizontal case).
                par1 = 'y';
                par2 = 'x';
                length1 = 'height';
                length2 = 'width';
            }
            if (segment[par2 + '1'] < this[par2] || segment[par2 + '1'] > this[par2] + this[length2]) {
                // The segment is above or below the rectangle.
                return false;
            }

            // We check the other dimension.
            segmentStart = segment[par1 + '1'];
            segmentEnd = segment[par1 + '2'];
            rectangleStart = this[par1];
            rectangleEnd = this[par1] + this[length1];

            return ((segmentStart > rectangleStart || segmentEnd > rectangleStart) &&
                (segmentStart < rectangleEnd || segmentEnd < rectangleEnd));
        },

        /**
         * Checks if the rectangle intersects another rectangle.
         *
         * @param {Seadragon.Rectangle} rectangle
         * @return {boolean}
         */
        intersectsRectangle: function intersectsRectangle(rectangle) {
            var left = rectangle.x;
            var right = rectangle.x + rectangle.width;
            var top = rectangle.y;
            var bottom = rectangle.y + rectangle.height;

            // Does rectangle's center lie inside the rectangle?
            return rectangle.containsPoint(this.getCenter()) ||
                // Does one of rectangle edges intersect the circle?
                this.intersectsSegment(new Seadragon.Segment(left, top, right, top), true) || // top edge
                this.intersectsSegment(new Seadragon.Segment(right, top, right, bottom), false) || // right edge
                this.intersectsSegment(new Seadragon.Segment(right, bottom, left, bottom), true) || // bottom edge
                this.intersectsSegment(new Seadragon.Segment(left, bottom, left, top), false); // left edge
        },

        /**
         * Returns a <code>string</code> representing the rectangle.
         *
         * @return {string}
         */
        toString: function toString() {
            return '[' + this.x + ', ' + this.y + ', ' + this.width + ' x ' + this.height + ']';
        }
    };
})();
