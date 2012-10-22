/*global Seadragon: false */

//noinspection JSValidateJSDoc
/**
 * Constructs a drawer.
 *
 * @class Handles all the drawing based on events passed to it by the controller.
 *
 * <p> See <code>Seadragon.Viewport</code> description for information about conventions around parameter
 * named <code>current</code> and names <strong>point</strong> and <strong>pixel</strong>.
 *
 * @see Seadragon.Viewport
 *
 * @param {Object} options An object containing all given options.
 * @param {Seadragon.Viewport} options.viewport
 * @param {jQuery object} options.$container A jQuery object representing the DOM element containing
 *                                           all the HTML structure of Seadragon.
 * @param {Seadragon.Magnifier} options.magnifier
 *
 * @author <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 */
Seadragon.Drawer = function (options) {
    'use strict';

    var self = this;

    var dziImage, viewport, magnifier;
    var $container, canvas, context;

    var imageLoader;
    var magnifierShown;

    var cacheNumTiles; // 1d dictionary [level] --> Point
    var cachePixelOnImageSizeMax; // 1d dictionary [level] --> max(point.x, point.y)
    var coverage; // 3d dictionary [level][x][y] --> boolean
    var tilesMatrix; // 3d dictionary [level][x][y] --> Tile
    var tileBoundsNotChangedMatrix; // like above

    var tilesLoaded; // unordered list of Tiles with loaded images
    var tilesDrawnLastFrame; // unordered list of Tiles drawn last frame
    var tilesDrawnLastFrameLayers; // layers of above tiles

    var viewportTL;
    var viewportBR;

    var currentTime;
    var lastResetTime;
    var midUpdate;

    var QUOTA = 500; // the max number of images we should keep in memory
    var MIN_PIXEL_RATIO = 0.5; // the most shrunk a tile should be

    (function init() {
        if (options == null || options.viewport == null || options.$container == null) {
            Seadragon.Debug.log('\nReceived options: ');
            Seadragon.Debug.log(options);
            Seadragon.Debug.fatal('Seadragon.Drawer needs a JSON parameter with at least the following fields: ' +
                'viewport, $container.\n' +
                'Parameter magnifier is optional.');
        }

        dziImage = null;

        viewport = options.viewport;
        magnifier = options.magnifier;

        $container = $(options.$container);
        canvas = $container.find('canvas').get(0);
        context = canvas.getContext('2d');
        // One layer for a magnifier:
        self.canvasLayersManager = new Seadragon.CanvasLayersManager(context, magnifier);

        self.element = $container;
        $container.append($(canvas));

        imageLoader = new Seadragon.ImageLoader(Seadragon.Config.imageLoaderLimit);

        magnifierShown = false;

        tileBoundsNotChangedMatrix = [];

        tilesLoaded = [];
        tilesDrawnLastFrame = [];
        tilesDrawnLastFrameLayers = [];

        viewportTL = [];
        viewportBR = [];

        currentTime = Date.now();
        lastResetTime = 0;
        midUpdate = false;
    })();

    /**
     * Loads a new DZI image, replacing the current one.
     *
     * @param {Seadragon.DziImage} newDziImage
     */
    this.loadDziImage = function (newDziImage) {
        if (!newDziImage) {
            Seadragon.Debug.error('No DZI Image given to Drawer\'s loadDziImage method!');
            return;
        }

        // Load an image.
        dziImage = newDziImage;
        cacheNumTiles = [];
        cachePixelOnImageSizeMax = [];
        tilesMatrix = [];
        coverage = [];
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
     * @param {number} level
     * @return {number}
     * @private
     */
    function getNumTiles(level) {
        if (!cacheNumTiles[level]) {
            cacheNumTiles[level] = dziImage.getNumTiles(level);
        }

        return cacheNumTiles[level];
    }

    /**
     * Says how many real pixels horizontally/vertically are covered by one pixel for the image at a given level.
     * Results are cached.
     *
     * @param {number} level
     * @return {number}
     * @private
     */
    function getPixelOnImageSizeMax(level) {
        if (!cachePixelOnImageSizeMax[level]) {
            var pixelOnImageSize = dziImage.getScaledDimensions(level).invert();
            cachePixelOnImageSizeMax[level] = Math.max(pixelOnImageSize.x, pixelOnImageSize.y);
        }

        return cachePixelOnImageSizeMax[level];
    }

    /**
     * Returns a tile given by parameters.
     * Results are cached.
     *
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @param {number} time Current time. It's passed as a parameter so that we don't compute time individually
     *                      for each tile.
     * @param {boolean} current
     * @return {Seadragon.Tile}
     * @private
     */
    function getTile(level, x, y, time, current) {
        var bounds, url, tile;

        if (!tilesMatrix[level]) {
            tilesMatrix[level] = [];
        }
        if (!tilesMatrix[level][x]) {
            tilesMatrix[level][x] = [];
        }

        // Initialize tile object if first time.
        if (!tilesMatrix[level][x][y]) {
            // Where applicable, adjust x and y to support
            // Seadragon.Config.wrapping.
            bounds = dziImage.getTileBounds(level, x, y, current);
            url = dziImage.getTileUrl(level, x, y);

            tilesMatrix[level][x][y] = new Seadragon.Tile({
                level: level,
                x: x,
                y: y,
                bounds: bounds,
                url: url
            });
        }

        tile = tilesMatrix[level][x][y];

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
            Seadragon.Debug.error('Tile load callback in middle of drawing routine.');
            return;
        } else if (!image) {
            Seadragon.Debug.error('Tile ' + tile + ' failed to load: ' + tile.url);
            tile.failedToLoad = true;
            return;
        } else if (time < lastResetTime) {
            Seadragon.Debug.log('Ignoring tile ' + tile + ' loaded before reset: ' + tile.url);
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
        $container.trigger('seadragon.forceredraw');
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
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @return {boolean}
     * @private
     */
    function providesCoverage(level, x, y) {
        var i, j;
        if (!coverage[level]) {
            return false;
        }
        if (x == null || y == null) {
            // Check that every visible tile provides coverage.
            // Update: protecting against properties added to the Object
            // class's prototype, which can definitely (and does) happen.
            var rows = coverage[level];
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
        return (coverage[level][x] == null ||
            coverage[level][x][y] == null ||
            coverage[level][x][y]);
    }

    /**
     * Returns true if the given tile is completely covered by higher-level
     * tiles of higher resolution representing the same content. If neither x
     * nor y is given, returns true if the entire visible level is covered.
     *
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @return {boolean}
     * @private
     */
    function isCovered(level, x, y) {
        if (x == null || y == null) {
            return providesCoverage(level + 1);
        } else {
            return (providesCoverage(level + 1, 2 * x, 2 * y) &&
                providesCoverage(level + 1, 2 * x, 2 * y + 1) &&
                providesCoverage(level + 1, 2 * x + 1, 2 * y) &&
                providesCoverage(level + 1, 2 * x + 1, 2 * y + 1));
        }
    }

    /**
     * Sets whether the given tile provides coverage or not.
     *
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @param {boolean} covers Coverage is set to this value.
     * @private
     */
    function setCoverage(level, x, y, covers) {
        if (!coverage[level]) {
            Seadragon.Debug.error('Setting coverage for a tile before its level\'s coverage has been reset: ' + level);
            return;
        }
        if (!coverage[level][x]) {
            coverage[level][x] = [];
        }
        coverage[level][x][y] = covers;
    }

    /**
     * Resets coverage information for the given level. This should be called
     * after every draw routine. Note that at the beginning of the next draw
     * routine, coverage for every visible tile should be explicitly set.
     *
     * @param {number} level Tile's level.
     * @private
     */
    function resetCoverage(level) {
        coverage[level] = [];
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
     * @return {Seadragon.Tile}
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


    // See this.update description.
    function update() {
        var tile, zeroDimensionMax, deltaTime, opacity;
        var i, j, x, y, level; // indexes for loops

        if (dziImage == null) { // DZI hasn't been loaded yet.
            return false;
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

        self.canvasLayersManager.clear();

        var viewportBounds = viewport.getRectangle(true);
        var viewportTL = viewportBounds.getTopLeft();
        var viewportBR = viewportBounds.getBottomRight();
        var viewportCenter = viewport.pixelFromPoint(viewport.getCenter());
        var viewportZoom = viewport.getZoom(true);

        var best = null;

        currentTime = Date.now();

        // Restrain bounds of viewport relative to image.
        viewportTL = new Seadragon.Point(
            Math.max(viewportTL.x, 0),
            Math.max(viewportTL.y, 0));
        viewportBR = new Seadragon.Point(
            Math.min(viewportBR.x, dziImage.width),
            Math.min(viewportBR.y, dziImage.height));

        // Optimal pixel ratio (?) -- this is based on the TARGET value.
        zeroDimensionMax = getPixelOnImageSizeMax(0);

        var haveDrawn = false;
        var drawingEnded = false;


        for (level = dziImage.maxLevel; level >= dziImage.minLevel; level--) {
            if (drawingEnded) {
                break;
            }

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
            if ((!haveDrawn && renderPixelDimensionC >= MIN_PIXEL_RATIO) || level === dziImage.minLevel) {
                haveDrawn = true;
            } else if (!haveDrawn) {
                continue;
            }

            resetCoverage(level);

            // Calculate scores applicable to all tiles on this level --
            // note that we're basing visibility on the TARGET pixel ratio.
            var renderPixelDimensionTMax = getPixelOnImageSizeMax(level);
            var levelVisibility = zeroDimensionMax / Math.abs(zeroDimensionMax - renderPixelDimensionTMax);

            // Only iterate over visible tiles.
            var tileTL = dziImage.getTileAtPoint(level, viewportTL, true);
            var tileBR = dziImage.getTileAtPoint(level, viewportBR, true);
            var numTiles = getNumTiles(level);
            var numTilesX = numTiles.x;
            var numTilesY = numTiles.y;
            tileTL.x = Math.max(tileTL.x, 0);
            tileTL.y = Math.max(tileTL.y, 0);
            tileBR.x = Math.min(tileBR.x, numTilesX - 1);
            tileBR.y = Math.min(tileBR.y, numTilesY - 1);

            for (x = tileTL.x; x <= tileBR.x; x++) {
                for (y = tileTL.y; y <= tileBR.y; y++) {
                    tile = getTile(level, x, y, currentTime, true);
                    var drawTile = true;

                    // Assume this tile doesn't cover initially.
                    setCoverage(level, x, y, false);

                    if (tile.failedToLoad) {
                        continue;
                    }

                    // If we've drawn a higher-resolution level and we're
                    // not going to draw this level, then say this tile does
                    // cover if it's covered by higher-resolution tiles. if
                    // we're not covered, then we should draw this tile regardless.
                    if (haveDrawn && !drawTile) {
                        if (isCovered(level, x, y)) {
                            setCoverage(level, x, y, true);
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

                        tile.opacity = opacity;

                        // Queue tile for drawing in reverse order.
                        tilesDrawnLastFrame.push(tile);
                        tilesDrawnLastFrameLayers.push(drawOnMagnifier ? 1 : 0);

                        // If fully blended in, this tile now provides coverage,
                        // otherwise we need to update again to keep blending.
                        if (opacity >= 1) {
                            setCoverage(level, x, y, true);
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
            if (providesCoverage(level)) {
                drawingEnded = true;
            }
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
                self.canvasLayersManager.addToLayer(j, tile);
            }
            tile.beingDrawn = true;
        }
        self.canvasLayersManager.drawCanvas();

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
        $container.trigger('seadragon.forceredraw');
    }

    /**
     * Resets drawer state: clears all tiles, sets <code>lastResetTime</code> to now and
     * triggers the <code>seadragon.forceredraw</code> event.
     *
     * @function
     */
    this.reset = reset;
};
