/**
 * Constructs the <code>CanvasLayerManager</code>.
 *
 * @class <p>Manages two virtual layers on one canvas. This is needed to properly handle magnifier
 * as its tiles have to be drawn after all usual ones. Layer 0 is responsible for usual tiles, layer 1
 * for magnifier ones. Layer 1 is not drawn if magnifier is not shown.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 */
Seadragon.CanvasLayersManager = function CanvasLayersManager(seadragon) {
    this.ensureArguments(arguments, 'CanvasLayersManager');
    /**
     * An array containing all tiles currently scheduled to draw
     * @type Array.<Array.<Seadragon.Tile>>
     */
    this.tiles = [
        [],
        []
    ];
};

Seadragon.CanvasLayersManager.prototype = Object.create(seadragonProxy);

$.extend(Seadragon.CanvasLayersManager.prototype,
    /**
     * @lends Seadragon.CanvasLayersManager.prototype
     */
    {
        /**
         * Adds a tile to the layer idenfified by <code>layerNum</code>.
         * Magnifier's layer number is 1, the "standard" layer is 0.
         *
         * @param {number} layerNum
         * @param {Seadragon.Tile} tile
         */
        addToLayer: function addToLayer(layerNum, tile) {
            this.tiles[layerNum].push(tile);
            return this;
        },

        /**
         * Draws the layer idenfified by <code>layerNum</code>.
         *
         * @param {number} layerNum
         */
        drawLayer: function drawLayer(layerNum) {
            var tilesOnLayer, drawLayer1, zoom;

            var seadragon = this.seadragon,
                canvasContext = seadragon.canvasContext,
                magnifier = seadragon.magnifier,
                config = seadragon.config,
                viewport = seadragon.viewport;

            tilesOnLayer = this.tiles[layerNum];
            drawLayer1 = layerNum === 1 && config.enableMagnifier && magnifier;

            if (drawLayer1) { // magnifier level
                canvasContext.save();
                magnifier.drawPath(canvasContext);
            }
            u.forEach(tilesOnLayer, function (tile) {
                if (drawLayer1) {
                    zoom = config.magnifierZoom;
                } else {
                    zoom = 1;
                }
                if (drawLayer1) {
                    tile.draw(zoom, magnifier.center);
                } else {
                    tile.draw(zoom, viewport.getCenter());
                }
            });
            if (drawLayer1) { // magnifier level
                magnifier.drawOnFinish(canvasContext);
                canvasContext.restore();
            }
            return this;
        },

        /**
         * Draws both canvas layers.
         */
        draw: function draw() {
            // TODO try drawing to an off-screen canvas first to eliminate "seaming" effect on tiled image showing.
            return this.drawLayer(0).drawLayer(1);
        },

        /**
         * Clears the set of tiles to draw.
         */
        reset: function reset() {
            this.tiles = [
                [],
                []
            ];
            return this;
        },
    }
);
