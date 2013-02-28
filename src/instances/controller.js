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
        lastPosition,
        containerSize,
        lockOnUpdates,
        wheelToPanEnabled;

    Object.defineProperties(this, {
        /**
         * TODO document
         *
         * @typeArray.<Function>
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
         * @param {boolean} enable  If provided, falls back to <code>enableMagnifier</code>
         *                          or <code>disableMagnifier</code>.
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
         * @param {boolean} enable  If provided, falls back to <code>enablePicker</code>
         *                          or <code>disablePicker</code>.
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
     * Returns mouse position extracted from <code>event</code>.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @return {Seadragon.Point}
     */
    this.getMousePosition = function getMousePosition(evt) {
        var offset = that.$container.offset();
        return new Seadragon.Point(evt.pageX - offset.left, evt.pageY - offset.top);
    };

    function onDocumentMouseUp() {
        $(document).off('mousemove.seadragon', dragCanvas);
        that.restoreUpdating();
    }

    function wheelToZoom(evt) {
        if (that.config.enableMagnifier) {
            return true;
        }
        zoomCanvas(evt);
        that.restoreUpdating();
        return true;
    }

    function wheelToPan(evt) {
        evt.preventDefault(); // block gestures for back/forward history navigation
        var deltaX, deltaY, scale;

        switch (evt.deltaMode) {
            case 0: // deltas in pixels
                scale = 1;
                break;
            case 1: // deltas in lines
                scale = 14; // default line-height, I guess
                break;
            case 2: // deltas in pages
                scale = parseFloat(seadragon.$container.css('height'));
                break;
            default:
                throw new Error('SeadragonManagerView#toggleBlockZoom: deltaMode not recognized',
                    evt.deltaMode, evt);
        }
        deltaX = scale * evt.deltaX;
        deltaY = scale * evt.deltaY;

        if (evt.shiftKey) {
            // Swap deltaX & deltaY (thus, if deltaX is missing, we can scroll horizontally).
            var oldDeltaX = deltaX;
            deltaX = deltaY;
            deltaY = oldDeltaX;
        }

        that.viewport.panBy(that.viewport.deltaPointsFromPixels(new Seadragon.Point(deltaX, deltaY)));
        return false;
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
                    return true;
                }
                lastPosition = that.getMousePosition(evt);
                $(document).on('mousemove.seadragon', dragCanvas);
                return true;
            },

            'wheel.seadragon': wheelToZoom
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

        $(document).on('mouseup.seadragon', onDocumentMouseUp);
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
     * @param {boolean} enable  If provided, falls back to <code>enableWheelToPan</code>
     *                          or <code>disableWheelToPan</code>.
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
     * Handler executed when user drags the canvas using their mouse.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @private
     */
    function dragCanvas(evt) {
        var position = that.getMousePosition(evt);
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
            that.viewport.pointFromPixel(that.getMousePosition(evt), true));
    }


    /**
     * Moves the magnifier to mouse position determined by <code>event</code>.
     *
     * @param {jQuery.Event} evt Mouse event.
     * @private
     */
    function moveMagnifier(evt) {
        var position = that.getMousePosition(evt);
        that.magnifier.panTo(position);
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
        var viewportMaxLevel = 0, maxTiledImageLevel = 0;
        for (var i = 0; i < that.tiledImages.length; i++) {
            var tiledImage = that.tiledImages[i];
            if (tiledImage instanceof Seadragon.TiledImage && tiledImage.opacity > 0) { // tiled image has been loaded
                viewportMaxLevel = Math.max(
                    viewportMaxLevel,
                    tiledImage.getViewportLevel(tiledImage.maxLevel)
                );
                maxTiledImageLevel = Math.max(maxTiledImageLevel, tiledImage.maxLevel);
            }
        }
        that.viewport.maxLevel = viewportMaxLevel;
        that.viewport.maxTiledImageLevel = maxTiledImageLevel;
    }

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

        // Delete loading options for the current TiledImage.
        delete tiledImagesOptions[index];

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
            callbacks.forEach(function (callback) {
                callback.call(tiledImage);
            });
            delete tiledImagesCallbacks[index];
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
                setTimeout(scheduleUpdate, 1);
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
        var tiledImage = that.tiledImages[whichImage];
        forceAlign = tiledImage.boundsSprings.update() || forceAlign;
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
                that.tiledImages.forEach(function (tiledImage, whichImage) {
                    if (tiledImage instanceof Seadragon.TiledImage) { // tiled image has been loaded
                        scheduleUpdateDziImageBounds(whichImage);
                    }
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
            that.$container.trigger('seadragon:animation_start');
            that.$container.trigger('seadragon:animation');
        } else if (animating) {
            // We're in the middle of animating.
            that.$container.trigger('seadragon:animation');
        } else if (animated) {
            // We were animating, and now we're not anymore ==> animation finish.
            that.$container.trigger('seadragon:animation_end');
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
            bounds: options.bounds
        });
    }


    /**
     * Creates a DziImage instance from the DZI file.
     *
     * @param {Object} options  An object containing all given options.
     * @param {string} options.dziUrl  An URL/path to the DZI file.
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
                throw new Error('Unable to retrieve the given DZI file, does it really exist?\n' + statusText);
            }
        });

        return this;
    };

    /**
     * Opens Deep Zoom Image (DZI).
     *
     * @param {string} dziUrl  The URL/path to the DZI file.
     * @param {Object} options  An object containing all given options.
     * @param {string} options.tilesUrl  The URL/path to the tiles directory; by default it's the same
     *                                   as <code>dziUrl<code> with '.dzi' changed to '_files'.
     * @param {number} options.index  If specified, an image is loaded into <code>controller.tiledImages[index]</code>.
     *                                Otherwise it's put at the end of the table.
     * @param {Seadragon.Rectangle} [options.bounds]  Bounds representing position and shape of the image on the virtual
     *                                                Seadragon plane.
     *//**
     * Opens Deep Zoom Image (DZI).
     *
     * @param {Object} options  An object containing all given options.
     * @param {string} options.dziUrl  The URL/path to the DZI file.
     * @param {string} options.tilesUrl  The URL/path to the tiles directory; by default it's the same
     *                                   as <code>dziUrl<code> with '.dzi' changed to '_files'.
     * @param {number} options.index  If specified, an image is loaded into <code>controller.tiledImages[index]</code>.
     *                                Otherwise it's put at the end of the table.
     * @param {Seadragon.Rectangle} [options.bounds]  Bounds representing position and shape of the image on the virtual
     *                                                Seadragon plane.
     */
    this.openDzi = function openDzi() {
        var options;

        // Handling signature variations.
        var arguments0 = arguments[0];
        if (arguments0 == null) { // wrong invocation, reverting changes
            throw new Error('No arguments passed to openDzi!');
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
            options.index = this.tiledImages.length;
        }
        if (!tiledImagesCallbacks[options.index]) { // image not registered yet => initialize fields
            that.tiledImages[options.index] = null; // keep space for the image
            tiledImagesCallbacks[options.index] = [];
        }

        var shown = options.shown == null ? true : options.shown;
        if (shown) { // actually open the DZI image
            // Removing options so that we don't try to open the same DZI twice.
            delete tiledImagesOptions[options.index];

            tiledImagesToHandle++;

            try {
                this.createFromDzi(options);
            } catch (error) {
                // We try to keep working even after a failed attempt to load a new DZI.
                tiledImagesToHandle--;
                that.tiledImages[options.index] = null;
                console.error('DZI failed to load; provided options:', options);
                console.log(error.stack);
            }
        }
        else { // register image options to show later
            tiledImagesOptions[options.index] = options;
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

        optionsArray.forEach(function (options) {
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
        var that = this;

        function getFunctionConstrainingToImage(dontForceConstraints) {
            return function () {
                this.viewport.constraintBounds = new Seadragon.Rectangle(
                    this.boundsSprings.getRectangle());
                that.$container.trigger('seadragon:constraint_bounds_set');
                if (!dontForceConstraints) {
                    this.config.constrainViewport = true;
                }
            };
        }

        var tiledImage = this.tiledImages[whichImage];
        if (tiledImage instanceof Seadragon.TiledImage) { // tiled image has been loaded
            getFunctionConstrainingToImage(dontForceConstraints).call(tiledImage);
        } else { // register a callback
            tiledImagesCallbacks[whichImage].push(
                getFunctionConstrainingToImage(dontForceConstraints));
        }
    };


    /**
     * Shows the given image.
     *
     * @param {number} whichImage  We show the <code>this.tiledImages[whichImage]</code> image.
     * @param {boolean} [immediately=false]
     */
    this.showTiledImage = function showTiledImage(whichImage, immediately) {
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

        this.drawer.showTiledImage(whichImage, immediately);
        this.$container.trigger('seadragon:showed_tiled_image');
        return this.restoreUpdating();
    };

    /**
     * Hides the given image.
     *
     * @param {number} whichImage We hide the <code>this.tiledImages[whichImage]</code> image.
     * @param {boolean} [immediately=false]
     */
    this.hideTiledImage = function hideTiledImage(whichImage, immediately) {
        var tiledImage = that.tiledImages[whichImage];

        if (!(tiledImage instanceof Seadragon.TiledImage)) { // tiled image has been loaded
            // Image not loaded yet, doing nothing.
            return this;
        }

        this.drawer.hideTiledImage(whichImage, immediately);
        this.$container.trigger('seadragon:hidden_tiled_image');
        return this.restoreUpdating();
    };


    /**
     * Checks if controller is in progress of loading/processing new DZIs. Some actions are halted
     * for these short periods.
     *
     * @return boolean
     */
    this.isLoading = function isLoading() {
        return tiledImagesToHandle > 0;
    };

    /**
     * TODO document.
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

        var containerCss = that.$container.css(['width', 'height']);
        containerSize = new Seadragon.Point(parseFloat(containerCss.width), parseFloat(containerCss.height));

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
        return this.tiledImages[whichImage].boundsSprings.getRectangle(current);
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
        return this.viewport.pixelRectangleFromPointRectangle(pointBounds, current);
    };

    this.init();
};

Seadragon.Controller.prototype = Object.create(seadragonProxy);
