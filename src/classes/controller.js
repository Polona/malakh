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
        dziImageBoundsUpdatesInProgressNums,
        dziImagesToHandle,
        lastPosition,
        containerSize,
        lockOnUpdates;

    // Initialization
    (function init() {
        dziImageBoundsUpdatesInProgressNums = [];
        lockOnUpdates = false;

        dziImagesToHandle = 0;

        bindEvents();

        var containerCss = that.$container.css(['width', 'height']);
        containerSize = new Seadragon.Point(parseFloat(containerCss.width), parseFloat(containerCss.height));

        // Begin updating.
        animated = false;
        forceAlign = forceRedraw = true;
        scheduleUpdate();
    })();

    if (Seadragon.Magnifier) {
        /**
         * Shows the magnifier.
         */
        this.enableMagnifier = function enableMagnifier() {
            if (that.config.enableMagnifier) { // already enabled
                return;
            }
            $(document).trigger('mouseup.seadragon'); // To stop canvas dragging etc.

            that.config.enableMagnifier = true;
            document.body.style.cursor = 'none';

            that.$canvas.on('mousemove.seadragon', moveMagnifier);
            that.$canvas.trigger('mousemove.seadragon');
        };

        /**
         * Hides the magnifier.
         */
        this.disableMagnifier = function disableMagnifier() {
            if (!that.config.enableMagnifier) { // already disabled
                return;
            }
            that.$canvas.off('mousemove.seadragon', moveMagnifier);

            that.config.enableMagnifier = false;
            document.body.style.cursor = '';

            forceRedraw = true;
        };

        /**
         * Toggles magnifier's state - shows it if it was hidden; hides it otherwise.
         */
        this.toggleMagnifier = function toggleMagnifier() {
            if (that.config.enableMagnifier) {
                that.disableMagnifier();
            } else {
                that.enableMagnifier();
            }
        };
    }

    if (Seadragon.Picker) {
        /**
         * Shows the picker.
         */
        this.enablePicker = function enablePicker() {
            if (that.config.enablePicker) { // already enabled
                return;
            }
            that.config.enablePicker = true;
            that.picker.show();
        };

        /**
         * Hides the picker.
         */
        this.disablePicker = function disablePicker() {
            if (!that.config.enablePicker) { // already disabled
                return;
            }
            that.config.enablePicker = false;
            that.picker.hide();
        };

        /**
         * Toggles picker's state - shows it if it was hidden; hides it otherwise.
         */
        this.togglePicker = function togglePicker() {
            if (that.config.enablePicker) {
                that.disablePicker();
            } else {
                that.enablePicker();
            }
        };
    }

    function getMousePosition(evt) {
        var offset = that.$container.offset();
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
        that.$canvas.on({
            'mouseenter.seadragon': function () {
                if (that.config.enableMagnifier) {
                    restoreUpdating();
                }
            },

            'mouseleave.seadragon': function () {
                if (that.config.enableMagnifier) { // We have to redraw to hide magnifier.
                    restoreUpdating();
                }
            },

            'mousedown.seadragon': function (evt) {
                if (evt.which !== 1 || that.config.enableMagnifier) { // Only left-click is supported.
                    return false;
                }
                lastPosition = getMousePosition(evt);
                $(document).on('mousemove.seadragon', dragCanvas);
                return false;
            },

            'wheel.seadragon': function (evt) {
                if (that.config.enableMagnifier || !evt.deltaY) {
                    return false;
                }
                zoomCanvas(evt);
                restoreUpdating();
                return false;
            }
        });

        that.$container.on({
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

        var blockMovement = that.config.blockMovement;
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
        if (that.config.blockZoom) {
            return;
        }
        var factor = that.config.zoomPerScroll;
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
     * @see Seadragon.TiledImage#getTiledImageLevel
     * @private
     */
    function recalculateMaxLevel() {
        that.viewport.maxLevel = 0;
        that.dziImages.forEach(function (dziImage) {
            that.viewport.maxLevel = Math.max(that.viewport.maxLevel, dziImage.getViewportLevel(dziImage.maxLevel));
        });
        that.viewport.maxLevelExp = Math.pow(2, that.viewport.maxLevel); // TODO shouldn't this be in Seadragon?
    }

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
            console.error('No DZI Image given to Controller\'s onOpen()!');
            return;
        }

        // Add an image.
        if (index == null) {
            index = that.dziImages.length;
        }
        that.dziImages[index] = dziImage;
        dziImageBoundsUpdatesInProgressNums[index] = 0;
        that.drawer.registerDziImage(dziImage, index);

        that.viewport.maxLevel = Math.max(that.viewport.maxLevel, dziImage.maxLevel);
        that.viewport.maxLevelExp = Math.pow(2, that.viewport.maxLevel);

        dziImagesToHandle--;

        that.$container.trigger('seadragon:loadeddzi.seadragon');
        if (dziImagesToHandle === 0) {
            that.$container.trigger('seadragon:loadeddziarray.seadragon');
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
        var containerCss = that.$container.css(['width', 'height']);
        var newContainerSize = new Seadragon.Point(parseFloat(containerCss.width), parseFloat(containerCss.height));

        if (!newContainerSize.equals(containerSize)) {
            // Maintain image position:
            forceRedraw = true; // canvas needs it
            containerSize = newContainerSize; // TODO maybe keep it as a Seadragon parameter?
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
            that.$container.trigger('seadragon:animationstart.seadragon');
            that.$container.trigger('seadragon:animation.seadragon');
        } else if (animating) {
            // We're in the middle of animating.
            that.$container.trigger('seadragon:animation.seadragon');
        } else if (animated) {
            // We were animating, and now we're not anymore ==> animation finish.
            that.$container.trigger('seadragon:animationend.seadragon');
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
     * @param {jQuery} options.$container See <a href="#createFromDzi">
     *                                    <code>Seadragon.DziImage.createFromDzi</code></a>.
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
            throw new Error('Sorry, we only support Deep Zoom Image!');
        }

        var fileFormat = imageNode.attr('Format');

        var sizeNode = imageNode.children('size');

        var invalidFormatMessage = 'This doesn\'t appear to be a valid Deep Zoom Image.';
        if (!sizeNode) {
            throw new Error(invalidFormatMessage);
        }

        var width = parseInt(sizeNode.attr('Width'), 10);
        var height = parseInt(sizeNode.attr('Height'), 10);
        var tileSize = parseInt(imageNode.attr('TileSize'), 10);
        var tileOverlap = parseInt(imageNode.attr('Overlap'), 10);

        if (!width || !height || !tileSize) {
            throw new Error(invalidFormatMessage);
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
            shown: options.shown
        });
    }


    /**
     * Creates a DziImage instance from the DZI file.
     *
     * @param {Object} options  An object containing all given options.
     * @param {string} options.dziUrl  An URL/path to the DZI file.
     * @param {function} options.callback  Function invoked when DZI is fully processed.
     * @param {Seadragon.Rectangle} [options.bounds]  Bounds representing position and shape of the image on the virtual
     *                                                Seadragon plane.
     * @param {number} [options.index]  If specified, an image is loaded into <code>controller.dziImages[index]</code>.
     *                                  Otherwise it's put at the end of the table.
     * @param {boolean} [options.shown=true]  If false, image is not drawn. It can be made visible later.
     */
    this.createFromDzi = function createFromDzi(options) {
        this.ensureOptions(options, 'DziImage.createFromDzi', ['dziUrl', 'callback']);

        $.ajax({
            type: 'GET',
            url: options.dziUrl,
            dataType: 'xml',
            success: function (data) {
                options.data = data;
                options.callback(processDzi(options), options.index);
            },
            error: function (_, statusText) {
                throw new Error('Unable to retrieve the given DZI file, does it really exist? ', statusText);
            }
        });
    };

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
            this.createFromDzi({
                dziUrl: dziUrl,
                tilesUrl: tilesUrl,
                bounds: bounds,
                index: index,
                shown: shown,
                callback: onOpen
            });
        } catch (error) {
            // We try to keep working even after a failed attempt to load a new DZI.
            dziImagesToHandle--;
            console.error('DZI failed to load.', error);
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

        that.config.enableMagnifier = that.config.enablePicker = false;
        lockOnUpdates = true; // 'seadragon:forcealign.seadragon' handler will resume updating

        that.viewport.maxLevel = 0; // No DZIs loaded yet.

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
        $(window, document, that.$container).off('.seadragon');
        that.$container.empty();
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

Seadragon.Controller.prototype = Object.create(seadragonBasePrototype);
