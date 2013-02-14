/**
 * Constructs an animated rectangle.
 *
 * @class <p>Represents a rectangle that can be moved using animations. It's represented
 * by a set of four <code>Seadragon.Springs</code> which handle animating.
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
 * @see Seadragon.Viewport
 *
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 * @param {Seadragon.Rectangle} bounds  A rectangle representing the initial value of the animated rectangle.
 */
Seadragon.AnimatedRectangle = function AnimatedRectangle(seadragon, bounds) {
    this.ensureArguments(arguments, 'AnimatedRectangle', ['bounds']);
    if (!(bounds instanceof Seadragon.Rectangle)) {
        bounds = new Seadragon.Rectangle(bounds);
    }

    var that = this;

    /**
     * Indicates if the animated rectangle is in the process of changing its value.
     * @type boolean
     * @default true
     */
    this.isAnimating = true;

    var version = Date.now();
    Object.defineProperties(this, {
        /**
         * Accessing the <code>version</code> parameter updates it to the current date (!),
         * updating isAnimating, too, if it was true. Note that we never change isAnimating
         * if it was false, we need to remember to set it manually when starting particular animations!
         * (this is for performance reasons). Manually setting version is not allowed.
         *
         * @type number
         * @memberof Seadragon.AnimatedRectangle#
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
                console.error('Seadragon.AnimatedRectangle\'s version parameter can\'t be manually changed');
            }
        }
    });

    /**
     * @type Object
     * @property {Seadragon.Spring} x A spring representing the top-left horizontal parameter.
     * @property {Seadragon.Spring} y A spring representing the top-left vertical parameter.
     * @property {Seadragon.Spring} width A spring representing width of the rectangle.
     * @property {Seadragon.Spring} height A spring representing height of the rectangle.
     */
    this.springs = {
        x: this.Spring(bounds.x),
        y: this.Spring(bounds.y),
        width: this.Spring(bounds.width),
        height: this.Spring(bounds.height)
    };
};

Seadragon.AnimatedRectangle.prototype = Object.create(seadragonProxy);

$.extend(Seadragon.AnimatedRectangle.prototype,
    /**
     * @lends Seadragon.AnimatedRectangle.prototype
     */
    {
        /**
         * Returns the usual Seadragon.Rectangle instance from the current or target state.
         *
         * @param {boolean} [current=false]
         * @return {Seadragon.Rectangle}
         */
        getRectangle: function getRectangle(current) {
            return new Seadragon.Rectangle(
                this.springs.x.get(current),
                this.springs.y.get(current),
                this.springs.width.get(current),
                this.springs.height.get(current)
            );
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
         * @return {Seadragon.Point}
         */
        getTopLeft: function getTopLeft(current) {
            return this.getRectangle(current).getTopLeft();
        },

        /**
         * @param {boolean} [current=false]
         * @return {Seadragon.Point}
         */
        getBottomRight: function getBottomRight(current) {
            return this.getRectangle(current).getBottomRight();
        },

        /**
         * Returns a point <code>(width, height)</code>.
         *
         * @param {boolean} [current=false]
         * @return {Seadragon.Point}
         */
        getSize: function getSize(current) {
            return this.getRectangle(current).getSize();
        },

        /**
         * @param [current=false]
         * @return {Seadragon.Point}
         */
        getCenter: function getCenter(current) {
            return this.getRectangle(current).getCenter();
        },

        /**
         * Pans the viewport to a given center.
         *
         * @param {Seadragon.Point} center
         * @param {boolean} [immediately=false]
         */
        panTo: function panTo(center, immediately) {
            this.springs.x.springTo(center.x - this.springs.width.targetValue / 2, immediately);
            this.springs.y.springTo(center.y - this.springs.height.targetValue / 2, immediately);

            this.isAnimating = true;
            this.$container.trigger('seadragon:forceredraw');
            return this;
        },

        /**
         * Pans the viewport by a given <code>delta</code> vector.
         * @param {Seadragon.Point} delta
         * @param {boolean} [immediately=false]
         */
        panBy: function panBy(delta, immediately) {
            return this.panTo(this.getCenter().plus(delta), immediately);
        },

        /**
         * Updates the state of all rectangle springs. In case of a change, triggers
         * a <code>seadragon:forceredraw.seadragon</code> event on the container.
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
                this.$container.trigger('seadragon:forceredraw');
            }
            return anythingChanged;
        },

        /**
         * Animates a rectangle to a new one.
         *
         * @param {Seadragon.Rectangle} bounds
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