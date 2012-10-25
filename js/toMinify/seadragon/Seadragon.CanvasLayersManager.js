/*global Seadragon: false */
(function () {
    'use strict';

    /**
     * Constructs the <code>CanvasLayerManager</code> instance based of canvas context
     * and a magnifier instance.
     *
     * @class <p>Manages two virtual layers on one canvas. This is needed to properly handle magnifier
     * as its tiles have to be drawn after all usual ones. Layer 0 is responsible for usual tiles, layer 1
     * for magnifier ones. Layer 1 is not drawn if magnifier is not shown.
     *
     * <ul>
     *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
     *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
     *     <li>License: MIT (see the licence.txt file for copyright information)</li>
     * <ul>
     *
     * @param {CanvasRenderingContext2D} context '2d' context of canvas on which we are drawing
     * @param {Seadragon.Magnifier} magnifier
     */
    Seadragon.CanvasLayersManager = function (context, magnifier) {
        if (context == null) {
            Seadragon.Debug.fatal('Can\'t create a CanvasLayersManager instance without a context parameter!');
        }
        this.clear();
        /**
         * '2d' context of canvas on which we are drawing.
         * @type CanvasRenderingContext2D
         */
        this.context = context;
        /**
         * @type Seadragon.Magnifier
         */
        this.magnifier = magnifier;
        /**
         * Magnifier is drawn only this field is true.
         * @type boolean
         */
        /**
         * An array containing all tiles currently scheduled to draw
         * @type Array.<Array.<Seadragon.Tile>>
         */
        this.tiles = [
            [],
            []
        ];
    };

    Seadragon.CanvasLayersManager.prototype = {
        /**
         * Adds a tile to the layer idenfified by <code>layerNum</code>.
         * Magnifier's layer number is 1, the "standard" layer is 0.
         *
         * @param {number} layerNum
         * @param {Seadragon.Tile} tile
         */
        addToLayer: function (layerNum, tile) {
            this.tiles[layerNum].push(tile);
        },

        /**
         * Draws the layer idenfified by <code>layerNum</code>.
         *
         * @param {number} layerNum
         */
        drawLayer: function (layerNum) {
            var i, tilesOnLayer, drawLayer1, tile, zoom;
            tilesOnLayer = this.tiles[layerNum];
            drawLayer1 = layerNum === 1 && this.drawMagnifier;

            if (drawLayer1) { // magnifier level
                this.context.save();
                this.magnifier.drawPath(this.context);
            }
            for (i = 0; i < tilesOnLayer.length; i++) {
                tile = tilesOnLayer[i];
                if (drawLayer1) {
                    zoom = Seadragon.Config.magnifierZoom;
                } else {
                    zoom = 1;
                }
                tile.drawCanvas(this.context, zoom, this.magnifier.center);
            }
            if (drawLayer1) { // magnifier level
                this.magnifier.drawOnFinish(this.context);
                this.context.restore();
            }
        },

        /**
         * Draws both canvas layers.
         */
        drawCanvas: function () {
            this.drawLayer(0);
            this.drawLayer(1);
        },

        /**
         * Clears the set of tiles to draw.
         */
        clear: function () {
            this.tiles = [
                [],
                []
            ];
        }
    };
})();
