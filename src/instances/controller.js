/**
 * Constructs a controller.
 *
 * @class <p>Manages all of Seadragon parts. It receives events and passes them along to the viewport,
 * Seadragon images and tells drawer when to update the current view. This is the 'core' Seadragon part.
 *
 * <p>See <code>Seadragon.Viewport</code> description for information about conventions around parameters
 * named <code>current</code> and <code>immediately</code> and names <strong>point</strong> and <strong>pixel</strong>.
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
 */
Seadragon.Controller = function Controller(seadragon) {
    this.ensureArguments(arguments, 'Controller');

    var that = this,
        animated,
        forceAlign, forceRedraw,
        tiledImagesOptions, // map: imageNumber -> options needed to load the image; relevant for ones not yet loaded
        tiledImagesCallbacks, // map: imageNumber -> functions to execute when image is loaded
        tiledImageBoundsUpdatesNums,
        tiledImagesToHandle,
        lastPosition, lastTouchStretch,
        containerSize,
        lockOnUpdates,
        wheelToPanEnabled;

    Object.defineProperties(this, {
        /**
         * If the image on which <code>Controller#openDzi</code> was invoked is hidden by default, its loading gets
         * deferred. Since we might want to apply some operations on the image once it's shown, we add them to the
         * <code>tiledImagesCallbacks[i]</code> array where <code>i</code> is the index in <code>tiledImages</code>
         * where the image is scheduled to be loaded.
         *
         * @type Array.<Function>
         * @memberof Seadragon.Controller#
         */
        tiledImagesCallbacks: {
            get: function () {
                return tiledImagesCallbacks;
            },
            enumerable: true,
        },
    });

    if (Seadragon.Magnifier) {
        /**
         * Shows the magnifier.
         */
        this.enableMagnifier = function enableMagnifier() {
            if (that.config.enableMagnifier) { // already enabled
                return this;
            }
            $(document).trigger('mouseup.seadragon'); // To stop canvas dragging etc.

            that.config.enableMagnifier = true;
            document.body.style.cursor = 'none';

            that.$canvas.on('mousemove.seadragon', moveMagnifier);
            that.$canvas.trigger('mousemove.seadragon');

            return this;
        };

        /**
         * Hides the magnifier.
         */
        this.disableMagnifier = function disableMagnifier() {
            if (!that.config.enableMagnifier) { // already disabled
                return this;
            }
            that.$canvas.off('mousemove.seadragon', moveMagnifier);

            that.config.enableMagnifier = false;
            document.body.style.cursor = '';

            forceRedraw = true;
            return this;
        };

        /**
         * Toggles magnifier's state - shows it if it was hidden; hides it otherwise.
         *
         * @param {boolean} [enable]  If provided, falls back to <code>enableMagnifier</code>
         *                            or <code>disableMagnifier</code>.
         */
        this.toggleMagnifier = function toggleMagnifier(enable) {
            if (enable == null) {
                enable = !that.config.enableMagnifier;
            }
            if (enable) {
                that.enableMagnifier();
            } else {
                that.disableMagnifier();
            }
            return this;
        };
    }

    if (Seadragon.Picker) {
        /**
         * Shows the picker.
         */
        this.enablePicker = function enablePicker() {
            if (that.config.enablePicker) { // already enabled
                return this;
            }
            that.config.enablePicker = true;
            that.picker.show();
            return this;
        };

        /**
         * Hides the picker.
         */
        this.disablePicker = function disablePicker() {
            if (!that.config.enablePicker) { // already disabled
                return this;
            }
            that.config.enablePicker = false;
            that.picker.hide();
            return this;
        };

        /**
         * Toggles picker's state - shows it if it was hidden; hides it otherwise.
         *
         * @param {boolean} [enable]  If provided, falls back to <code>enablePicker</code>
         *                            or <code>disablePicker</code>.
         */
        this.togglePicker = function togglePicker(enable) {
            if (enable == null) {
                enable = !that.config.enablePicker;
            }
            if (enable) {
                that.enablePicker();
            } else {
                that.disablePicker();
            }
            return this;
        };
    }

    /**
     * Returns mouse position extracted from <code>event</code> relative to the Seadragon canvas.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @return {Seadragon.Point}
     */
    this.getMousePosition = function getMousePosition(evt) {
        var offset = that.$container.offset();
        return new Seadragon.Point(evt.pageX - offset.left, evt.pageY - offset.top);
    };

    function wheelToZoom(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        if (that.config.enableMagnifier) {
            return;
        }
        zoomCanvas(evt);
        that.restoreUpdating();
    }

    function wheelToPan(evt) {
        evt.preventDefault(); // block gestures for back/forward history navigation
        evt.stopPropagation();

        var deltaX, deltaY, scale;

        var seadragon = that.seadragon,
            viewport = seadragon.viewport,
            $container = seadragon.$container;

        switch (evt.deltaMode) {
            case 0: // deltas in pixels
                scale = 1;
                break;
            case 1: // deltas in lines
                scale = 14; // default line-height, I guess
                break;
            case 2: // deltas in pages
                scale = parseFloat($container.css('height'));
                break;
            default:
                that.fail('SeadragonManagerView#toggleBlockZoom: deltaMode not recognized', evt.deltaMode, evt);
        }
        scale *= seadragon.config.wheelToPanScale; // panning using wheel can have different speed than zooming
        deltaX = scale * evt.deltaX;
        deltaY = scale * evt.deltaY;

        if (evt.shiftKey) {
            // Swap deltaX & deltaY (thus, if deltaX is missing, we can scroll horizontally).
            var oldDeltaX = deltaX;
            deltaX = deltaY;
            deltaY = oldDeltaX;
        }

        viewport.panBy(viewport.deltaPointsFromPixels(new Seadragon.Point(deltaX, deltaY)));
    }

    /**
     * Compute touch stretch (i.e. the current distance of the touch point to <code>lastPosition</code>,
     * which is the center of gravity of all current touch points. This method is used to handle pinch-to-zoom.
     *
     * @param {Touch} touch
     * @returns {number}
     */
    function getLastTouchStretch(touch) {
        return lastPosition.minus(that.getMousePosition(touch)).distanceToCenter();
    }

    /**
     * Pan from remembered <code>lastPosition</code> to provided <code>position</code>. When using mouse,
     * <code>position</code> is the usual mouse position relative to Seadragon canvas. When using touch,
     * it's a center of gravity of all current touch points.
     *
     * @param {Seadragon.Point} position
     * @param {boolean} [immediately=false]
     * @private
     */
    function panToNewPosition(position, immediately) {
        var seadragon = that.seadragon,
            viewport = seadragon.viewport,
            blockMovement = seadragon.config.blockMovement;

        var delta = lastPosition.minus(position);
        lastPosition = position;

        if (blockMovement.horizontal) {
            delta.x = 0;
        }
        if (blockMovement.vertical) {
            delta.y = 0;
        }
        viewport.panBy(viewport.deltaPointsFromPixels(delta), immediately);
    }

    /**
     * Handler executed when user drags the canvas using their mouse.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @private
     */
    function dragCanvas(evt) {
        panToNewPosition(that.getMousePosition(evt));
    }

    /**
     * Handler executed when zooming using mouse wheel.
     *
     * @param {jQuery.Event} evt Mouse `wheel` event.
     * @private
     */
    function zoomCanvas(evt) {
        var seadragon = that.seadragon,
            viewport = seadragon.viewport,
            config = seadragon.config;

        if (!config.blockZoom) {
            viewport.zoomBy(
                evt.deltaY > 0 ? // zooming out
                    1 / config.zoomPerScroll :
                    config.zoomPerScroll,
                false,
                viewport.pointFromPixel(that.getMousePosition(evt), true));
        }
    }

    /**
     * `touchmove` event handler.
     *
     * @param {jQuery.Event} evt Touch `touchmove` event.
     * @private
     */
    function onTouchMove(evt) {
        evt.preventDefault();

        var seadragon = that.seadragon,
            viewport = seadragon.viewport,
            blockZoom = seadragon.config.blockZoom;

        var touchStretch;
        var targetTouches = evt.originalEvent.targetTouches;

        panToNewPosition(getTouchCenter(targetTouches), true); // pan immediately, touch devices are slow

        if (!blockZoom && targetTouches.length > 1) {
            touchStretch = getLastTouchStretch(targetTouches[0]);

            viewport.zoomBy(
                touchStretch / lastTouchStretch,
                true, // touch zoom should be applied immediately
                viewport.pointFromPixel(lastPosition, true));

            lastTouchStretch = touchStretch;
        }
    }

    /**
     * Returns the center of gravity of all current touch points.
     *
     * @param {TouchList} touches
     * @returns {Seadragon.Point}
     * @private
     */
    function getTouchCenter(touches) {
        var touchesX = 0, touchesY = 0, touchesLength = touches.length;
        for (var i = 0; i < touchesLength; i++) {
            var relativeTouch = that.getMousePosition(touches[i]);
            touchesX += relativeTouch.x;
            touchesY += relativeTouch.y;
        }
        touchesX /= touchesLength;
        touchesY /= touchesLength;
        return new Seadragon.Point(touchesX, touchesY);
    }

    /**
     * Event handler for `touchstart` or `touchend`. Each time the number of touch points changes their center
     * of gravity is computed as well as the current distance of the first touch point to this gravity center. This
     * distance, saved in a <code>lastTouchStretch</code> variable is used to implement pinch-to-zoom.
     *
     * @param {jQuery.Event} evt  `touchstart` or `touchend` jQuery event.
     */
    function touchPointsNumberChanged(evt) {
        evt.preventDefault();
        if (Seadragon.Magnifier) {
            that.disableMagnifier(); // TODO handle magnifier in touch mode, too?
        }

        $(document).off('touchmove.seadragon', onTouchMove); // we'll register it again

        var targetTouches = evt.originalEvent.targetTouches;
        var targetTouchesLength = targetTouches.length;

        if (targetTouchesLength > 0) {
            lastPosition = getTouchCenter(targetTouches);
            if (targetTouchesLength > 1) {
                // Count the distance of the first touch point to the center;
                // pinch-to-zoom will be handled using it.
                lastTouchStretch = getLastTouchStretch(targetTouches[0]);
            }
            $(document).on('touchmove.seadragon', onTouchMove);
        }

        that.restoreUpdating();
    }

    function bindEvents() {
        that.$canvas.on({
            'mouseenter.seadragon': function () {
                if (that.config.enableMagnifier) {
                    that.restoreUpdating();
                }
            },

            'mouseleave.seadragon': function () {
                if (that.config.enableMagnifier) { // We have to redraw to hide magnifier.
                    that.restoreUpdating();
                }
            },

            'mousedown.seadragon': function (evt) {
                if (evt.which !== 1 || that.config.enableMagnifier) { // Only left-click is supported.
                    return;
                }
                lastPosition = that.getMousePosition(evt);
                $(document).on('mousemove.seadragon', dragCanvas);
            },

            'wheel.seadragon': wheelToZoom,

            'touchstart.seadragon': touchPointsNumberChanged,
            'touchend.seadragon': touchPointsNumberChanged,
        });

        that.$container.on({
            'seadragon:force_align.seadragon': function () {
                forceAlign = true;
                recalculateMaxLevel();
                that.restoreUpdating();
            },

            'seadragon:force_redraw.seadragon': function () {
                that.restoreUpdating();
            }
        });

        $(document).on({
            'mouseup.seadragon': function () {
                $(document).off('mousemove.seadragon', dragCanvas);
            },
        });
        $(window).on('resize.seadragon', that.restoreUpdating);
    }

    /**
     * Switches `wheel` event behavior to panning.
     */
    this.enableWheelToPan = function enableWheelToPan() {
        if (wheelToPanEnabled) {
            return this; // already enabled
        }
        wheelToPanEnabled = true;
        that.$canvas
            .off('wheel.seadragon', wheelToZoom)
            .on('wheel.seadragon', wheelToPan);
        return this;
    };

    /**
     * Switches `wheel` event behavior to zooming.
     */
    this.disableWheelToPan = function disableWheelToPan() {
        if (!wheelToPanEnabled) {
            return this; // already disabled
        }
        wheelToPanEnabled = false;
        that.$canvas
            .off('wheel.seadragon', wheelToPan)
            .on('wheel.seadragon', wheelToZoom);
        return this;
    };

    /**
     * Toggles `wheel` event behavior between panning and zooming.
     *
     * @param {boolean} [enable]  If provided, falls back to <code>enableWheelToPan</code>
     *                            or <code>disableWheelToPan</code>.
     */
    this.toggleWheelToPan = function toggleWheelToPan(enable) {
        if (enable == null) {
            enable = !wheelToPanEnabled;
        }
        if (enable) {
            that.enableWheelToPan();
        } else {
            that.disableWheelToPan();
        }
        return this;
    };

    /**
     * Moves the magnifier to mouse position determined by <code>event</code>.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @private
     */
    function moveMagnifier(evt) {
        var position = that.getMousePosition(evt);
        that.seadragon.magnifier.panTo(position);
        that.restoreUpdating();
    }

    /**
     * Computes maximum level to be drawn on canvas. Note that it's not simply
     * maximum of all <code>tiledImage.maxLevel<code>s - their levels all scaled so that
     * they match "virtual" levels with regards to their representation on canvas.
     *
     * @see Seadragon.TiledImage#getTiledImageLevel
     * @private
     */
    function recalculateMaxLevel() {
        var seadragon = that.seadragon,
            tiledImages = seadragon.tiledImages,
            viewport = seadragon.viewport;

        var viewportMaxLevel = 0, minTiledImageWidthScale = Infinity;
        for (var i = 0; i < tiledImages.length; i++) {
            var tiledImage = tiledImages[i];
            if (tiledImage instanceof Seadragon.TiledImage && tiledImage.opacity > 0) { // tiled image has been loaded
                viewportMaxLevel = Math.max(
                    viewportMaxLevel,
                    tiledImage.getViewportLevel(tiledImage.maxLevel)
                );
                minTiledImageWidthScale = Math.min(minTiledImageWidthScale, tiledImage.getWidthScale());
            }
        }
        viewport.maxLevel = viewportMaxLevel;
        viewport.minTiledImageWidthScale = minTiledImageWidthScale;
    }

    /**
     * Checks if the image was scheduled to open and the opening process has already started. <code>false</code>
     * can occur if <code>openDzi</code> was invoked on an image hidden by default as its loading is then deferred.
     *
     * @param {number} index  Index in the <code>this.tiledImages</code> table where <code>tiledImage</code> is put.
     * @return {boolean}
     */
    this.imageLoadingStarted = function imageLoadingStarted(index) {
        return index < this.tiledImages.length && tiledImagesOptions[index] == null;
    };

    /**
     * Registers a new open image.
     *
     * @param {Seadragon.TiledImage} tiledImage
     * @param {number} index  Index in the <code>this.tiledImages</code> table where <code>tiledImage</code> is put.
     * @private
     */
    function onOpen(tiledImage, index) {
        if (!tiledImage) {
            console.error('No TiledImage given to Controller\'s onOpen()!');
            return;
        }

        // Adding a new image.
        that.tiledImages[index] = tiledImage;
        tiledImageBoundsUpdatesNums[index] = 0;
        that.drawer.registerTiledImage(tiledImage, index);

        that.viewport.maxLevel = Math.max(that.viewport.maxLevel, tiledImage.maxLevel);

        tiledImagesToHandle--;

        that.$container
            .trigger('seadragon:loaded_tiled_image')
            .trigger('seadragon:showed_tiled_image');
        if (tiledImagesToHandle === 0) {
            that.$container.trigger('seadragon:loaded_all_tiled_images');
        }

        var callbacks = tiledImagesCallbacks[index];
        if (callbacks) {
            utils.forEach(callbacks, function (callback) {
                callback.call(tiledImage);
            });
            tiledImagesCallbacks[index] = null;
        }
        that.restoreUpdating();
    }

    /**
     * Schedule the next update run. Scheduling is paused when animations and user actions finish.
     * @private
     */
    function scheduleUpdate() {
        if (!lockOnUpdates) {
            if (that.isLoading()) {
                setTimeout(scheduleUpdate);
                return;
            }
            requestAnimationFrame(update);
        }
    }

    /**
     * Unblock updates stopped by a lack of action. Invoked by single actions expecting redrawing.
     */
    this.restoreUpdating = function restoreUpdating() {
        forceRedraw = true;
        if (lockOnUpdates) {
            lockOnUpdates = false;
            scheduleUpdate();
        }
        return this;
    };

    /**
     * Updates bounds of a Seadragon image; usually used during aligning (so not too often).
     *
     * @param {number} whichImage  Image index of <code>tiledImage</code> in <code>this.tiledImages</code> table.
     * @param {boolean} decreaseCounter  If provided, decreases the counted number of
     *                                   <code>updateTiledImageBounds</code> invocations on the <code>tiledImage</code>
     *                                   with a given index. Parameter used only by the
     *                                   <code>scheduleUpdateDziImageBounds</code> function.
     * @private
     */
    function updateTiledImageBounds(whichImage, decreaseCounter) {
        var tiledImage = that.seadragon.tiledImages[whichImage];
        forceAlign = tiledImage.animatedBounds.update() || forceAlign;
        that.restoreUpdating();
        if (decreaseCounter) {
            tiledImageBoundsUpdatesNums[whichImage]--;
        }
    }

    /**
     * <p>Schedules the <code>updateTiledImageBounds</code> function on the <code>tiledImage</code> with index
     * <code>whichImage</code>. The whole idea behind this function is to not allow more than one invocation of
     * <code>updateTiledImageBounds</code> to wait on <code>setTimeout</code>s; it increases performance on weaker
     * computers.
     *
     * <p>If the <code>tiledImageBoundsUpdatesNums[whichImage]</code> value is:
     * <ul>
     *     <li><code>0</code> (or <code>1</code> if <code>forceExecution</code> is true), then we invoke the
     *         <code>updateTiledImageBounds</code> asynchronously.</li>
     *     <li><code>1</code>, then we wait a short time before trying again.</li>
     *     <li><code>>=2</code>, then we abort since one other instance is already waiting.</li>
     * </ul>
     * If the flag <code>forceExecution</code> is true, we invoke <code>updateTiledImageBounds</code>
     * if only <code>tiledImageBoundsUpdatesNums[whichImage] < 2</code>. This is necessary
     * because when counter increases by 1, the invocation which triggered the increase waits on
     * <code>setTimeout</code> and needs to be invoked when it remains the only waiting instance.
     *
     * @param {number} whichImage  Image index of <code>tiledImage</code> in <code>this.tiledImages</code> table.
     * @param {boolean} [forceExecution=false]
     * @private
     */
    function scheduleUpdateDziImageBounds(whichImage, forceExecution) {
        var tiledImageBoundsUpdatesNum = tiledImageBoundsUpdatesNums[whichImage];

        if (tiledImageBoundsUpdatesNum === 0 ||
            (forceExecution && tiledImageBoundsUpdatesNum === 1)) {
            // no other instance of this function was dispatched on tiledImage
            if (!forceExecution) { // otherwise counter already increased
                tiledImageBoundsUpdatesNums[whichImage]++;
            }
            setTimeout(updateTiledImageBounds, 0, whichImage, true); // invoke asynchronously
        }
        else if (tiledImageBoundsUpdatesNum === 1) {
            // one function instance was dispatched on tiledImage, trying in a moment
            tiledImageBoundsUpdatesNums[whichImage]++;
            setTimeout(scheduleUpdateDziImageBounds, 100, whichImage, true);
        }
        /* else {} // one function instance already waits, no need for a new one */
    }

    /**
     * A single update process, delegating drawing to the Drawer on a change.
     * @private
     */
    function update() {
        // Caching this.seadragon.[a-zA-Z]* instances.
        // Note: we avoid using ES5 getters here for performance reasons.
        var seadragon = that.seadragon,
            $container = seadragon.$container,
            $canvas = seadragon.$canvas,
            viewport = seadragon.viewport,
            tiledImages = seadragon.tiledImages,
            drawer = seadragon.drawer;

        var containerCss = $container.css(['width', 'height']);
        var newContainerSize = new Seadragon.Point(parseFloat(containerCss.width), parseFloat(containerCss.height));

        if (!newContainerSize.equals(containerSize)) {
            // Maintain image position:
            forceRedraw = true; // canvas needs it
            containerSize = newContainerSize; // TODO maybe keep it as a Seadragon parameter?
            viewport.resize(newContainerSize);

            // Resize canvas.
            $canvas
                .attr('width', newContainerSize.x)
                .attr('height', newContainerSize.y);

            // Let the world know we resized.
            $container.trigger('seadragon:resize');
        }

        // animating => viewport moved, aligning images or loading/blending tiles.
        var animating = viewport.update() || forceAlign || forceRedraw;
        if (forceAlign) {
            forceAlign = false;
            setTimeout(function () { // Making it more asynchronous.
                utils.forEach(tiledImages, function (tiledImage, whichImage) {
                    if (tiledImage instanceof Seadragon.TiledImage) { // tiled image has been loaded
                        scheduleUpdateDziImageBounds(whichImage);
                    }
                });
            });
        }

        if (animating) {
            forceRedraw = drawer.update();
        } else {
            lockOnUpdates = true;
        }

        // Triger proper events.
        if (!animated && animating) {
            // We weren't animating, and now we did ==> animation start.
            $container
                .trigger('seadragon:animation_start')
                .trigger('seadragon:animation');
        } else if (animating) {
            // We're in the middle of animating.
            $container.trigger('seadragon:animation');
        } else if (animated) {
            // We were animating, and now we're not anymore ==> animation finish.
            $container.trigger('seadragon:animation_end');
        }

        // For the next update check.
        animated = animating;

        scheduleUpdate();
    }

    /**
     * Processes a DZI file, creating a <code>DziImage</code> instance.
     *
     * @param {Object} options An object containing all given options.
     * @param {Document} options.data An object representing a DZI file.
     * @param {string} options.dziUrl See <a href="#createFromDzi"><code>Seadragon.DziImage.createFromDzi</code></a>.
     * @param {string} [options.tilesUrl] See <a href="#createFromDzi"><code>Seadragon.DziImage.createFromDzi</code></a>
     * @param {Document} [options.bounds] Bounds in which an image must fit. If not given, we assume the rectangle
     *                                    <code>[0, 0, width x height]</code> where <code>width</code> and
     *                                    <code>height</code> are taken from DZI.
     * @param {boolean} [options.shown] See <a href="#createFromDzi"><code>Seadragon.DziImage.createFromDzi</code></a>.
     * @return {Seadragon.DziImage}
     *
     * @memberof Seadragon.Controller~
     * @private
     */
    function processDzi(options) {
        var imageNode = $(options.data.documentElement);
        if (!imageNode || imageNode.prop('tagName') !== 'Image') {
            that.fail('Sorry, we only support Deep Zoom Image!');
        }

        var fileFormat = imageNode.attr('Format');

        var sizeNode = imageNode.children('size');

        var invalidFormatMessage = 'This doesn\'t appear to be a valid Deep Zoom Image.';
        if (!sizeNode) {
            that.fail(invalidFormatMessage);
        }

        var width = parseInt(sizeNode.attr('Width'), 10);
        var height = parseInt(sizeNode.attr('Height'), 10);
        var tileSize = parseInt(imageNode.attr('TileSize'), 10);
        var tileOverlap = parseInt(imageNode.attr('Overlap'), 10);

        if (!width || !height || !tileSize) {
            that.fail(invalidFormatMessage);
        }

        // If tilesUrl were not provided, the default path is the same as dziUrl with ".dzi" changed into "_files".
        var tilesUrl = options.tilesUrl || options.dziUrl.replace(/\.dzi$/, '_files/');

        if (!options.bounds) {
            options.bounds = new Seadragon.Rectangle(0, 0, width, height); // default bounds copied from DZI
        }

        return that.DziImage({
            width: width,
            height: height,
            tileSize: tileSize,
            tileOverlap: tileOverlap,
            tilesUrl: tilesUrl,
            fileFormat: fileFormat,
            bounds: options.bounds,
        });
    }


    /**
     * Creates a DziImage instance from the DZI file.
     *
     * @param {Object} options  An object containing all given options.
     * @param {string} options.dziUrl  The URL/path to the DZI file.
     * @param {string} [options.tilesUrl]  The URL/path to the tiles directory; by default it's the same
     *                                     as <code>dziUrl<code> with '.dzi' changed to '_files'.
     * @param {Seadragon.Rectangle} [options.bounds]  Bounds representing position and shape of the image on the virtual
     *                                                Seadragon plane.
     * @param {number} [options.index]  If specified, an image is loaded into
     *                                  <code>controller.tiledImages[index]</code>.
     *                                  Otherwise it's put at the end of the table.
     * @param {boolean} [options.shown=true]  If false, image is not drawn. It can be made visible later.
     */
    this.createFromDzi = function createFromDzi(options) {
        this.ensureOptions(options, 'DziImage.createFromDzi', ['dziUrl']);

        $.ajax({
            type: 'GET',
            url: options.dziUrl,
            dataType: 'xml',
            success: function (data) {
                options.data = data;
                onOpen(processDzi(options), options.index);
            },
            error: function (_, statusText) {
                this.fail('Unable to retrieve the given DZI file, does it really exist?\n' + statusText);
            }
        });

        return this;
    };

    /**
     * Opens Deep Zoom Image (DZI).
     *
     * @param {string} dziUrl  The URL/path to the DZI file.
     * @param {Object} options  An object containing all given options.
     * @param {string} [options.tilesUrl]  The URL/path to the tiles directory; by default it's the same
     *                                     as <code>dziUrl<code> with '.dzi' changed to '_files'.
     * @param {number} [options.index]  If specified, an image is loaded into
     *                                  <code>controller.tiledImages[index]</code>. Otherwise it's put at the end of
     *                                  the table.
     * @param {Seadragon.Rectangle} [options.bounds]  Bounds representing position and shape of the image on the virtual
     *                                                Seadragon plane.
     *//**
     * Opens Deep Zoom Image (DZI).
     *
     * @param {Object} options  An object containing all given options.
     * @param {string} options.dziUrl  The URL/path to the DZI file.
     * @param {string} [options.tilesUrl]  The URL/path to the tiles directory; by default it's the same
     *                                     as <code>dziUrl<code> with '.dzi' changed to '_files'.
     * @param {number} [options.index]  If specified, an image is loaded into
     *                                  <code>controller.tiledImages[index]</code>. Otherwise it's put at the end of
     *                                  the table.
     * @param {Seadragon.Rectangle} [options.bounds]  Bounds representing position and shape of the image on the virtual
     *                                                Seadragon plane.
     */
    this.openDzi = function openDzi() {
        var options;

        var seadragon = this.seadragon,
            tiledImages = seadragon.tiledImages;

        // Handling signature variations.
        var arguments0 = arguments[0];
        if (arguments0 == null) { // wrong invocation, reverting changes
            this.fail('No arguments passed to openDzi!');
        }
        if (arguments0.dziUrl) {
            // Signature openDzi(options).
            options = arguments0;
        } else {
            // Signature openDzi(dziUrl, options).
            options = arguments[1];
            options.dziUrl = arguments0;
        }


        if (options.index == null) {
            options.index = tiledImages.length;
        }
        if (!tiledImagesCallbacks[options.index]) { // image not registered yet => initialize fields
            tiledImages[options.index] = null; // keep space for the image
            tiledImagesCallbacks[options.index] = [];
        }

        var shown = options.shown == null ? true : options.shown;
        if (!shown) { // register image options to show later
            tiledImagesOptions[options.index] = options;
        }
        else { // actually open the DZI image
            // Removing options so that we don't try to open the same DZI twice.
            tiledImagesOptions[options.index] = null;

            tiledImagesToHandle++;

            try {
                this.createFromDzi(options);
            } catch (error) {
                // We try to keep working even after a failed attempt to load a new DZI.
                tiledImagesToHandle--;
                tiledImages[options.index] = null;
                console.error('DZI failed to load; provided options:', options);
                console.log(error.stack);
            }
        }

        return this;
    };

    /**
     * Opens an array of DZIs.
     *
     * @param {Array.<string>} optionsArray Array of objects containing data of particular DZIs.
     */
    this.openDziArray = function openDziArray(optionsArray, hideByDefault) {
        tiledImagesToHandle += optionsArray.length;

        if (!optionsArray.length) {
            this.log('No images to open!', arguments);
            return this;
        }

        utils.forEach(optionsArray, function (options) {
            tiledImagesToHandle--; // openDzi increases it again
            if (options.shown == null) {
                options.shown = !hideByDefault;
            }
            that.openDzi(options);
        });
        return this;
    };


    /**
     * Sets viewport's constraints to the image of a given index.
     *
     * @param {number} whichImage  We constrain to the <code>this.tiledImages[whichImage]</code> image.
     * @param {boolean} [dontForceConstraints=false]  If true, just set the constraints rectangle,
     *                                                don't enforce it at the moment.
     */
    this.constrainToImage = function constrainToImage(whichImage, dontForceConstraints) {
        var seadragon = this.seadragon,
            viewport = seadragon.viewport,
            $container = seadragon.$container,
            tiledImages = seadragon.tiledImages,
            config = seadragon.config;

        function getFunctionConstrainingToImage(dontForceConstraints) {
            return function () {
                viewport.constraintBounds = new Seadragon.Rectangle(
                    this.animatedBounds.getRectangle());
                $container.trigger('seadragon:constraint_bounds_set');
                if (!dontForceConstraints) {
                    config.constrainViewport = true;
                }
            };
        }

        var tiledImage = tiledImages[whichImage];
        if (tiledImage instanceof Seadragon.TiledImage) { // tiled image has been loaded
            getFunctionConstrainingToImage(dontForceConstraints).call(tiledImage);
        } else { // register a callback
            tiledImagesCallbacks[whichImage].push(
                getFunctionConstrainingToImage(dontForceConstraints));
        }
        return this;
    };


    /**
     * Shows the given image.
     *
     * @param {number} whichImage  We show the <code>this.tiledImages[whichImage]</code> image.
     * @param {boolean} [immediately=false]
     */
    this.showImage = function showImage(whichImage, immediately) {
        var tiledImage = that.tiledImages[whichImage];

        if (!(tiledImage instanceof Seadragon.TiledImage)) {
            // Image not loaded yet, loading it will show it automatically.
            var options = tiledImagesOptions[whichImage];
            if (options) { // if options missing, opening probably already started
                options.shown = true;
                this.openDzi(options);
            }
            return this;
        }

        this.drawer.showImage(whichImage, immediately);
        this.$container.trigger('seadragon:showed_tiled_image');
        return this.restoreUpdating();
    };

    /**
     * Hides the given image.
     *
     * @param {number} whichImage We hide the <code>this.tiledImages[whichImage]</code> image.
     * @param {boolean} [immediately=false]
     */
    this.hideImage = function hideImage(whichImage, immediately) {
        var tiledImage = that.tiledImages[whichImage];

        if (!(tiledImage instanceof Seadragon.TiledImage)) {
            // Image not loaded yet, register a callback.
            var tiledImageCallbacks = this.tiledImagesCallbacks[whichImage];
            if (tiledImageCallbacks.length) { // no callbacks present => the hidden state is the default
                tiledImageCallbacks.push(utils.bind(this.hideImage, this, whichImage, immediately));
            }
            return this;
        }

        this.drawer.hideImage(whichImage, immediately);
        this.$container.trigger('seadragon:hidden_tiled_image');
        return this.restoreUpdating();
    };


    /**
     * Force loading the image without showing it (if it weren't loaded actually). Useful for neighbor pre-caching.
     *
     * @param {number} whichImage We force-load the <code>this.tiledImages[whichImage]</code> image.
     */
    this.loadImageWithoutShowing = function loadImageWithoutShowing(whichImage) {
        if (!(this.tiledImages[whichImage] instanceof Seadragon.TiledImage)) {
            this.tiledImagesCallbacks[whichImage].push(utils.bind(this.hideImage, this, whichImage, true));
            this.showImage(whichImage, true); // it'll get hidden immediately anyway
        }
        return this;
    };


    /**
     * Checks if controller is in progress of loading/processing new DZIs. Some actions are halted
     * for these short periods.
     *
     * @return {boolean}
     */
    this.isLoading = function isLoading() {
        return tiledImagesToHandle > 0;
    };

    /**
     * Initializes the Seadragon controller.
     */
    this.init = function init() {
        that.tiledImages = [];
        tiledImagesOptions = [];
        tiledImagesCallbacks = [];
        tiledImageBoundsUpdatesNums = [];

        that.config.enableMagnifier = that.config.enablePicker = false;
        lockOnUpdates = false;

        that.viewport.maxLevel = 0; // No DZIs loaded yet.
        tiledImagesToHandle = 0;

        bindEvents();
        that.drawer.reset();

        // Begin updating.
        animated = false;
        forceAlign = forceRedraw = true;
        scheduleUpdate();

        wheelToPanEnabled = false;

        return this;
    };

    /**
     * Destroys the Seadragon module, de-registers events and clears Seadragon HTML container.
     * The Seadragon object is useless after invoking this method and should NOT be used any more.
     * When there's a need to re-initialize Seadragon, a new <code>Controller</code> object should be created.
     */
    this.destroy = function destroy() {
        $(window, document, this.$container).off('.seadragon');
        this.$container.empty();
        return this;
    };

    /**
     * Returns bounds of the given image in points.
     *
     * @param {number} whichImage We get bounds of the <code>this.tiledImages[whichImage]</code> image
     * @param {boolean} [current=false]
     * @return {Seadragon.Rectangle}
     */
    this.tiledImageBoundsInPoints = function tiledImageBoundsInPoints(whichImage, current) {
        return this.seadragon.tiledImages[whichImage].animatedBounds.getRectangle(current);
    };

    /**
     * Returns bounds of the given image in pixels.
     *
     * @param {number} whichImage We get bounds of the <code>this.tiledImages[whichImage]</code> image
     * @param {boolean} [current=false]
     * @return {Seadragon.Rectangle}
     */
    this.tiledImageBoundsInPixels = function tiledImageBoundsInPixels(whichImage, current) {
        var pointBounds = this.tiledImageBoundsInPoints(whichImage, current);
        return this.seadragon.viewport.pixelRectangleFromPointRectangle(pointBounds, current);
    };

    this.init();
};

Seadragon.Controller.prototype = Object.create(seadragonProxy);
