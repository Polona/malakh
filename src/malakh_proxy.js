/* global malakhProxy: true */

var malakhProxy = Object.create(Malakh.prototype);

// We're making malakh fields accessible from any Malakh class via this.field
// instead of this.malakh.field. But we still reflect all changes onto this.malakh.field
utils.forEach([
    // constructors: classes
    'AnimatedRectangle', 'DziImage', 'SingleImage', 'Spring', 'Tile', 'TiledImage',

    // constructors: class single instances
    'CanvasLayersManager', 'Controller', 'Drawer', 'ImageLoader',
    'LayoutManager', 'Magnifier', 'Markers', 'Picker', 'Viewport',

    // properties: class single instances
    'canvasLayersManager', 'controller', 'drawer', 'imageLoader',
    'layoutManager', 'magnifier', 'markers', 'picker', 'viewport',

    // properties: other
    'config', '$container', '$canvas', 'canvasContext', 'tiledImages',
],
    function (field) {
        Object.defineProperty(malakhProxy, field, {
            get: function () {
                return this.malakh[field];
            },
            set: function (value) {
                this.malakh[field] = value;
            },
        });
    }
);
