/*global Seadragon: false */
(function () {
    'use strict';

    /**
     * <p>Creates a magnifier with given <code>center</code> and <code>radius</code>.
     *
     * @class <p>Represents a magnifier which enlarges tiles around the mouse pointer
     * enclosing them in a circular shape.
     *
     * <ul>
     *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
     *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
     *     <li>License: MIT (see the licence.txt file for copyright information)</li>
     * <ul>
     *
     * @param {Seadragon.Point} center
     * @param {number} radius
     */
    Seadragon.Magnifier = function (center, radius) {
        if (!(center instanceof Seadragon.Point) || !radius) {
            Seadragon.Debug.log('Received arguments: ');
            Seadragon.Debug.log(arguments);
            Seadragon.Debug.fatal('Incorrect paremeters given to Seadragon.Magnifier!\n' +
                'Use Seadragon.Magnifier(center, radius). Radius has to be a positive number.');
        }
        this.center = center;
        this.radius = radius;
    };

    Seadragon.Magnifier.prototype = {
        /**
         * Pans the magnifier by a given vector represented by a <code>Seadragon.Point</code> instance.
         *
         * @param {Seadragon.Point} delta
         */
        panBy: function (delta) {
            this.center.x += delta.x;
            this.center.y += delta.y;
        },

        /**
         * Pans the magnifier so that its new center matches a given one.
         *
         * @param {Seadragon.Point} newCenter New center point of the magnifier
         */
        panTo: function (newCenter) {
            this.center.x = newCenter.x;
            this.center.y = newCenter.y;
        },

        contains: function (point) {
            return this.center.distanceTo(point) <= this.radius;
        },

        /**
         * Checks if a magnifier has a non-empty intersection with a given rectangle.
         * WARNING: this methods returns true in some cases where the rectangle
         * doesn't intersect a circle! This operation is used very often so quick
         * checking is important.
         *
         * @param {Seadragon.Rectangle} rectangle
         * @return {boolean}
         */
        intersectsRectangle: function (rectangle) {
            return rectangle.intersectsRectangle(new Seadragon.Rectangle(
                this.center.x - this.radius / Seadragon.Config.magnifierZoom,
                this.center.y - this.radius / Seadragon.Config.magnifierZoom,
                2 * this.radius / Seadragon.Config.magnifierZoom,
                2 * this.radius / Seadragon.Config.magnifierZoom
            ));
        },

        /**
         * Defines a shape enclosing the magnifier.
         *
         * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
         */
        drawPath: function (context) {
            context.lineWidth = 5;
            context.strokeStyle = '#00d5ef';

            // Defines the circle.
            context.beginPath();
            context.arc(this.center.x, this.center.y, Seadragon.Config.magnifierRadius, 0, Math.PI * 2, true);
            context.closePath();
            context.fillStyle = Seadragon.Config.backgroundColor;
            context.fill();
            context.clip();

            var crossLength = 20;

            // Defines a cross in the middle of the magnifier.
            context.moveTo(this.center.x - crossLength / 2, this.center.y);
            context.lineTo(this.center.x + crossLength / 2, this.center.y);
            context.moveTo(this.center.x, this.center.y - crossLength / 2);
            context.lineTo(this.center.x, this.center.y + crossLength / 2);
        },

        /**
         * Draws the defined shape (used after loading tiles so that they don't cover drawn lines).
         *
         * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
         */
        drawOnFinish: function (context) {
            context.lineWidth = 5;
            context.strokeStyle = '#00d5ef';
            context.stroke();
        },

        /**
         * Returns a <code>string</code> representing the magnifier.
         *
         * @return {string}
         */
        toString: function () {
            return 'Magnifier((' + this.center.x + ', ' + this.center.y + '), ' + this.radius + ')';
        }
    };
})();
