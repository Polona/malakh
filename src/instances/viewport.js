/**
 * Constructs a viewport.
 *
 * @class <p>Represents the visible part of the virtual plane containing all Malakh images.
 * Supports animations by extending <code>Malakh.AnimatedRectangle</code>.
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
 * on the virtual plane containing all Malakh images, whereas <strong>pixel</strong> is the usual
 * pixel on the screen. E.g. when user zooms or drags the canvas <strong>pixels</strong> move but
 * <strong>points</strong> stay the same.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @extends Malakh.AnimatedRectangle
 *
 * @param {Malakh} malakh  Sets <code>this.malakh</code>.
 */
Malakh.Viewport = function Viewport(/* malakh */) {
    this.ensureArguments(arguments, 'Viewport');

    var containerDimensions = this.$container.css(['width', 'height']);
    var containerWidth = parseFloat(containerDimensions.width);
    var containerHeight = parseFloat(containerDimensions.height);
    Malakh.AnimatedRectangle.call(this, this.malakh,
        new Malakh.Rectangle(0, 0, containerWidth, containerHeight));

    /**
     * <code>$container</code> size, cached for performance reasons. NOTE: needs to be manually
     * updated on each <code>$container</code> resize by invoking the <code>resize</code> method!
     * <code>Malakh.Controller</code> invokes it automatically on window resize event.
     *
     * @type Malakh.Point
     */
    this.containerSize = new Malakh.Point(containerWidth, containerHeight);
    /**
     * Viewport can be constrained in a particular rectangle so that a user can't pan or zoom
     * beyond its visibility. It's done by setting <code>this.config.constrainViewport</code>
     * to true and then this parameter is used for constraining. If this parameter is not an instance
     * of <code>Malakh.Rectangle</code>, viewport is not constrained regardless of
     * <code>this.config.constrainViewport</code> setting.
     *
     * @type Malakh.Rectangle
     */
    this.constraintBounds = undefined;

    /**
     * Minimum <code>tiledImage.getWidthScale()</code> of all currently shown tiled images.
     * @type number
     */
    this.minTiledImageWidthScale = Infinity;
    /**
     * Maximum "viewport" level to be drawn. "Viewport level" translates to tiled images' levels; if tiled images
     * are not scaled (i.e. their bounds width & height are equal to the source DZI width & height), it is
     * equal to maximum of <code>maxLevel</code> of all currently shown tiled images.
     * @type number
     */
    this.maxLevel = 0;

    this._minZoom = -Infinity;
    this._maxZoom = Infinity;
    Object.defineProperties(this,
        /**
         * @lends Malakh.Viewport#
         */
        {
            /**
             * Minimal zoom value of the viewport; <code>-Infinity</code> if constraints not set.
             * @type number
             */
            minZoom: {
                get: function () {
                    if (!this.config.constrainViewport || !(this.constraintBounds instanceof Malakh.Rectangle)) {
                        return -Infinity;
                    }
                    this.applyConstraints(true, null, true);
                    return this._minZoom;
                },
                set: function () {
                    console.error('Field Malakh.Viewport#minZoom is not settable');
                },
                enumerable: true,
            },
            /**
             * Maximal zoom value of the viewport; <code>Infinity</code> if constraints not set.
             * @type number
             */
            maxZoom: {
                get: function () {
                    if (!this.config.constrainViewport || !(this.constraintBounds instanceof Malakh.Rectangle)) {
                        return Infinity;
                    }
                    this.applyConstraints(true, null, true);
                    return this._maxZoom;
                },
                set: function () {
                    console.error('Field Malakh.Viewport#maxZoom is not settable');
                },
                enumerable: true,
            },
        }
    );
};

Malakh.Viewport.prototype = Object.create(Malakh.AnimatedRectangle.prototype);
var parentPrototype = Object.getPrototypeOf(Malakh.Viewport.prototype);

