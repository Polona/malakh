/**
 * Constructs an animated rectangle.
 *
 * @class <p>Represents a rectangle that can be moved using animations. It's represented
 * by a set of four <code>Malakh.Springs</code> which handle animating.
 *
 * <p>All <code>AnimatedRectangle</code>'s methods follow the same conventions with respect
 * to <code>current</code> and <code>immediately</code> parameters as <code>Viewport</code>'s ones.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @see Malakh.Viewport
 *
 * @param {Malakh} malakh  Sets <code>this.malakh</code>.
 * @param {Malakh.Rectangle} bounds  A rectangle representing the initial value of the animated rectangle.
 */
Malakh.AnimatedRectangle = function AnimatedRectangle(malakh, bounds) {
    this.ensureArguments(arguments, 'AnimatedRectangle', ['bounds']);
    if (!(bounds instanceof Malakh.Rectangle)) {
        bounds = new Malakh.Rectangle(bounds);
    }

    var that = this;

    /**
     * Indicates if the animated rectangle is in the process of changing its value.
     * @type boolean
     * @default true
     */
    this.isAnimating = true;

    var version = Date.now();
    Object.defineProperties(this,
        /**
         * @lends Malakh.AnimatedRectangle#
         */
        {
            /**
             * Accessing the <code>version</code> parameter updates it to the current date (!),
             * updating isAnimating, too, if it was true. Note that we never change isAnimating
             * if it was false, we need to remember to set it manually when starting particular animations!
             * (this is for performance reasons). Manually setting version is not allowed.
             *
             * @type number
             */
            version: {
                get: function () {
                    if (that.isAnimating) { // We cache it otherwise for performance reasons.
                        that.isAnimating = that.springs.x.isAnimating() || that.springs.y.isAnimating() ||
                            that.springs.width.isAnimating() || that.springs.height.isAnimating();
                        version = Date.now(); // We want an update at least one more time.
                    }
                    return version;
                },
                set: function () {
                    console.error('Malakh.AnimatedRectangle\'s version parameter can\'t be manually changed');
                },
                enumerable: true,
            },
        }
    );

    /**
     * @type Object
     * @property {Malakh.Spring} x A spring representing the top-left horizontal parameter.
     * @property {Malakh.Spring} y A spring representing the top-left vertical parameter.
     * @property {Malakh.Spring} width A spring representing width of the rectangle.
     * @property {Malakh.Spring} height A spring representing height of the rectangle.
     */
    this.springs = {
        x: this.Spring(bounds.x),
        y: this.Spring(bounds.y),
        width: this.Spring(bounds.width),
        height: this.Spring(bounds.height),
    };
};

Malakh.AnimatedRectangle.prototype = Object.create(malakhProxy);

$.extend(Malakh.AnimatedRectangle.prototype,
    /**
     * @lends Malakh.AnimatedRectangle.prototype
     */
    {
        /**
         * Returns the usual Malakh.Rectangle instance from the current or target state.
         *
         * @param {boolean} [current=false]
         * @return {Malakh.Rectangle}
         */
        getRectangle: function getRectangle(current) {
            return new Malakh.Rectangle(
                this.springs.x.get(current),
                this.springs.y.get(current),
                this.springs.width.get(current),
                this.springs.height.get(current)
            );
        },

        /**
         * Returns the current or target top left horizontal parameter.
         *
         * @param {boolean} [current=false]
         * @return {number}
         */
        getX: function getWidthX(current) {
            return this.springs.x.get(current);
        },

        /**
         * Returns the current or target top left vertical parameter.
         *
         * @param {boolean} [current=false]
         * @return {number}
         */
        getY: function getY(current) {
            return this.springs.y.get(current);
        },

        /**
         * Returns the current or target width.
         *
         * @param {boolean} [current=false]
         * @return {number}
         */
        getWidth: function getWidth(current) {
            return this.springs.width.get(current);
        },

        /**
         * Returns the current or target height.
         *
         * @param {boolean} [current=false]
         * @return {number}
         */
        getHeight: function getHeight(current) {
            return this.springs.height.get(current);
        },

        /**
         * Returns aspect ratio of the rectangle (<code>width / height</code>).
         *
         * @param {boolean} [current=false]
         * @return {number}
         */
        getAspectRatio: function getAspectRatio(current) {
            return this.getRectangle(current).getAspectRatio();
        },

        /**
         * @param {boolean} [current=false]
         * @return {Malakh.Point}
         */
        getTopLeft: function getTopLeft(current) {
            return this.getRectangle(current).getTopLeft();
        },

        /**
         * @param {boolean} [current=false]
         * @return {Malakh.Point}
         */
        getBottomRight: function getBottomRight(current) {
            return this.getRectangle(current).getBottomRight();
        },

        /**
         * Returns a point <code>(width, height)</code>.
         *
         * @param {boolean} [current=false]
         * @return {Malakh.Point}
         */
        getSize: function getSize(current) {
            return this.getRectangle(current).getSize();
        },

        /**
         * @param [current=false]
         * @return {Malakh.Point}
         */
        getCenter: function getCenter(current) {
            return this.getRectangle(current).getCenter();
        },

        /**
         * Pans the animated rectangle to a given center.
         *
         * @param {Malakh.Point} center
         * @param {boolean} [immediately=false]
         */
        panTo: function panTo(center, immediately, /* string INTERNAL */ animationTimeConfigParameter) {
            this.springs.x.springTo(center.x - this.springs.width.targetValue / 2, immediately,
                animationTimeConfigParameter);
            this.springs.y.springTo(center.y - this.springs.height.targetValue / 2, immediately,
                animationTimeConfigParameter);

            this.isAnimating = true;
            this.$container.trigger('malakh:force_redraw');
            return this;
        },

        /**
         * Pans the animated rectangle by a given <code>delta</code> vector.
         * @param {Malakh.Point} delta
         * @param {boolean} [immediately=false]
         */
        panBy: function panBy(delta, immediately, /* string INTERNAL */ animationTimeConfigParameter) {
            return this.panTo(this.getCenter().plus(delta), immediately, animationTimeConfigParameter);
        },

        /**
         * Updates the state of all rectangle springs. In case of a change, triggers
         * a <code>malakh:forceredraw.malakh</code> event on the container.
         *
         * @return {boolean} Did anything change?
         */
        update: function update() {
            var bounds = this.getRectangle(true);

            this.springs.x.update();
            this.springs.y.update();
            this.springs.width.update();
            this.springs.height.update();

            var anythingChanged = this.springs.x.currentValue !== bounds.x ||
                this.springs.y.currentValue !== bounds.y ||
                this.springs.width.currentValue !== bounds.width ||
                this.springs.height.currentValue !== bounds.height;
            if (anythingChanged) {
                this.$container.trigger('malakh:force_redraw');
            }
            return anythingChanged;
        },

        /**
         * Animates a rectangle to a new one.
         *
         * @param {Malakh.Rectangle} bounds
         * @param {boolean} [immediately=false]
         */
        fitBounds: function fitBounds(bounds, immediately) {
            this.isAnimating = true;

            this.springs.x.springTo(bounds.x, immediately);
            this.springs.y.springTo(bounds.y, immediately);
            this.springs.width.springTo(bounds.width, immediately);
            this.springs.height.springTo(bounds.height, immediately);

            return this;
        },
    }
);
