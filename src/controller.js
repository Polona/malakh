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
 * @param {string|jQuery} containerSelectorOrElement
 */
Seadragon.Controller = function Controller(containerSelectorOrElement) {
    var that = this,
        $container, $canvas,
        lastOpenStartTime, lastOpenEndTime,
        animated,
        forceAlign, forceRedraw,
        dziImageBoundsUpdatesInProgressNums,
        dziImagesToHandle,
        lastPosition,
        containerSize,
        magnifierShown, pickerShown,
        lockOnUpdates,
        maxLevel;

    (function init() {
        $container = $(containerSelectorOrElement);
        if ($container.length === 0) {
            console.info('Received containerSelectorOrElement: ', containerSelectorOrElement);
            throw new Error('Can\'t create a Controller instance without a container!');
        }
        $container.empty();
        $container.css({
            backgroundColor: Seadragon.Config.backgroundColor
        });

        $canvas = $('<canvas>');
        $container.append($canvas);

        lastOpenStartTime = lastOpenEndTime = 0;

        that.dziImages = [];
        dziImageBoundsUpdatesInProgressNums = [];

        magnifierShown = pickerShown = false;
        lockOnUpdates = false;

        maxLevel = 0; // No DZIs loaded yet.

        dziImagesToHandle = 0;

        bindEvents();

        // Clear any previous message.
        var containerCss = $container.css(['width', 'height']);
        containerSize = new Seadragon.Point(parseFloat(containerCss.width), parseFloat(containerCss.height));

        // Restart other fields.
        that.viewport = new Seadragon.Viewport($container);
        if (Seadragon.Magnifier) {
            /**
             * @type {Seadragon.Magnifier}
             */
            that.magnifier = new Seadragon.Magnifier(new Seadragon.Point(0, 0), Seadragon.Config.magnifierRadius);
        }
        if (Seadragon.Picker) {
            /**
             * @type {Seadragon.Picker}
             */
            that.picker = new Seadragon.Picker($container, that.viewport);
        }
        if (Seadragon.Markers) {
            /**
             * @type {Seadragon.Markers}
             */
            that.markers = new Seadragon.Markers($container, that.viewport);
        }
        /**
         * A <code>Seadragon.Drawer</code> instance, handles all the drawing.
         *
         * @type {Seadragon.Drawer}
         */
        that.drawer = new Seadragon.Drawer({
            viewport: that.viewport,
            $container: $container,
            magnifier: that.magnifier
        });
        /**
         * A <code>Seadragon.LayoutManager</code> instance, contains helper layout methods.
         *
         * @type {Seadragon.LayoutManager}
         */
        that.layoutManager = new Seadragon.LayoutManager(that);

        // Begin updating.
        animated = false;
        forceAlign = forceRedraw = true;
        scheduleUpdate();
    })();

    if (Seadragon.Magnifier) {
        /**
         * Shows the magnifier.
         */
        this.showMagnifier = function showMagnifier() {
            $(document).mouseup(); // To stop canvas dragging etc.

            magnifierShown = true;
            that.drawer.setMagnifier(true);
            that.drawer.canvasLayersManager.drawMagnifier = true;

            $canvas.on('mousemove.seadragon', moveMagnifier);
            $canvas.trigger('mousemove.seadragon');
        };

        /**
         * Hides the magnifier.
         */
        this.hideMagnifier = function hideMagnifier() {
            $canvas.off('mousemove.seadragon', moveMagnifier);

            that.drawer.canvasLayersManager.drawMagnifier = false;
            that.drawer.setMagnifier(false);
            magnifierShown = false;

            forceRedraw = true;
        };

        /**
         * Toggles magnifier's state - shows it if it was hidden; hides it otherwise.
         */
        this.toggleMagnifier = function toggleMagnifier() {
            if (magnifierShown) {
                that.hideMagnifier();
            } else {
                that.showMagnifier();
            }
        };
    }

    if (Seadragon.Picker) {
        /**
         * Shows the picker.
         */
        this.showPicker = function showPicker() {
            pickerShown = true;
            that.picker.show();
        };

        /**
         * Hides the picker.
         */
        this.hidePicker = function hidePicker() {
            pickerShown = false;
            that.picker.hide();
        };

        /**
         * Toggles picker's state - shows it if it was hidden; hides it otherwise.
         */
        this.togglePicker = function togglePicker() {
            if (pickerShown) {
                that.hidePicker();
            } else {
                that.showPicker();
            }
        };
    }

    function getMousePosition(evt) {
        var offset = $container.offset();
        return new Seadragon.Point(evt.pageX - offset.left, evt.pageY - offset.top);
    }

    /**
     * Returns mouse position extracted from <code>event</code>.
     *
     * @param {jQuery.Event} event Mouse event.
     * @return {Seadragon.Point}
     * @function
     */
    this.getMousePosition = getMousePosition;

    function onDocumentMouseUp() {
        $(document).off('mousemove.seadragon', dragCanvas);
        restoreUpdating();
    }

    function bindEvents() {
        $canvas.on({
            'mouseenter.seadragon': function () {
                if (magnifierShown) {
                    that.drawer.canvasLayersManager.drawMagnifier = true;
                    restoreUpdating();
                }
            },

            'mouseleave.seadragon': function () {
                if (magnifierShown) { // We have to redraw to hide magnifier.
                    that.drawer.canvasLayersManager.drawMagnifier = false;
                    restoreUpdating();
                }
            },

            'mousedown.seadragon': function (evt) {
                if (evt.which !== 1 || magnifierShown) { // Only left-click is supported.
                    return false;
                }
                lastPosition = getMousePosition(evt);
                $(document).on('mousemove.seadragon', dragCanvas);
                return false;
            },

            'wheel.seadragon': function (evt) {
                if (magnifierShown || !evt.deltaY) {
                    return false;
                }
                zoomCanvas(evt);
                restoreUpdating();
                return false;
            }
        });

        $container.on({
            'seadragon:forcealign.seadragon': function () {
                forceAlign = true;
                recalculateMaxLevel();
                restoreUpdating();
            },

            'seadragon:forceredraw.seadragon': function () {
                restoreUpdating();
            }
        });

        $(document).on('mouseup.seadragon', onDocumentMouseUp);
        $(window).on('resize.seadragon', restoreUpdating);
    }

    /**
     * Handler executed when user drags the canvas using their mouse.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @private
     */
    function dragCanvas(evt) {
        var position = getMousePosition(evt);
        var delta = position.minus(lastPosition);

        var blockMovement = Seadragon.Config.blockMovement;
        if (blockMovement.horizontal) {
            delta.x = 0;
        }
        if (blockMovement.vertical) {
            delta.y = 0;
        }
        that.viewport.panBy(that.viewport.deltaPointsFromPixels(delta.negate()));

        lastPosition = position;
    }

    /**
     * Handler executed when zooming using mouse wheel.
     *
     * @param {jQuery.Event} evt Mouse 'wheel' event.
     * @private
     */
    function zoomCanvas(evt) {
        if (Seadragon.Config.blockZoom) {
            return;
        }
        var factor = Seadragon.Config.zoomPerScroll;
        if (evt.deltaY > 0) { // zooming out
            factor = 1 / factor;
        }
        that.viewport.zoomBy(
            factor,
            false,
            that.viewport.pointFromPixel(getMousePosition(evt), true));
    }


    /**
     * Moves the magnifier to mouse position determined by <code>event</code>.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @private
     */
    function moveMagnifier(evt) {
        var position = getMousePosition(evt);
        that.magnifier.panTo(position);
        restoreUpdating();
    }

    /**
     * Computes maximum level to be drawn on canvas. Note that it's not simply
     * maximum of all <code>dziImage.maxLevel<code>s - their levels all scaled so that
     * they match "virtual" levels with regards to their representation on canvas.
     *
     * @see Seadragon.TiledImage.getAdjustedLevel
     * @private
     */
    function recalculateMaxLevel() {
        maxLevel = 0;
        that.dziImages.forEach(function (dziImage) {
            maxLevel = Math.max(maxLevel, dziImage.getUnadjustedLevel(dziImage.maxLevel));
        });
        that.viewport.maxLevelScale = Math.pow(2, maxLevel);
        that.drawer.maxLevel = maxLevel;
    }

    function fitBounds(whichImage, bounds, immediately) {
        that.dziImages[whichImage].fitBounds(bounds, immediately);
        $container.trigger('seadragon:forcealign.seadragon');
    }

    /**
     * Animates a <code>TiledImage</code> bounds to new ones.
     *
     * @param {Seadragon.TiledImage} whichImage
     * @param {Seadragon.Rectangle} bounds
     * @param {boolean} [immediately=false]
     * @function
     */
    this.fitBounds = fitBounds;

    /**
     * Registers a new open image.
     *
     * @param {Seadragon.DziImage} dziImage
     * @param {number} [index] If specified, image is put at <code>this.dziImages[index]</code>; otherwise
     *                         it's put at the end of the table.
     * @private
     */
    function onOpen(dziImage, index) {
        if (!dziImage) {
            console.error('No DZI Image given to Viewer\'s onOpen()!');
            return;
        }

        // Add an image.
        if (typeof index !== 'number') {
            index = that.dziImages.length;
        }
        that.dziImages[index] = dziImage;
        dziImageBoundsUpdatesInProgressNums[index] = 0;
        that.drawer.addDziImage(dziImage, index);

        maxLevel = Math.max(maxLevel, dziImage.maxLevel);
        that.viewport.maxLevelScale = Math.pow(2, maxLevel);
        that.drawer.maxLevel = maxLevel;

        dziImagesToHandle--;

        $container.trigger('seadragon:loadeddzi.seadragon');
        if (dziImagesToHandle === 0) {
            $container.trigger('seadragon:loadeddziarray.seadragon');
        }
        restoreUpdating();
    }

    /**
     * Schedule the next update run. Scheduling is paused when animations and user actions finish.
     * @private
     */
    function scheduleUpdate() {
        if (!lockOnUpdates) {
            if (isLoading()) {
                setTimeout(scheduleUpdate, 1);
                return;
            }
            requestAnimationFrame(update);
        }
    }

    function restoreUpdating() {
        forceRedraw = true;
        if (lockOnUpdates) {
            lockOnUpdates = false;
            scheduleUpdate();
        }
    }

    /**
     * Unblock updates stopped by a lack of action. Invoked by single actions expecting redrawing.
     * @function
     */
    this.restoreUpdating = restoreUpdating;

    /**
     * Updates bounds of a Seadragon image; usually used during aligning (so not too often).
     *
     * @param {number} whichImage  Image index of <code>dziImage</code> in <code>this.dziImages</code> table.
     * @param {boolean} decreaseCounter  If provided, decreases the counted number of <code>updateDziImageBounds</code>
     *                                   invocations on the <code>dziImage</code> with a given index. Parameter used
     *                                   only by the <code>scheduleUpdateDziImageBounds</code> function.
     * @private
     */
    function updateDziImageBounds(whichImage, decreaseCounter) {
        var dziImage = that.dziImages[whichImage];
        forceAlign = dziImage.bounds.update() || forceAlign;
        restoreUpdating();
        if (decreaseCounter) {
            dziImageBoundsUpdatesInProgressNums[whichImage]--;
        }
    }

    /**
     * <p>Schedules the <code>updateDziImageBounds</code> function on the <code>dziImage</code> with index
     * <code>whichImage</code>. The whole idea behind this function is to not allow more than one invocation of
     * <code>updateDziImageBounds</code> to wait on <code>setTimeout</code>s; it increases performance on weaker
     * computers.
     *
     * <p>If the <code>dziImageBoundsUpdatesInProgressNums[whichImage]</code> value is:
     * <ul>
     *     <li><code>0</code> (or <code>1</code> if <code>forceExecution</code> is true), then we invoke the
     *         <code>updateDziImageBounds</code> asynchronously.</li>
     *     <li><code>1</code>, then we wait a short time before trying again.</li>
     *     <li><code>>=2</code>, then we abort since one other instance is already waiting.</li>
     * </ul>
     * If the flag <code>forceExecution</code> is true, we invoke <code>updateDziImageBounds</code>
     * if only <code>dziImageBoundsUpdatesInProgressNums[whichImage] < 2</code>. This is necessary
     * because when counter increases by 1, the invocation which triggered the increase waits on
     * <code>setTimeout</code> and needs to be invoked when it remains the only waiting instance.
     *
     * @param {number} whichImage  Image index of <code>dziImage</code> in <code>this.dziImages</code> table.
     * @param {boolean} [forceExecution=false]
     * @private
     */
    function scheduleUpdateDziImageBounds(whichImage, forceExecution) {
        var dziImageBoundsUpdatesInProgressNum = dziImageBoundsUpdatesInProgressNums[whichImage];

        if (dziImageBoundsUpdatesInProgressNum === 0 ||
            (forceExecution && dziImageBoundsUpdatesInProgressNum === 1)) {
            // no other instance of this function was dispatched on dziImage
            if (!forceExecution) { // otherwise counter already increased
                dziImageBoundsUpdatesInProgressNums[whichImage]++;
            }
            setTimeout(updateDziImageBounds, 0, whichImage, true); // invoke asynchronously
        }
        else if (dziImageBoundsUpdatesInProgressNum === 1) {
            // one function instance was dispatched on dziImage, trying in a moment
            dziImageBoundsUpdatesInProgressNums[whichImage]++;
            setTimeout(scheduleUpdateDziImageBounds, 100, whichImage, true);
        }
        /* else {} // one function instance already waits, no need for a new one */
    }

    /**
     * A single update process, delegating drawing to the Drawer on a change.
     * @private
     */
    function update() {
        var containerCss = $container.css(['width', 'height']);
        var newContainerSize = new Seadragon.Point(parseFloat(containerCss.width), parseFloat(containerCss.height));

        if (!newContainerSize.equals(containerSize)) {
            // Maintain image position:
            forceRedraw = true; // canvas needs it
            containerSize = newContainerSize;
            that.viewport.resize(newContainerSize);
        }

        // animating => viewport moved, aligning images or loading/blending tiles.
        var animating = that.viewport.update() || forceAlign || forceRedraw;
        if (forceAlign) {
            forceAlign = false;
            setTimeout(function () { // Making it more asynchronous.
                that.dziImages.forEach(function (dziImage, whichImage) {
                    scheduleUpdateDziImageBounds(whichImage);
                });
            }, 0);
        }

        if (animating) {
            forceRedraw = that.drawer.update();
        } else {
            lockOnUpdates = true;
        }

        // Triger proper events.
        if (!animated && animating) {
            // We weren't animating, and now we did ==> animation start.
            $container.trigger('seadragon:animationstart.seadragon');
            $container.trigger('seadragon:animation.seadragon');
        } else if (animating) {
            // We're in the middle of animating.
            $container.trigger('seadragon:animation.seadragon');
        } else if (animated) {
            // We were animating, and now we're not anymore ==> animation finish.
            $container.trigger('seadragon:animationend.seadragon');
        }

        // For the next update check.
        animated = animating;

        scheduleUpdate();
    }

    // TODO this should probably just parse a properly structured JSON, current approach is not extensible.
    /**
     * Opens Deep Zoom Image (DZI).
     *
     * @param {string} dziUrl  The URL/path to the DZI file.
     * @param {string} tilesUrl  The URL/path to the tiles directory; by default it's the same as <code>dziUrl<code>
     *                           with ".dzi" changed to "_files".
     * @param {number} index  If specified, an image is loaded into <code>controller.dziImages[index]</code>.
     *                        Otherwise it's put at the end of the table.
     * @param {boolean} [shown=true]  If false, image is not drawn. It can be made visible later.
     * @param {Seadragon.Rectangle} [bounds]  Bounds representing position and shape of the image on the virtual
     *                                        Seadragon plane.
     */
    this.openDzi = function openDzi(dziUrl, tilesUrl, index, shown, bounds, /* internal */ dontIncrementCounter) {
        if (!dontIncrementCounter) {
            dziImagesToHandle++;
        }
        try {
            Seadragon.DziImage.createFromDzi({
                dziUrl: dziUrl,
                tilesUrl: tilesUrl,
                $container: $container,
                bounds: bounds,
                index: index,
                shown: shown,
                callback: onOpen
            });
        } catch (error) {
            // We try to keep working even after a failed attempt to load a new DZI.
            dziImagesToHandle--;
            console.error('DZI failed to load.');
        }
    };

    /**
     * Opens an array of DZIs.
     *
     * @param {Array.<string>} dziDataArray Array of objects containing data of particular DZIs.
     */
    this.openDziArray = function openDziArray(dziDataArray, hideByDefault) {
        dziImagesToHandle += dziDataArray.length;
        dziDataArray.forEach(function (dziData, index) {
            that.openDzi(dziData.dziUrl, dziData.tilesUrl, index, !hideByDefault, dziData.boundsArray, true);
        });
    };

    function isLoading() {
        return dziImagesToHandle > 0;
    }

    /**
     * Checks if controller is in progress of loading/processing new DZIs. Some actions are halted
     * for these short periods.
     *
     * @return {boolean}
     * @function
     */
    this.isLoading = isLoading;

    /**
     * TODO document.
     */
    this.reset = function close() {
        that.dziImages = [];
        dziImageBoundsUpdatesInProgressNums = [];

        magnifierShown = pickerShown = false;
        lockOnUpdates = true; // 'seadragon:forcealign.seadragon' handler will resume updating

        maxLevel = 0; // No DZIs loaded yet.

        dziImagesToHandle = 0;

        // Reset the drawer (at the end it triggers the <code>seadragon:forcealign.seadragon</code> event)
        // so controller will know when to force re-draw.
        that.drawer.reset();
    };

    /**
     * Destroys the Seadragon module, de-registers events and clears Seadragon HTML container.
     * The Seadragon object is useless after invoking this method and should NOT be used any more.
     * When there's a need to re-initialize Seadragon, a new <code>Controller</code> object should be created.
     */
    this.destroy = function destroy() {
        $(window, document, $container).off('.seadragon');
        $container.empty();
    };


    function dziImageBoundsInPoints(whichImage, current) {
        return that.dziImages[whichImage].bounds.getRectangle(current);
    }

    /**
     * Returns bounds of the given image in points.
     *
     * @param {number} whichImage We get bounds of the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} [current=false]
     * @return {Seadragon.Rectangle}
     * @function
     */
    this.dziImageBoundsInPoints = dziImageBoundsInPoints;

    function dziImageBoundsInPixels(whichImage, current) {
        var pointBounds = dziImageBoundsInPoints(whichImage, current);
        return that.viewport.pixelRectangleFromPointRectangle(pointBounds, current);
    }

    /**
     * Returns bounds of the given image in pixels.
     *
     * @param {number} whichImage We get bounds of the <code>this.dziImages[whichImage]</code> image
     * @param {boolean} [current=false]
     * @return {Seadragon.Rectangle}
     * @function
     */
    this.dziImageBoundsInPixels = dziImageBoundsInPixels;
};
