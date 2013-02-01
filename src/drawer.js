//noinspection JSValidateJSDoc
/**
 * Constructs a drawer.
 *
 * @class Handles all the drawing based on events passed to it by the controller.
 *
 * <p> See <code>Seadragon.Viewport</code> description for information about conventions around parameter
 * named <code>current</code> and names <strong>point</strong> and <strong>pixel</strong>.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @see Seadragon.Viewport
 *
 * @param {Object} options An object containing all given options.
 * @param {Seadragon.Viewport} options.viewport
 * @param {jQuery object} options.$container A jQuery object representing the DOM element containing
 *                                           all the HTML structure of Seadragon.
 * @param {Seadragon.Magnifier} [options.magnifier]
 */
Seadragon.Drawer = function Drawer(options) {
    var that = this;

    var dziImages, viewport, magnifier;
    var $container, canvas, context;

    var imageLoader;
    var magnifierShown;

    var cacheNumTiles; // 1d dictionary [whichImage][level] --> Point
    var cachePixelOnImageSizeMax; // 1d dictionary [whichImage][level] --> max(point.x, point.y)
    var coverage; // 4d dictionary [whichImage][level][x][y] --> boolean
    var tilesMatrix; // 4d dictionary [whichImage][level][x][y] --> Tile
    var tileBoundsNotChangedMatrix; // like above

    var tilesLoaded; // unordered list of Tiles with loaded images
    var tilesDrawnLastFrame; // unordered list of Tiles drawn last frame
    var tilesDrawnLastFrameLayers; // layers of above tiles

    var dziImagesTL;
    var dziImagesBR;
    var viewportTL;
    var viewportBR;

    var currentTime;
    var lastResetTime;
    var midUpdate;

    var QUOTA = 500; // the max number of images we should keep in memory
    var MIN_PIXEL_RATIO = 0.5; // the most shrunk a tile should be

    (function init() {
        if (options == null || options.viewport == null || options.$container == null) {
            console.log('\nReceived options: ', options);
            throw new Error('Seadragon.Drawer needs a JSON parameter with at least the following fields: ' +
                'viewport, $container.\n' +
                'Parameter magnifier is optional.');
        }

        dziImages = [];
        viewport = options.viewport;
        magnifier = options.magnifier;

        $container = $(options.$container);
        canvas = $container.find('canvas').get(0);
        context = canvas.getContext('2d');
        // One layer for a magnifier:
        that.canvasLayersManager = new Seadragon.CanvasLayersManager(viewport, context, magnifier);

        that.element = $container;
        $container.append($(canvas));

        imageLoader = new Seadragon.ImageLoader(Seadragon.Config.imageLoaderLimit);

        magnifierShown = false;

        cacheNumTiles = [];
        cachePixelOnImageSizeMax = [];
        coverage = [];
        tilesMatrix = [];
        tileBoundsNotChangedMatrix = [];

        tilesLoaded = [];
        tilesDrawnLastFrame = [];
        tilesDrawnLastFrameLayers = [];

        dziImagesTL = [];
        dziImagesBR = [];
        viewportTL = [];
        viewportBR = [];

        that.maxLevel = 0; // It needs to be passed by controller.

        currentTime = Date.now();
        lastResetTime = 0;
        midUpdate = false;
    })();

    /**
     * "Registers" a new DZI image at a given index. We assume <code>dziImage = controller.dziImages[index]</code>.
     *
     * @param {Seadragon.DziImage} dziImage
     * @param {number} index
     */
    this.addDziImage = function addDziImage(dziImage, index) {
        if (midUpdate) { // We don't want to add a new image during the update process, deferring.
            console.log('Deferred adding a DZI to Drawer');
            var that = this;
            setTimeout(function () {
                that.addDziImage(dziImage, index);
            }, 100);
            return;
        }
        if (!dziImage) {
            console.error('No DZI Image given to Drawer\'s addDziImage method!');
            return;
        }

        // Add an image.
        if (typeof index === 'number') {
            dziImages[index] = dziImage;
        } else {
            index = dziImage.length;
            dziImages.push(dziImage);
        }
        cacheNumTiles[index] = [];
        cachePixelOnImageSizeMax[index] = [];
        tilesMatrix[index] = [];
        coverage[index] = [];
    };

    function setMagnifier(enable) {
        if (enable) {
            document.body.style.cursor = 'none';
            magnifierShown = true;
        } else {
            document.body.style.cursor = '';
            magnifierShown = false;
        }
    }

    /**
     * If <code>enable</code> is true, shows the magnifier; otherwise hides it.
     *
     * @param {boolean} enable
     * @function
     */
    this.setMagnifier = setMagnifier;

    /**
     * Returns number of tiles for the image at a given level.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImages</code> table.
     * @param {number} level
     * @return {number}
     * @private
     */
    function getNumTiles(whichImage, level) {
        if (!cacheNumTiles[whichImage][level]) {
            cacheNumTiles[whichImage][level] = dziImages[whichImage].getNumTiles(level);
        }

        return cacheNumTiles[whichImage][level];
    }

    /**
     * Says how many real pixels horizontally/vertically are covered by one pixel for the image at a given level.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImages</code> table.
     * @param {number} level
     * @return {number}
     * @private
     */
    function getPixelOnImageSizeMax(whichImage, level) {
        if (!cachePixelOnImageSizeMax[whichImage][level]) {
            var pixelOnImageSize = dziImages[whichImage].getScaledDimensions(level).invert();
            cachePixelOnImageSizeMax[whichImage][level] = Math.max(pixelOnImageSize.x, pixelOnImageSize.y);
        }

        return cachePixelOnImageSizeMax[whichImage][level];
    }

    /**
     * Returns a tile given by parameters.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @param {number} time Current time. It's passed as a parameter so that we don't compute time individually
     *                      for each tile.
     * @param {boolean} current
     * @return {Seadragon.Tile}
     * @private
     */
    function getTile(whichImage, level, x, y, time, current) {
        var tileMatrix, dziImage, bounds, url, tile;
        var boundsAlreadyUpdated = false;

        tileMatrix = tilesMatrix[whichImage];
        dziImage = dziImages[whichImage];

        if (!tileMatrix[level]) {
            tileMatrix[level] = [];
        }
        if (!tileMatrix[level][x]) {
            tileMatrix[level][x] = [];
        }

        // Initialize tile object if first time.
        if (!tileMatrix[level][x][y]) {
            // Where applicable, adjust x and y to support
            // Seadragon.Config.wrapping.
            bounds = dziImage.getTileBounds(level, x, y, current);
            url = dziImage.getTileUrl(level, x, y);

            tileMatrix[level][x][y] = new Seadragon.Tile({
                level: level,
                x: x,
                y: y,
                bounds: bounds,
                url: url
            });
            boundsAlreadyUpdated = true;
        }

        tile = tileMatrix[level][x][y];

        if (!boundsAlreadyUpdated && dziImage.bounds.version > tile.version) {
            bounds = dziImage.getTileBounds(level, x, y, current);
            tile.bounds = bounds;
            tile.updateVersion();
        }

        // Mark tile as touched so we don't reset it too soon.
        tile.lastTouchTime = time;

        return tile;
    }

    /**
     * Loads the tile's image file.
     *
     * @param {Seadragon.Tile} tile A tile for which we load an image file.
     * @param {number} time Current time. It's passed as a parameter because we compute it once
     *                      per one #update invocation.
     * @private
     */
    function loadTile(tile, time) {
        tile.loading = imageLoader.loadImage(tile.url, function (image) {
            onTileLoad(tile, time, image);
        });
    }

    /**
     * Handles actions performed on tile image file load. Sets tile's <code>image</code> parameter, marks it as loaded
     * (unless an error occured) and adds the tile to a table of tiles to draw. If the table exceedes the
     * given <code>QUOTA</code> length, one of existing tiles is removed from the table. This is determined
     * by tiles' levels and times they were "touched" for the last time.
     *
     * @param {Seadragon.Tile} tile
     * @param {number} time
     * @param {Image} image
     * @private
     */
    function onTileLoad(tile, time, image) {
        var i;

        tile.loading = false;

        if (midUpdate) {
            console.error('Tile load callback in the middle of drawing routine.');
            return;
        } else if (!image) {
            console.error('Tile ' + tile + ' failed to load: ' + tile.url);
            tile.failedToLoad = true;
            return;
        } else if (time < lastResetTime) {
            console.log('Ignoring tile ' + tile + ' loaded before reset: ' + tile.url);
            return;
        }

        tile.loaded = true;
        tile.image = image;

        var insertionIndex = tilesLoaded.length;

        if (tilesLoaded.length >= QUOTA) {
            var worstTile = null;
            var worstTileIndex = -1;

            for (i = tilesLoaded.length - 1; i >= 0; i--) {
                var prevTile = tilesLoaded[i];

                if (prevTile.beingDrawn) {
                    continue;
                } else if (!worstTile) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                    continue;
                }

                var prevTime = prevTile.lastTouchTime;
                var worstTime = worstTile.lastTouchTime;
                var prevLevel = prevTile.level;
                var worstLevel = worstTile.level;

                if (prevTime < worstTime || (prevTime === worstTime && prevLevel > worstLevel)) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                }
            }

            if (worstTile && worstTileIndex >= 0) {
                worstTile.unload();
                insertionIndex = worstTileIndex;
                // Note: we don't want or need to delete the actual Tile
                // object from tilesMatrix; that's negligible memory.
            }
        }

        tilesLoaded[insertionIndex] = tile;
        $container.trigger('seadragon:forceredraw.seadragon');
    }

    function clearTiles() {
        tilesMatrix = [];
        tilesLoaded = [];
    }

    /**
     * <p>Returns true if the given tile provides coverage to lower-level tiles of
     * lower resolution representing the same content. If neither x nor y is
     * given, returns true if the entire visible level provides coverage.
     *
     * <p>Note that out-of-bounds tiles provide coverage in this sense, since
     * there's no content that they would need to cover. Tiles at non-existent
     * levels that are within the image bounds, however, do not.
     *
     * <p>Coverage scheme: it's required that in the draw routine, coverage for
     * every tile within the viewport is initially explicitly set to false.
     * This way, if a given level's coverage has been initialized, and a tile
     * isn't found, it means it's offscreen and thus provides coverage (since
     * there's no content needed to be covered). And if every tile that is found
     * does provide coverage, the entire visible level provides coverage.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @return {boolean}
     * @private
     */
    function providesCoverage(whichImage, level, x, y) {
        var i, j;
        if (!coverage[whichImage][level]) {
            return false;
        }
        if (x == null || y == null) {
            // Check that every visible tile provides coverage.
            // Update: protecting against properties added to the Object
            // class's prototype, which can definitely (and does) happen.
            var rows = coverage[whichImage][level];
            for (i in rows) {
                if (rows.hasOwnProperty(i)) {
                    var cols = rows[i];
                    for (j in cols) {
                        if (cols.hasOwnProperty(j) && !cols[j]) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }
        return (coverage[whichImage][level][x] == null ||
            coverage[whichImage][level][x][y] == null ||
            coverage[whichImage][level][x][y]);
    }

    /**
     * Returns true if the given tile is completely covered by higher-level
     * tiles of higher resolution representing the same content. If neither x
     * nor y is given, returns true if the entire visible level is covered.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @return {boolean}
     * @private
     */
    function isCovered(whichImage, level, x, y) {
        if (x == null || y == null) {
            return providesCoverage(whichImage, level + 1);
        } else {
            return (providesCoverage(whichImage, level + 1, 2 * x, 2 * y) &&
                providesCoverage(whichImage, level + 1, 2 * x, 2 * y + 1) &&
                providesCoverage(whichImage, level + 1, 2 * x + 1, 2 * y) &&
                providesCoverage(whichImage, level + 1, 2 * x + 1, 2 * y + 1));
        }
    }

    /**
     * Sets whether the given tile provides coverage or not.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @param {boolean} covers Coverage is set to this value.
     * @private
     */
    function setCoverage(whichImage, level, x, y, covers) {
        if (!coverage[whichImage][level]) {
            console.error('Setting coverage for a tile before its level\'s coverage has been reset: ' + level);
            return;
        }
        if (!coverage[whichImage][level][x]) {
            coverage[whichImage][level][x] = [];
        }
        coverage[whichImage][level][x][y] = covers;
    }

    /**
     * Resets coverage information for the given level. This should be called
     * after every draw routine. Note that at the beginning of the next draw
     * routine, coverage for every visible tile should be explicitly set.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {number} level Tile's level.
     * @private
     */
    function resetCoverage(whichImage, level) {
        coverage[whichImage][level] = [];
    }

    /**
     * <p>Figures out if this tile is "better" than the previous best tile and returns the result.
     * Note that if there is no <code>prevBestTile</code>, the given one is automatically chosen.
     *
     * <p>Choosing algorithm relies on comparing level visibility and - if it's the same - distance
     * to the <code>interestingPoint</code>, if one exists (if it doesn't and visibility is the same,
     * <code>prevBestTile</code> is returned).
     *
     * @param {Seadragon.Tile} prevBestTile The best tile so far.
     * @param {Seadragon.Tile} tile A tile that "tries" to be better than <code>prevBestTile</code>.
     * @param {Seadragon.Point} [interestingPoint] The point near which we prefer to draw tiles. Usually
     *                                             either the middle of the viewport or current mouse position.
     * @return {Seadragon.Tile} The "better" tile.
     * @private
     */
    function compareTiles(prevBestTile, tile, interestingPoint) {
        if (!prevBestTile) {
            return tile;
        }
        if (tile.visibility > prevBestTile.visibility) {
            return tile;
        } else if (tile.visibility === prevBestTile.visibility) {
            if (interestingPoint instanceof Seadragon.Point) {
                var tileDistance = interestingPoint.distanceTo(tile.targetCenter);
                var prevBestTileDistance = interestingPoint.distanceTo(prevBestTile.targetCenter);
                if (tileDistance < prevBestTileDistance) {
                    return tile;
                }
            }
        }
        return prevBestTile;
    }

    /**
     * Hides the image if <code>hide</code> is true, shows it otherwise.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {boolean} hide
     * @param {boolean} immediately
     * @private
     */
    function showOrHideDzi(whichImage, hide, immediately) {
        var dziImage = dziImages[whichImage];
        if (!(dziImage instanceof Seadragon.DziImage)) {
            console.error('Can\'t ' + (hide ? 'hide' : 'show') +
                ' DZI of number ' + whichImage + ', there is no such DZI.');
            return;
        }
        var opacityTarget = hide ? 0 : 1;

        if (immediately) {
            dziImage.opacity = opacityTarget;
        } else if (!dziImage.blending) { // Otherwise we leave it where it was before updating.
            dziImage.opacity = hide ? 1 : 0;
        }

        dziImage.hiding = hide;
        dziImage.blendStart = Date.now();
        if (dziImage.blending) { // Fake that we started blending earlier.
            dziImage.blendStart -= (1 - Math.abs(opacityTarget - dziImage.opacity)) * Seadragon.Config.blendTime;
        }
        dziImage.blending = true;

        update();
    }

    function showDzi(whichImage, immediately) {
        showOrHideDzi(whichImage, false, immediately);
    }

    /**
     * Shows the image.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {boolean} immediately
     * @function
     */
    this.showDzi = showDzi;

    function hideDzi(whichImage, immediately) {
        showOrHideDzi(whichImage, true, immediately);
    }

    /**
     * Hides the image.
     *
     * @param {number} whichImage Index of an image in the <code>controller.dziImage</code> table.
     * @param {boolean} immediately
     * @function
     */
    this.hideDzi = hideDzi;


    // See this.update description.
    // TODO this function is too large
    function update() {
        var dziImage, tile, zeroDimensionMax, deltaTime, opacity;
        var i, j, x, y, level; // indexes for loops

        if (midUpdate) {
            // We don't want to run two updates at the same time but we do want to indicate
            // the update needs to re-run as there could have been some changes - making
            // it necessary - done after the currently running update checked for them.
            return true;
        }

        //noinspection JSUnusedAssignment
        midUpdate = true;

        // Assume we won't need to update again after this update.
        // We'll set this if we find a reason to update again.
        var updateAgain = false;

        // The tiles that were drawn last frame, but won't be this frame,
        // can be cleared from the cache, so they should be marked as such.
        while (tilesDrawnLastFrame.length > 0) {
            tile = tilesDrawnLastFrame.pop();
            tilesDrawnLastFrameLayers.pop();
            tile.beingDrawn = false;
        }

        // Clear canvas, whether in <canvas> mode or HTML mode.
        // This is important as scene may be empty this frame.
        var viewportSize = viewport.containerSize;
        canvas.width = viewportSize.x;
        canvas.height = viewportSize.y;

        that.canvasLayersManager.clear();

        var viewportBounds = viewport.getRectangle(true);
        var viewportTL = viewportBounds.getTopLeft();
        var viewportBR = viewportBounds.getBottomRight();
        var viewportCenter = viewport.pixelFromPoint(viewport.getCenter());
        var viewportZoom = viewport.getZoom(true);

        var dziImageTLs = [];
        var dziImageBRs = [];
        var viewportTLs = [];
        var viewportBRs = [];

        var haveDrawns = [];
        var best = null;

        var zeroDimensionsMax = [];
        var drawingEnded = [];
        var drawnImageNumbers = [];

        currentTime = Date.now();

        // Drawing all images.
        dziImages.forEach(function (dziImage, whichImage) {
            if (!(dziImage instanceof Seadragon.DziImage) || dziImage.isHidden()) {
                return;
            }

            // We don't need to compute these two things on each update but filtering out cases where it's not needed
            // would create a little overhead on its own so it's probably not worth doing that.
            dziImageTLs[whichImage] = dziImage.bounds.getTopLeft();
            dziImageBRs[whichImage] = dziImage.bounds.getBottomRight();

            var dziImageTL = dziImageTLs[whichImage];
            var dziImageBR = dziImageBRs[whichImage];

            // If image is off image entirely, don't bother drawing.
            if (dziImageBR.x < viewportTL.x || dziImageBR.y < viewportTL.y ||
                dziImageTL.x > viewportBR.x || dziImageTL.y > viewportBR.y) {
                return;
            }

            // Restrain bounds of viewport relative to image.
            viewportTLs[whichImage] = new Seadragon.Point(
                Math.max(viewportTL.x, dziImageTL.x),
                Math.max(viewportTL.y, dziImageTL.y));
            viewportBRs[whichImage] = new Seadragon.Point(
                Math.min(viewportBR.x, dziImageBR.x),
                Math.min(viewportBR.y, dziImageBR.y));

            if (dziImage.blending) {
                updateAgain = true;

                deltaTime = currentTime - dziImage.blendStart;
                opacity = Math.min(1, deltaTime / Seadragon.Config.blendTime);
                dziImage.opacity = dziImage.hiding ? 1 - opacity : opacity;
                if ((dziImage.isHiding() && dziImage.opacity === 0) ||
                    (dziImage.isShowing() && dziImage.opacity === 1)) {
                    dziImage.blending = false; // We finished blending.
                }
            }

            // Optimal pixel ratio (?) -- this is based on the TARGET value.
            zeroDimensionsMax[whichImage] = getPixelOnImageSizeMax(whichImage, 0);

            haveDrawns[whichImage] = false;
            drawingEnded[whichImage] = false;

            // We'll draw this image.
            drawnImageNumbers.push(whichImage);
        });

        function updateBestTileForImageAtCurrentLevel(whichImage) {
            if (drawingEnded[whichImage]) {
                return; // We could delete whichImage from drawnImageNumbers but cost would be higher.
            }

            dziImage = dziImages[whichImage];
            var adjustedLevel = dziImage.getAdjustedLevel(level);

            viewportTL = viewportTLs[whichImage];
            viewportBR = viewportBRs[whichImage];

            zeroDimensionMax = zeroDimensionsMax[whichImage];

            if (adjustedLevel > dziImage.maxLevel || adjustedLevel < dziImage.minLevel) {
                return;
            }

            var drawLevel = false;
            var renderPixelDimensionC = viewportZoom / dziImage.getLevelScale(level);

            if (magnifierShown) {
                // We need to load higher-level tiles as we need them
                // for the magnifier. Notice that we load these higher
                // levels for the whole space inside the viewport, not
                // only ones under the magnifier. It helps to reduce the
                // impression of slugishness as we move the magnifier. We
                // don't need to worry about the additional tiles to load
                // since before they're loaded we still see tiles from lower
                // levels so transitions are smooth.
                renderPixelDimensionC *= Seadragon.Config.magnifierZoom;
            }

            // If we haven't drawn yet, only draw level if tiles are big enough.
            if ((!haveDrawns[whichImage] && renderPixelDimensionC >= MIN_PIXEL_RATIO) ||
                adjustedLevel === dziImage.minLevel) {
                drawLevel = true;
                haveDrawns[whichImage] = true;
            } else if (!haveDrawns[whichImage]) {
                return;
            }

            resetCoverage(whichImage, adjustedLevel);

            // Calculate scores applicable to all tiles on this level --
            // note that we're basing visibility on the TARGET pixel ratio.
            var renderPixelDimensionTMax = getPixelOnImageSizeMax(whichImage, adjustedLevel);
            var levelVisibility = zeroDimensionMax / Math.abs(zeroDimensionMax - renderPixelDimensionTMax);

            // Only iterate over visible tiles.
            var tileTL = dziImage.getTileAtPoint(adjustedLevel, viewportTL, true);
            var tileBR = dziImage.getTileAtPoint(adjustedLevel, viewportBR, true);
            var numTiles = getNumTiles(whichImage, adjustedLevel);
            var numTilesX = numTiles.x;
            var numTilesY = numTiles.y;
            tileTL.x = Math.max(tileTL.x, 0);
            tileTL.y = Math.max(tileTL.y, 0);
            tileBR.x = Math.min(tileBR.x, numTilesX - 1);
            tileBR.y = Math.min(tileBR.y, numTilesY - 1);

            for (x = tileTL.x; x <= tileBR.x; x++) {
                for (y = tileTL.y; y <= tileBR.y; y++) {
                    tile = getTile(whichImage, adjustedLevel, x, y, currentTime, true);
                    var drawTile = drawLevel;

                    // Assume this tile doesn't cover initially.
                    setCoverage(whichImage, adjustedLevel, x, y, false);

                    if (tile.failedToLoad) {
                        continue;
                    }

                    // If we've drawn a higher-resolution level and we're
                    // not going to draw this level, then say this tile does
                    // cover if it's covered by higher-resolution tiles. if
                    // we're not covered, then we should draw this tile regardless.
                    if (haveDrawns[whichImage] && !drawTile) {
                        if (isCovered(whichImage, adjustedLevel, x, y)) {
                            setCoverage(whichImage, adjustedLevel, x, y, true);
                        } else {
                            drawTile = true;
                        }
                    }

                    if (!drawTile) {
                        continue;
                    }

                    // Calculate tile's position and size in pixels.
                    var boundsTL = tile.bounds.getTopLeft();
                    var boundsSize = tile.bounds.getSize();

                    var positionC = viewport.pixelFromPoint(boundsTL, true);
                    var sizeC = viewport.deltaPixelsFromPoints(boundsSize, true);

                    var drawOnMagnifier = magnifierShown && magnifier != null &&
                        magnifier.intersectsRectangle(new Seadragon.Rectangle(
                            positionC.x, positionC.y, sizeC.x, sizeC.y));

                    // Calculate distance from center of viewport --
                    // note that this is based on tile's TARGET position.
                    var positionT = viewport.pixelFromPoint(boundsTL, false);
                    var sizeT = viewport.deltaPixelsFromPoints(boundsSize, false);
                    var centerT = positionT.plus(sizeT.divide(2));

                    // Update tile's scores and values.
                    tile.position = positionC;
                    tile.size = sizeC;
                    tile.targetCenter = centerT;
                    tile.visibility = levelVisibility;

                    if (tile.loaded) {
                        if (!tile.blendStart) {
                            // Image was just added, blend it.
                            tile.blendStart = currentTime;
                        }

                        deltaTime = currentTime - tile.blendStart;
                        opacity = Math.min(1, deltaTime / Seadragon.Config.blendTime);

                        tile.opacity = opacity * dziImage.opacity;

                        // Queue tile for drawing in reverse order.
                        tilesDrawnLastFrame.push(tile);
                        tilesDrawnLastFrameLayers.push(drawOnMagnifier ? 1 : 0);

                        // If fully blended in, this tile now provides coverage,
                        // otherwise we need to update again to keep blending.
                        if (opacity >= 1) {
                            setCoverage(whichImage, adjustedLevel, x, y, true);
                        } else {
                            updateAgain = true;
                        }
                    } else if (!tile.loading) {
                        // Means tile isn't loaded yet, so score it.
                        var interestingPoint;
                        if (magnifierShown) { // if magnifier shown, draw tiles close to its center
                            interestingPoint = magnifier.center;
                        } else { // otherwise prefer the middle of the screen
                            interestingPoint = viewportCenter;
                        }
                        best = compareTiles(best, tile, interestingPoint);
                    }
                }
            }

            // We may not need to draw any more lower-res levels.
            if (providesCoverage(whichImage, adjustedLevel)) {
                drawingEnded[whichImage] = true;
            }
        }


        for (level = that.maxLevel; level >= 0; level--) {
            drawnImageNumbers.forEach(updateBestTileForImageAtCurrentLevel);
        }

        // Load next tile if there is one to load.
        if (best) {
            loadTile(best, currentTime);
            // We haven't finished drawing, so we should be re-evaluating and re-scoring.
            updateAgain = true;
        }

        // Now draw the tiles, but in reverse order since we want higher-res
        // tiles to be drawn on top of lower-res ones. also mark each tile
        // as being drawn so it won't get cleared from the cache.
        for (i = tilesDrawnLastFrame.length - 1; i >= 0; i--) {
            tile = tilesDrawnLastFrame[i];
            for (j = 0; j <= tilesDrawnLastFrameLayers[i]; j++) {
                that.canvasLayersManager.addToLayer(j, tile);
            }
            tile.beingDrawn = true;
        }
        that.canvasLayersManager.drawCanvas();

        midUpdate = false;

        return updateAgain;
    }

    /**
     * The main update function.
     *
     * @return {boolean} Are there some actions left to perform (like showing a tile, blurring it in/out etc.)?
     *                   In such a case the function must be invoked again.
     * @function
     */
    this.update = update;

    function reset() {
        clearTiles();
        lastResetTime = Date.now();
        $container.trigger('seadragon:forceredraw.seadragon');
    }

    /**
     * Resets drawer state: clears all tiles, sets <code>lastResetTime</code> to now and
     * triggers the <code>seadragon:forceredraw.seadragon</code> event.
     *
     * @function
     */
    this.reset = reset;
};
