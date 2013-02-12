/**
 * Constructs a viewport.
 *
 * @class <p>Represents the visible part of the virtual plane containing all Seadragon images.
 * Supports animations by extending <code>Seadragon.AnimatedRectangle</code>.
 *
 * <p>All methods of this class adhere to two conventions:
 * <ul>
 *     <li><code>current</code> parameter set to true means functions return the current, not target state
 *         of the object; they differ only during animations. By default the target state is returned.</li>
 *     <li><code>immediately</code> parameter set to true means functions invoke an action immediately,
 *         bypassing animations.</li>
 * </ul>
 *
 * <p>Wherever a <code>refPoint</code> parameter appears, it indicates a method tries to apply a transformation
 * while keeping the point's place on the viewport intact. (e.g. if we zoom using mouse we want the point
 * under it not to move).
 *
 * <p>Here and in other parts of code the convention is: <strong>point</strong> means the position
 * on the virtual plane containing all Seadragon images, whereas <strong>pixel</strong> is the usual
 * pixel on the screen. E.g. when user zooms or drags the canvas <strong>pixels</strong> move but
 * <strong>points</strong> stay the same.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @extends Seadragon.AnimatedRectangle
 *
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 */
Seadragon.Viewport = function Viewport(seadragon) {
    this.ensureArguments(arguments, 'Viewport');

    /**
     * Maximum level to be drawn.
     * @type number
     */
    this.maxLevel = 0;

    var containerDimensions = this.$container.css(['width', 'height']);
    var containerWidth = parseFloat(containerDimensions.width);
    var containerHeight = parseFloat(containerDimensions.height);
    Seadragon.AnimatedRectangle.call(this, this.seadragon,
        new Seadragon.Rectangle(0, 0, containerWidth, containerHeight));

    /**
     * <code>$container</code> size, cached for performance reasons. NOTE: needs to be manually
     * updated on each <code>$container</code> resize by invoking the <code>resize</code> method!
     * <code>Seadragon.Controller</code> invokes it automatically on window resize event.
     *
     * @type Seadragon.Point
     */
    this.containerSize = new Seadragon.Point(containerWidth, containerHeight);
    /**
     * Maximum permissible
     * @type number
     */
    this.maxLevelExp = Infinity; // We'll change it later.
    /**
     * Viewport can be constrained in a particular rectangle so that a user can't pan or zoom
     * beyond its visibility. It's done by setting <code>this.config.constraintViewport</code>
     * to true and then this parameter is used for constraining. If this parameter is not an instance
     * of <code>Seadragon.Rectangle</code>, viewport is not constrained regardless of
     * <code>this.config.constraintViewport</code> setting.
     *
     * @type Seadragon.Rectangle
     */
    this.constraintBounds = undefined;
};

Seadragon.Viewport.prototype = Object.create(Seadragon.AnimatedRectangle.prototype);
var parentPrototype = Object.getPrototypeOf(Seadragon.Viewport.prototype);

