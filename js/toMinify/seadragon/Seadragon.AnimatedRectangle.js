/*global Seadragon: false */
(function () {
    'use strict';

    //noinspection JSValidateJSDoc
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
     *     <li>License: MIT (see the licence.txt file for copyright information)</li>
     * <ul>
     *
     * @see Seadragon.Viewport
     *
     * @param {jQuery object} $container Sets <code>this.$container</code>.
     * @param {Seadragon.Rectangle} bounds A rectangle representing the initial value of the animated rectangle.
     */
    Seadragon.AnimatedRectangle = function ($container, bounds) {
        var self = this;

        if ($container == null || !(bounds instanceof Seadragon.Rectangle)) {
            Seadragon.Debug.log('Received arguments: ');
            Seadragon.Debug.log(Array.prototype.slice.apply(arguments));
            Seadragon.Debug.fatal('Incorrect paremeters given to Seadragon.AnimatedRectangle!\n' +
                'Use Seadragon.AnimatedRectangle($container, bounds)');
        }

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
                    if (self.isAnimating) { // We cache it otherwise for performance reasons.
                        self.isAnimating = self.springs.x.isAnimating() || self.springs.y.isAnimating() ||
                            self.springs.width.isAnimating() || self.springs.height.isAnimating();
                        version = Date.now(); // We want an update at least one more time.
                    }
                    return version;
                },
                set: function () {
                    Seadragon.Debug.error('Seadragon.AnimatedRectangle\'s version parameter can\'t ' +
                        'be manually changed');
                }
            }
        });

        /**
         * A jQuery object representing the DOM element containing all the HTML structure of Seadragon.
         * @type jQuery object
         */
        this.$container = $container;

        /**
         * @type Object
         * @property {Seadragon.Spring} x A spring representing the top-left horizontal parameter.
         * @property {Seadragon.Spring} y A spring representing the top-left vertical parameter.
         * @property {Seadragon.Spring} width A spring representing width of the rectangle.
         * @property {Seadragon.Spring} height A spring representing height of the rectangle.
         */
        this.springs = {
            x: new Seadragon.Spring(bounds.x),
            y: new Seadragon.Spring(bounds.y),
            width: new Seadragon.Spring(bounds.width),
            height: new Seadragon.Spring(bounds.height)
        };
    };

    Seadragon.AnimatedRectangle.prototype = {
        /**
         * Returns the usual Seadragon.Rectangle instance from the current or target state.
         *
         * @param {boolean} current
         * @return {Seadragon.Rectangle}
         */
        getRectangle: function (current) {
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
         * @param {boolean} current
         * @return {number}
         */
        getAspectRatio: function (current) {
            return this.getRectangle(current).getAspectRatio();
        },

        /**
         * @param {boolean} current
         * @return {Seadragon.Point}
         */
        getTopLeft: function (current) {
            return this.getRectangle(current).getTopLeft();
        },

        /**
         * @param {boolean} current
         * @return {Seadragon.Point}
         */
        getBottomRight: function (current) {
            return this.getRectangle(current).getBottomRight();
        },

        /**
         * Returns a point <code>(width, height)</code>.
         *
         * @param {boolean} current
         * @return {Seadragon.Point}
         */
        getSize: function (current) {
            return this.getRectangle(current).getSize();
        },

        /**
         * @param current
         * @return {Seadragon.Point}
         */
        getCenter: function (current) {
            return this.getRectangle(current).getCenter();
        },

        /**
         * Pans the viewport to a given center.
         *
         * @param {Seadragon.Point} center
         * @param {boolean} immediately
         */
        panTo: function (center, immediately) {
            this.springs.x.springTo(center.x - this.springs.width.targetValue / 2, immediately);
            this.springs.y.springTo(center.y - this.springs.height.targetValue / 2, immediately);

            this.isAnimating = true;
            this.$container.trigger('seadragon.forceredraw');
        },

        /**
         * Pans the viewport by a given <code>delta</code> vector.
         * @param {Seadragon.Point} delta
         * @param {boolean} immediately
         */
        panBy: function (delta, immediately) {
            this.panTo(this.getCenter().plus(delta), immediately);
        },

        /**
         * Updates the state of all rectangle springs. In case of a change, triggers
         * a <code>seadragon.forceredraw</code> event on the container.
         *
         * @return {boolean} Did anything change?
         */
        update: function () {
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
                this.$container.trigger('seadragon.forceredraw');
            }
            return anythingChanged;
        },

        /**
         * Animates a rectangle to a new one.
         *
         * @param {Seadragon.Rectangle} bounds
         * @param {boolean} immediately
         */
        fitBounds: function (bounds, immediately) {
            this.isAnimating = true;

            this.springs.x.springTo(bounds.x, immediately);
            this.springs.y.springTo(bounds.y, immediately);
            this.springs.width.springTo(bounds.width, immediately);
            this.springs.height.springTo(bounds.height, immediately);

            this.$container.trigger('seadragon.forcealign');
        }
    };
})();
