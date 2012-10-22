/*global Seadragon: false */
(function () {
    'use strict';

    /**
     * <p>Constructs a spring.
     *
     * @class <p>Represents a one-dimensional value together with animation definition invoked
     * on the value change. A lot of methods in other classes use springs to implement
     * their animations. The often met parameter in methods using springs is 'current'.
     * If true, it returns current value of the spring that can be during it's animation.
     * When false or missing, it returns the target value. This is used in various
     * loading scenarios when we prefer tiles closer to the target point, not the current,
     * temporary one.
     *
     * @param {number} [initialValue=0]
     *
     * @author <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
     */
    Seadragon.Spring = function (initialValue) {
        /**
         * Current value of the spring, should be between <code>startValue</code> and <code>targetValue</code>.
         * @type number
         * @default 0
         */
        this.currentValue = initialValue || 0;
        /**
         * A value set at the moment the new <code>targetValue</code> is set.
         * It's used for computing <code>currentValue</code>.
         * @type number
         */
        this.startValue = this.currentValue;
        /**
         * A new desired value of the spring. Based on turning on or off animations<code>currentValue</code>
         * is either immediately set to it or scheduled to reach it in some time.
         * @type number
         */
        this.targetValue = this.currentValue;

        var currentTime = Date.now();
        /**
         * Indicates when animation started..
         * @type number
         */
        this.startTime = currentTime;
        /**
         * Time to which animation is scheduled to end.
         * @type number
         */
        this.targetTime = currentTime;

        /**
         * Cached value indicating if the spring is currently animated. This value is set to true
         * at the beginning of the <code>springTo</code> method and is updated in each use of
         * the <code>isAnimating</code> method.
         * @type boolean
         * @private
         */
        this.cacheIsAnimating = true;
    };

    Seadragon.Spring.prototype = {
        /**
         * Function mapping the segment [0, 1] onto itself in a continuous way.
         * Sharpness of the transformation is determined by the
         * <code>Seadragon.Config.springStiffness</code> parameter.
         *
         * @param {number} x
         * @return {number}
         * @private
         */
        transform: function (x) {
            var s = Seadragon.Config.springStiffness;
            return (1.0 - Math.exp(-x * s)) / (1.0 - Math.exp(-s));
        },

        /**
         * Returns the value of the spring. Depending on the <code>current</code> parameter,
         * current or target value is returned.
         *
         * @param {boolean} [current=false] Do we want the current value to be returned?
         * @return {boolean}
         */
        get: function (current) {
            if (current) {
                return this.currentValue;
            } else {
                return this.targetValue;
            }
        },

        /**
         * Changes the target value of the spring.
         *
         * @param {number} target
         * @param {boolean} [immediately=false] If true, we immediately change
         * <code>currentValue</code> to the target one.
         */
        springTo: function (target, immediately) {
            this.cacheIsAnimating = true;
            this.startValue = this.currentValue;
            this.startTime = Date.now();
            this.targetValue = target;
            if (immediately) {
                this.targetTime = this.startTime;
            } else {
                this.targetTime = this.startTime + Seadragon.Config.animationTime;
            }
        },

        /**
         * Changes the value without animating it.
         *
         * @param {number} target
         */
        resetTo: function (target) {
            this.springTo(target, true);
        },

        /**
         * Returns true if spring is animating. Note that we cache the return value
         * for performance reasons and use the cached version if it's false. Thus,
         * the value is manually set to true at the beginning of the springTo method.
         *
         * @return {boolean}
         * @private
         */
        isAnimating: function () {
            if (!this.cacheIsAnimating) {
                return false;
            }
            this.cacheIsAnimating = this.currentValue !== this.targetValue;
            return this.cacheIsAnimating;
        },

        /**
         * Updates the current value of the spring based on current time and start and target values.
         * This method has to be invoked manually which is done by Seadragon.Drawer.
         */
        update: function () {
            var currentTime = Date.now();
            this.currentValue = currentTime >= this.targetTime ?
                this.targetValue :
                this.startValue + (this.targetValue - this.startValue) *
                    this.transform((currentTime - this.startTime) / (this.targetTime - this.startTime));
        }
    };
})();