$.extend(Seadragon.Viewport.prototype,
    /**
     * @lends Seadragon.Viewport.prototype
     */
    {
        /**
         * Returns a number indicating how much the viewport is zoomed in. zoom === 1 means container width
         * equals viewport width.
         *
         * @param {boolean} [current=false]
         * @return {number}
         */
        getZoom: function getZoom(current) {
            return this.containerSize.x / this.springs.width.get(current);
        },

        /**
         * Zooms an image to a given value. <code>zoom</code> of value 1 means 1 point equals 1 pixel.
         *
         * @param {number} zoom
         * @param {boolean} [immediately=false]
         * @param {Seadragon.Point} [refPoint]
         */
        zoomTo: function zoomTo(zoom, immediately, refPoint, /* internal */ dontApplyConstraints) {
            if (!(refPoint instanceof Seadragon.Point)) {
                refPoint = this.getCenter();
            }

            var aspect = this.getAspectRatio();

            var oldBounds = this.getRectangle();
            var distanceToTopLeft = refPoint.minus(new Seadragon.Point(oldBounds.x, oldBounds.y));
            var refPointRelativeDimensions = new Seadragon.Point(
                distanceToTopLeft.x / oldBounds.width,
                distanceToTopLeft.y / oldBounds.height);

            this.springs.width.springTo(this.containerSize.x / zoom, immediately);
            this.springs.height.springTo(this.springs.width.targetValue / aspect, immediately);
            this.springs.x.springTo(
                refPoint.x - refPointRelativeDimensions.x * this.springs.width.targetValue, immediately);
            this.springs.y.springTo(
                refPoint.y - refPointRelativeDimensions.y * this.springs.height.targetValue, immediately);

            if (!dontApplyConstraints) {
                this.applyConstraints(false, refPoint);
            }
            this.$container.trigger('seadragon:forceredraw');
            return this;
        },

        /**
         * Changes <code>zoom</code> value to <code>zoom * factor </code>.
         *
         * @see #zoomTo
         *
         * @param {number} factor
         * @param {boolean} [immediately=false]
         * @param {Seadragon.Point} [refPoint]
         */
        zoomBy: function zoomBy(factor, immediately, refPoint, /* internal */ dontApplyConstraints) {
            return this.zoomTo(this.getZoom() * factor, immediately, refPoint, dontApplyConstraints);
        },

        /**
         * Pans the viewport so that its center moves to a given <code>center</code> parameter.
         *
         * @param {Seadragon.Point} center
         * @param {boolean} [immediately=false]
         */
        panTo: function panTo(center, immediately, /* internal */ dontApplyConstraints) {
            parentPrototype.panTo.call(this, center, immediately);
            if (!dontApplyConstraints) {
                this.applyConstraints(false);
            }
            this.$container.trigger('seadragon:forceredraw');
            return this;
        },

        /**
         * Pans the viewport my a given vector.
         *
         * @param {Seadragon.Point} delta A vector by which we pan the viewport.
         * @param {boolean} [immediately=false]
         */
        panBy: function panBy(delta, immediately, /* internal */ dontApplyConstraints) {
            return this.panTo(this.getCenter().plus(delta), immediately, dontApplyConstraints);
        },

        /**
         * Displays the whole rectangle as large as possible so that it still
         * fits into the viewport and centers it.
         *
         * Note: this method it's a little different from it's equivalent in
         * <code>Seadragon.AnimatedRectangle</code> as we can't change the viewport's aspect ratio.
         *
         * @see Seadragon.AnimatedRectangle#fitBounds
         *
         * @param {Seadragon.Rectangle} bounds
         * @param {boolean} [immediately=false]
         */
        fitBounds: function fitBounds(bounds, immediately) {
            var aspect = this.getAspectRatio();
            var center = bounds.getCenter();

            // Resize bounds to match viewport's aspect ratio, maintaining center.
            var newBounds = new Seadragon.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
            if (newBounds.getAspectRatio() >= aspect) {
                // Width is bigger relative to viewport, resize height.
                newBounds.height = bounds.width / aspect;
                newBounds.y = center.y - newBounds.height / 2;
            } else {
                // Height is bigger relative to viewport, resize width.
                newBounds.width = bounds.height * aspect;
                newBounds.x = center.x - newBounds.width / 2;
            }

            parentPrototype.fitBounds.call(this, newBounds, immediately);

            this.$container.trigger('seadragon:forcealign');
            return this;
        },

        /**
         * Zooms out as much as possible while preserving constraints.
         *
         * @param {boolean} [immediately=false]
         */
        fitConstraintBounds: function fitConstraintBounds(immediately) {
            if (!(this.constraintBounds instanceof Seadragon.Rectangle)) {
                console.error('Can\'t fit the viewport to constraintBounds because they\'re not set.');
                return this;
            }
            return this.fitBounds(this.constraintBounds, immediately);
        },

        /**
         * Invoked on window resize.
         *
         * @param {Seadragon.Point} newContainerSize point: <code>(container width, container height)</code>.
         */
        resize: function resize(newContainerSize) {
            var zoom = this.getZoom();
            // Update container size, but make a copy first.
            this.containerSize = new Seadragon.Point(newContainerSize.x, newContainerSize.y); // TODO a Seadragon field?
            this.springs.width.resetTo(this.containerSize.x / zoom);
            this.springs.height.resetTo(this.springs.width.get() * this.containerSize.y / this.containerSize.x);
            return this.applyConstraints(true);
        },

        /**
         * <p>Moves the viewport so that the user doesn't go too far away. Without it it's easy
         * to "lose" the image.
         *
         * <p>NOTE: Since viewport doesn't have any information about pixel density in particular DZIs,
         * without the <code>maxLevelExp</code> parameter it can't protect from zooming in too much but
         * only from zooming out or dragging the constraints rectangle outside of the viewport. Zooming
         * in has to be handled separately. Thus, it's advised to NOT USE this method directly but
         * to use controller's <code>applyConstraints</code> method instead. This method ignores the
         * <code>this.config.constraintViewport</code> parameter since it's checked in controller's
         * method anyway.
         *
         * @param {boolean} [immediately=false]
         * @param {Seadragon.Point} [refPoint]
         */
        applyConstraints: function applyConstraints(immediately, refPoint) {
            if (!this.config.constraintViewport) {
                return this;
            }
            if (!(this.constraintBounds instanceof Seadragon.Rectangle)) { // TODO a Seadragon field?
                console.error('Can\'t apply constraints because constraintBounds is not set.');
                return this;
            }
            var scale;
            var needToAdjust = false;
            var whatToScale = 'height';

            var cR = this.constraintBounds; // constraints rectangle
            var vR = this.getRectangle(); // viewport rectangle

            var viewportRatio = vR.getAspectRatio();
            var constraintsRatio = cR.width / cR.height;

            if (viewportRatio < constraintsRatio) { // Empty borders on top and bottom.
                // We will turn this case into the latter one.
                whatToScale = 'width';
            }

            /// ZOOMING PART
            // Now we assume viewportRatio < constraintsRatio which means empty borders on sides.
            if (vR[whatToScale] > cR[whatToScale]) { // Too small, we need to zoom in.
                needToAdjust = true;
                scale = vR[whatToScale] / cR[whatToScale];
            } else {
                // We use 'else' just in case the maxLevelExp parameter has a stupid value.
                // Otherwise, it could case the image to flicker.
                var cRInPixels = this.deltaPixelsFromPoints(new Seadragon.Point(cR.width, cR.height));
                if (cRInPixels.x > this.maxLevelExp) { // We've zoomed in too much
                    needToAdjust = true;
                    scale = this.maxLevelExp / cRInPixels.x;
                } else if (cRInPixels.y > this.maxLevelExp) { // We've zoomed in too much
                    needToAdjust = true;
                    scale = this.maxLevelExp / cRInPixels.y;
                }
            }

            if (needToAdjust) {
                this.zoomBy(scale, immediately, refPoint, true);
                vR = this.getRectangle();
            }

            /// PANNING PART
            var parameterPairs = [
                {start: 'x', length: 'width'},
                {start: 'y', length: 'height'}
            ];
            for (var i = 0; i < 2; i++) {
                var pair = parameterPairs[i];
                var start = pair.start;
                var length = pair.length;

                if (vR[length] > cR[length]) {
                    // If the image is zoomed out so that its height/width is
                    // smaller than constraints, center it.
                    needToAdjust = true;
                    vR[start] = cR[start] + cR[length] / 2 - vR[length] / 2;
                }
                else if ((vR[start] < cR[start] && vR[start] + vR[length] < cR[start] + cR[length]) ||
                    (vR[start] > cR[start] && vR[start] + vR[length] > cR[start] + cR[length])) {
                    // Too far on the left/top.
                    needToAdjust = true;

                    // We need to choose the smaller delta so that we don't make
                    // the image jump from side to side.
                    var delta1 = Math.abs(cR[start] - vR[start]);
                    var delta2 = Math.abs(cR[start] + cR[length] - vR[start] - vR[length]);
                    var delta = Math.min(delta1, delta2);

                    if (vR[start] > cR[start]) { // Restoring correct sign of delta.
                        delta = -delta;
                    }
                    vR[start] += delta;
                }
            }

            if (needToAdjust) {
                this.panTo(vR.getCenter(), immediately, true);
            }

            return this;
        },

        // CONVERSION HELPERS
        /**
         * Converts a point-vector (i.e. a vector indicating distance between two points) to a pixel-vector
         * (analogous).
         *
         * @param {Seadragon.Point} deltaPoints
         * @param {boolean} [current=false]
         * @return {Seadragon.Point}
         */
        deltaPixelsFromPoints: function deltaPixelsFromPoints(deltaPoints, current) {
            return deltaPoints.multiply(this.getZoom(current));
        },

        /**
         * Converts a pixel-vector to a point-vector. It's different from converting pixels to points because
         * viewport top-left corner's pixel coordinates are always <code>(0, 0)</code> but points don't
         * exhibit this behaviour.
         *
         * @param {Seadragon.Point} deltaPixels
         * @param {boolean} [current=false]
         * @return {Seadragon.Point}
         */
        deltaPointsFromPixels: function deltaPointsFromPixels(deltaPixels, current) {
            return deltaPixels.divide(this.getZoom(current));
        },

        /**
         * Converts a point to a pixel. Note that viewport top-left corner's pixel coordinates are always
         * <code>(0, 0)</code>.
         *
         * @param {Seadragon.Point} point
         * @param {boolean} [current=false]
         * @return {Seadragon.Point}
         */
        pixelFromPoint: function pixelFromPoint(point, current) {
            var bounds, zoom;
            bounds = this.getRectangle(current);
            zoom = this.getZoom(current);
            return point.minus(bounds.getTopLeft()).multiply(zoom);
        },

        /**
         * Converts a pixel to a point.
         *
         * @param {Seadragon.Point} pixel
         * @param {boolean} [current=false]
         * @return {Seadragon.Point}
         */
        pointFromPixel: function pointFromPixel(pixel, current) {
            var bounds = this.getRectangle(current);
            var zoom = this.getZoom(current);
            return pixel.divide(zoom).plus(bounds.getTopLeft());
        },

        /**
         * Converts rectangle's <code>(topLeftX, topLeftY, width, height)</code> coordinates from ones
         * described in pixels to those described in points.
         *
         * @param {Seadragon.Rectangle} rectangle
         * @param {boolean} [current=false]
         * @return {Seadragon.Rectangle}
         */
        pointRectangleFromPixelRectangle: function pointRectangleFromPixelRectangle(rectangle, current) {
            var topLeft = rectangle.getTopLeft();
            var size = rectangle.getSize();

            var newTopLeft = this.pointFromPixel(topLeft, current);
            var newSize = this.deltaPointsFromPixels(size, current);

            return new Seadragon.Rectangle(newTopLeft.x, newTopLeft.y, newSize.x, newSize.y);
        },

        /**
         * Reverses <code>pointRectangleFromPixelRectangle</code> action.
         *
         * @see #pointRectangleFromPixelRectangle
         *
         * @param {Seadragon.Rectangle} rectangle
         * @param {boolean} [current=false]
         * @return {Seadragon.Rectangle}
         */
        pixelRectangleFromPointRectangle: function pixelRectangleFromPointRectangle(rectangle, current) {
            var topLeft = rectangle.getTopLeft();
            var size = rectangle.getSize();

            var newTopLeft = this.pixelFromPoint(topLeft, current);
            var newSize = this.deltaPixelsFromPoints(size, current);

            return new Seadragon.Rectangle(newTopLeft.x, newTopLeft.y, newSize.x, newSize.y);
        }
    }
);
