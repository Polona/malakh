/**
 * Creates a magnifier with a given <code>center</code>.
 *
 * @class <p>Represents a magnifier which enlarges tiles around the mouse pointer
 * enclosing them in a circular shape.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 * @param {Seadragon.Point} [center=(0,0)]
 */
Seadragon.Magnifier = function Magnifier(seadragon, center) {
    this.ensureArguments(arguments, 'Magnifier', ['center']);
    if (!(center instanceof Seadragon.Point)) {
        center = new Seadragon.Point(center);
    }
    this.center = center;
};

Seadragon.Magnifier.prototype = Object.create(seadragonBasePrototype);

$.extend(Seadragon.Magnifier.prototype,
    /**
     * @lends Seadragon.Magnifier.prototype
     */
    {
        /**
         * Pans the magnifier by a given vector represented by a <code>Seadragon.Point</code> instance.
         *
         * @param {Seadragon.Point} delta
         */
        panBy: function panBy(delta) {
            this.center.x += delta.x;
            this.center.y += delta.y;
            return this;
        },

        /**
         * Pans the magnifier so that its new center matches a given one.
         *
         * @param {Seadragon.Point} newCenter New center point of the magnifier
         */
        panTo: function panTo(newCenter) {
            this.center.x = newCenter.x;
            this.center.y = newCenter.y;
            return this;
        },

        contains: function contains(point) {
            return this.center.distanceTo(point) <= this.config.magnifierRadius;
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
        intersectsRectangle: function intersectsRectangle(rectangle) {
            return rectangle.intersectsRectangle(new Seadragon.Rectangle(
                this.center.x - this.config.magnifierRadius / this.config.magnifierZoom,
                this.center.y - this.config.magnifierRadius / this.config.magnifierZoom,
                2 * this.config.magnifierRadius / this.config.magnifierZoom,
                2 * this.config.magnifierRadius / this.config.magnifierZoom
            ));
        },

        /**
         * Defines a shape enclosing the magnifier.
         *
         * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
         */
        drawPath: function drawPath(context) {
            context.lineWidth = 5;
            context.strokeStyle = '#00d5ef';

            // Defines the circle.
            context.beginPath();
            context.arc(this.center.x, this.center.y, this.config.magnifierRadius, 0, Math.PI * 2, true);
            context.closePath();
            context.fillStyle = this.config.backgroundColor;
            context.fill();
            context.clip();

            var crossLength = 20;

            // Defines a cross in the middle of the magnifier.
            context.moveTo(this.center.x - crossLength / 2, this.center.y);
            context.lineTo(this.center.x + crossLength / 2, this.center.y);
            context.moveTo(this.center.x, this.center.y - crossLength / 2);
            context.lineTo(this.center.x, this.center.y + crossLength / 2);
            return this;
        },

        /**
         * Draws the defined shape (used after loading tiles so that they don't cover drawn lines).
         *
         * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
         */
        drawOnFinish: function drawOnFinish(context) {
            context.lineWidth = 5;
            context.strokeStyle = '#00d5ef';
            context.stroke();
            return this;
        },

        /**
         * Returns a <code>string</code> representing the magnifier.
         *
         * @return {string}
         */
        toString: function toString() {
            return 'Magnifier((' + this.center.x + ', ' + this.center.y + '), ' + this.config.magnifierRadius + ')';
        },
    }
);
