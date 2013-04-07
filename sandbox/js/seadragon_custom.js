/* global Seadragon: false, dziNamesArray: false */
var seadragon;

function seadragonCustom(containerSelectorOrElement, configOverrides) {
    'use strict';

    var buttonColors = {
        false: '#cd5c5c',
        true: '#2e8b57',
    };
    var dziPrefix = 'seadragon_data/';
    var initialAnimationTime, initialMouseAnimationTime;

    var animationsOff = false;

    var constrainToImage2 = false,
        constrainToImage16 = false;

    var dziDataArray;

    // Seadragon initialization:
    seadragon = new Seadragon(containerSelectorOrElement,
        $.extend({}, {backgroundColor: '#2d2a2b'}, configOverrides));
    initialAnimationTime = seadragon.config.animationTime;
    initialMouseAnimationTime = seadragon.config.mouseAnimationTime;

    function openNorblinDZIsInARow() {
        dziDataArray = [];
        dziNamesArray.forEach(function (dziName, index) {
            dziDataArray[index] = {
                dziUrl: dziPrefix + dziName + '.dzi',
                bounds: new Seadragon.Rectangle(1000000, 1000000, 1000, 1000),
            };
        });
        seadragon.openDziArray(dziDataArray);
        seadragon.alignRows(6000, 0, Infinity, true);
        seadragon.viewport.zoomTo(0.1, true);
        seadragon.viewport.panTo(new Seadragon.Point(7000, 3000), true);
    }

    function openOneTestDZIFromAcademica() {
        seadragon
            .openDzi({
                dziUrl: 'http://127.0.0.1:8107/resource/image/280189/?DeepZoom=279868.tif.dzi',
                tilesUrl: 'http://127.0.0.1:8107/resource/image/280189/?DeepZoom=279868.tif_files/',
            }).showOnlyImage(0, {
                dontForceConstraints: true,
            });
    }

    openNorblinDZIsInARow();

    // Buttons.
    $('#animations_off').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            animationsOff = !animationsOff;
            if (animationsOff) {
                seadragon.config.animationTime = seadragon.config.mouseAnimationTime = 0;
            } else {
                seadragon.config.animationTime = initialAnimationTime;
                seadragon.config.mouseAnimationTime = initialMouseAnimationTime;
            }
            $(this).css('background-color', buttonColors[animationsOff]);
        }
    });

    $('#dont_center').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            seadragon.config.centerWhenZoomedOut = !seadragon.config.centerWhenZoomedOut;
            $(this).css('background-color', buttonColors[!seadragon.config.centerWhenZoomedOut]);
        }
    });

    $('#zoom_off').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            seadragon.config.blockZoom = !seadragon.config.blockZoom;
            $(this).css('background-color', buttonColors[seadragon.config.blockZoom]);
        }
    });

    $('#tile_borders').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            seadragon.config.debugTileBorders = !seadragon.config.debugTileBorders;
            $(this).css('background-color', buttonColors[seadragon.config.debugTileBorders]);
        }
    });

    var $magnifier = $('#magnifier');
    if (Seadragon.Magnifier) {
        $magnifier.on({
            click: function (evt) {
                if (evt.which !== 1) { // Only left-click is supported.
                    return;
                }
                if (seadragon.config.enablePicker) {
                    $('#picker').trigger(evt); // turn off the picker
                }
                seadragon.toggleMagnifier();
                $(this).css('background-color', buttonColors[seadragon.config.enableMagnifier]);
            }
        });
    } else {
        $magnifier.hide();
    }

    var $picker = $('#picker');
    if (Seadragon.Picker) {
        $picker.on({
            click: function (evt) {
                if (evt.which !== 1) { // Only left-click is supported.
                    return;
                }
                if (seadragon.config.enableMagnifier) {
                    $('#magnifier').trigger(evt); // turn off the magnifier
                }
                seadragon.togglePicker();
                $(this).css('background-color', buttonColors[seadragon.config.enablePicker]);
            }
        });
    } else {
        $picker.hide();
    }


    $('#align_row').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage2 || constrainToImage16) {
                return;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            seadragon.alignRows(6000, 100, Infinity);
        }
    });

    $('#align_column').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage2 || constrainToImage16) {
                return;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            seadragon.alignColumns(6000, 100, Infinity);
        }
    });

    $('#align_rows').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage2 || constrainToImage16) {
                return;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            seadragon.alignRows(6000, 100, 100000);
        }
    });

    $('#align_columns').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage2 || constrainToImage16) {
                return;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            seadragon.alignColumns(6000, 100, 100000);
        }
    });

    $('#fit_image_2').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage16) {
                return;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            seadragon.fitImage(2);
        }
    });

    $('#fit_image_16').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (constrainToImage2) {
                return;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            seadragon.fitImage(16);
        }
    });

    $('#constrain_to_image_2').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            constrainToImage2 = !constrainToImage2;
            $(this).css('background-color', buttonColors[constrainToImage2]);
            constrainToImage16 = false;
            $('#constrain_to_image_16').css('background-color', buttonColors[false]);
            if (constrainToImage2) {
                seadragon.constrainToImage(16);
                seadragon.fitImage(16);
            } else {
                seadragon.config.constrainViewport = false;
            }
        }
    });

    $('#constrain_to_image_16').on({
        click: function (evt) {
            if (evt.which !== 1) { // Only left-click is supported.
                return;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(evt); // turn off the picker
            }
            constrainToImage16 = !constrainToImage16;
            $(this).css('background-color', buttonColors[constrainToImage16]);
            constrainToImage2 = false;
            $('#constrain_to_image_2').css('background-color', buttonColors[false]);
            if (constrainToImage16) {
                seadragon.constrainToImage(16);
                seadragon.fitImage(16);
            } else {
                seadragon.config.constrainViewport = false;
            }
        }
    });
}