$.extend(Malakh.Viewport.prototype,
    /**
     * @lends Malakh.Viewport.prototype
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
         * @param {Malakh.Point} [refPoint]
         */
        zoomTo: function zoomTo(zoom, immediately, refPoint, /* boolean INTERNAL */ dontApplyConstraints) {
            if (!(refPoint instanceof Malakh.Point)) {
                refPoint = this.getCenter();
            }

            var aspect = this.getAspectRatio();

            var oldBounds = this.getRectangle();
            var distanceToTopLeft = refPoint.minus(new Malakh.Point(oldBounds.x, oldBounds.y));
            var refPointRelativeDimensions = new Malakh.Point(
                distanceToTopLeft.x / oldBounds.width,
                distanceToTopLeft.y / oldBounds.height);

            this.springs.width.springTo(this.containerSize.x / zoom, immediately, 'mouseAnimationTime');
            this.springs.height.springTo(this.springs.width.targetValue / aspect, immediately, 'mouseAnimationTime');
            this.springs.x.springTo(refPoint.x - refPointRelativeDimensions.x * this.springs.width.targetValue,
                immediately, 'mouseAnimationTime');
            this.springs.y.springTo(refPoint.y - refPointRelativeDimensions.y * this.springs.height.targetValue,
                immediately, 'mouseAnimationTime');

            if (!dontApplyConstraints) {
                this.applyConstraints(immediately, refPoint);
            }
            this.$container.trigger('malakh:force_redraw');
            return this;
        },

        /**
         * Changes <code>zoom</code> value to <code>zoom * factor </code>.
         *
         * @see #zoomTo
         *
         * @param {number} factor
         * @param {boolean} [immediately=false]
         * @param {Malakh.Point} [refPoint]
         */
        zoomBy: function zoomBy(factor, immediately, refPoint, /* boolean INTERNAL */ dontApplyConstraints) {
            return this.zoomTo(this.getZoom() * factor, immediately, refPoint, dontApplyConstraints);
        },

        /**
         * Pans the viewport so that its center moves to a given <code>center</code> parameter.
         *
         * @param {Malakh.Point} center
         * @param {boolean} [immediately=false]
         */
        panTo: function panTo(center, immediately, /* Object INTERNAL */ options) {
            options = options || {};
            parentPrototype.panTo.call(this, center, immediately, options.animationTimeConfigParameter);
            if (!options.dontApplyConstraints) {
                this.applyConstraints(false);
            }
            this.$container.trigger('malakh:force_redraw');
            return this;
        },

        /**
         * Pans the viewport my a given vector.
         *
         * @param {Malakh.Point} delta A vector by which we pan the viewport.
         * @param {boolean} [immediately=false]
         */
        panBy: function panBy(delta, immediately, /* Object INTERNAL */ options) {
            return this.panTo(this.getCenter().plus(delta), immediately, options);
        },

        /**
         * Displays the whole rectangle as large as possible so that it still
         * fits into the viewport and centers it.
         *
         * Note: this method it's a little different from it's equivalent in
         * <code>Malakh.AnimatedRectangle</code> as we can't change the viewport's aspect ratio.
         *
         * @see Malakh.AnimatedRectangle#fitBounds
         *
         * @param {Malakh.Rectangle} bounds
         * @param {boolean} [immediately=false]
         */
        fitBounds: function fitBounds(bounds, immediately) {
            var aspect = this.getAspectRatio();
            var center = bounds.getCenter();

            // Resize bounds to match viewport's aspect ratio, maintaining center.
            var newBounds = new Malakh.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
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

            this.$container.trigger('malakh:force_align');
            return this;
        },

        /**
         * Zooms out as much as possible while preserving constraints.
         *
         * @param {boolean} [immediately=false]
         */
        fitConstraintBounds: function fitConstraintBounds(immediately) {
            if (!(this.constraintBounds instanceof Malakh.Rectangle)) {
                console.error('Can\'t fit the viewport to constraintBounds because they\'re not set.');
                return this;
            }
            return this.fitBounds(this.constraintBounds, immediately);
        },

        /**
         * Invoked on window resize.
         *
         * @param {Malakh.Point} newContainerSize point: <code>(container width, container height)</code>.
         */
        resize: function resize(newContainerSize) {
            var zoom = this.getZoom();
            // Update container size, but make a copy first.
            this.containerSize = new Malakh.Point(newContainerSize.x, newContainerSize.y); // TODO a Malakh field?
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
         * <code>this.config.constrainViewport</code> parameter since it's checked in controller's
         * method anyway.
         *
         * @param {boolean} [immediately=false]
         * @param {Malakh.Point} [refPoint]
         */
        applyConstraints: function applyConstraints(immediately, refPoint, /* boolean INTERNAL */ setMinMaxZoom) {
            if (!this.config.constrainViewport) {
                return this;
            }
            if (!(this.constraintBounds instanceof Malakh.Rectangle)) { // TODO a Malakh field?
                console.error('Can\'t apply constraints because constraintBounds is not set.');
                return this;
            }
            var scale, minZoomScale, maxZoomScale, pixelSize,

                adjustmentNeeded = false,
                whatToScale = 'height',

                config = this.malakh.config,

                cR = this.constraintBounds, // rectangle of constraints
                vR = this.getRectangle(), // viewport rectangle

                viewportRatio = vR.getAspectRatio(),
                constraintsRatio = cR.width / cR.height;

            if (viewportRatio < constraintsRatio) { // Empty borders on top and bottom.
                // We will turn this case into the latter one.
                whatToScale = 'width';
            }

            /// ZOOMING PART
            // Now we assume viewportRatio < constraintsRatio which means empty borders on sides.
            if (vR[whatToScale] * this.config.minVisibilityRatio > cR[whatToScale] || setMinMaxZoom) {
                // Too small, we need to zoom in.
                adjustmentNeeded = !setMinMaxZoom;
                scale = minZoomScale = vR[whatToScale] * this.config.minVisibilityRatio / cR[whatToScale];
            }
            if (!adjustmentNeeded || setMinMaxZoom) {
                // We check for `!adjustmentNeeded` just in case the image is so small it would fit in both scenarios;
                // we want to aviod flicker in some cases and we prefer zooming in too much than zooming out too much.
                pixelSize = this.getZoom() * this.minTiledImageWidthScale;
                if (pixelSize > config.maxTiledImageStretch || setMinMaxZoom) { // We've zoomed in too much
                    adjustmentNeeded = !setMinMaxZoom;
                    scale = maxZoomScale = config.maxTiledImageStretch / pixelSize;
                }
            }
            if (setMinMaxZoom) {
                this._minZoom = this.getZoom() * minZoomScale;
                this._maxZoom = this.getZoom() * maxZoomScale;
            }

            if (adjustmentNeeded) {
                this.zoomBy(scale, immediately, refPoint, true);
                vR = this.getRectangle();
            }

            if (setMinMaxZoom) { // all data collected, we're not really applying constraints now
                return this;
            }

            /// PANNING PART
            // The viewport rectangle gets adjusted to take margins into account but only for panning, not zooming.
            vR.scaleAroundCenter(1 - 2 * config.marginFactor);

            var parameterPairs = [
                {start: 'x', length: 'width'},
                {start: 'y', length: 'height'},
            ];
            for (var i = 0; i < 2; i++) {
                var pair = parameterPairs[i];
                var start = pair.start;
                var length = pair.length;

                if (vR[length] > cR[length]) {
                    if (config.centerWhenZoomedOut && config.marginFactor === 0) {
                        // If the image is zoomed out so that its height/width is
                        // smaller than constraints, center it.
                        // marginFactor === 0 is required because otherwise implementation would be inconsistent.
                        adjustmentNeeded = true;
                        vR[start] = cR[start] + cR[length] / 2 - vR[length] / 2;
                    } else if (vR[start] > cR[start]) {
                        // Just don't allow going too far outside of the container from the start side...
                        adjustmentNeeded = true;
                        vR[start] = cR[start];
                    } else if (vR[start] + vR[length] < cR[start] + cR[length]) {
                        // ...and from the end side.
                        adjustmentNeeded = true;
                        vR[start] = cR[start] + cR[length] - vR[length];
                    }
                } else if ((vR[start] < cR[start] &&
                    vR[start] + vR[length] < cR[start] + cR[length]) ||
                    (vR[start] > cR[start] &&
                        vR[start] + vR[length] > cR[start] + cR[length])) {
                    // Too far on the left/top.
                    adjustmentNeeded = true;

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

            if (adjustmentNeeded) {
                // 'mouseAnimationTime' is needed because correcting a long animation using a short one
                // causes a jumping effect (and very visible one at that).
                this.panTo(vR.getCenter(), immediately, {
                    dontApplyConstraints: true,
                    animationTimeConfigParameter: 'mouseAnimationTime',
                });
            }

            return this;
        },

        // CONVERSION HELPERS
        /**
         * Converts a point-vector (i.e. a vector indicating distance between two points) to a pixel-vector
         * (analogous).
         *
         * @param {Malakh.Point} deltaPoints
         * @param {boolean} [current=false]
         * @return {Malakh.Point}
         */
        deltaPixelsFromPoints: function deltaPixelsFromPoints(deltaPoints, current) {
            return deltaPoints.multiply(this.getZoom(current));
        },

        /**
         * Converts a pixel-vector to a point-vector. It's different from converting pixels to points because
         * viewport top-left corner's pixel coordinates are always <code>(0, 0)</code> but points don't
         * exhibit this behaviour.
         *
         * @param {Malakh.Point} deltaPixels
         * @param {boolean} [current=false]
         * @return {Malakh.Point}
         */
        deltaPointsFromPixels: function deltaPointsFromPixels(deltaPixels, current) {
            return deltaPixels.divide(this.getZoom(current));
        },

        /**
         * Converts a point to a pixel. Note that viewport top-left corner's pixel coordinates are always
         * <code>(0, 0)</code>.
         *
         * @param {Malakh.Point} point
         * @param {boolean} [current=false]
         * @return {Malakh.Point}
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
         * @param {Malakh.Point} pixel
         * @param {boolean} [current=false]
         * @return {Malakh.Point}
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
         * @param {Malakh.Rectangle} rectangle
         * @param {boolean} [current=false]
         * @return {Malakh.Rectangle}
         */
        pointRectangleFromPixelRectangle: function pointRectangleFromPixelRectangle(rectangle, current) {
            var topLeft = rectangle.getTopLeft();
            var size = rectangle.getSize();

            var newTopLeft = this.pointFromPixel(topLeft, current);
            var newSize = this.deltaPointsFromPixels(size, current);

            return new Malakh.Rectangle(newTopLeft.x, newTopLeft.y, newSize.x, newSize.y);
        },

        /**
         * Reverses <code>pointRectangleFromPixelRectangle</code> action.
         *
         * @see #pointRectangleFromPixelRectangle
         *
         * @param {Malakh.Rectangle} rectangle
         * @param {boolean} [current=false]
         * @return {Malakh.Rectangle}
         */
        pixelRectangleFromPointRectangle: function pixelRectangleFromPointRectangle(rectangle, current) {
            var topLeft = rectangle.getTopLeft();
            var size = rectangle.getSize();

            var newTopLeft = this.pixelFromPoint(topLeft, current);
            var newSize = this.deltaPixelsFromPoints(size, current);

            return new Malakh.Rectangle(newTopLeft.x, newTopLeft.y, newSize.x, newSize.y);
        },
    }
);
