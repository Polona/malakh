/*global Seadragon: false, dziNamesArray: false */
var sdData;

function seadragonCustom(options) {
    'use strict';

    var buttonColors = {
        false: '#cd5c5c',
        true: '#2e8b57'
    };

    var pickerOn = false;
    var magnifierOn = false;
    var animationsOff = false;

    var constrain_image_3 = false;
    var constrain_image_17 = false;

    var $container, dziDataArray;

    sdData = {
        containerSelector: undefined,

        debugMode: false,
        debugTileBorders: false,

        zoomPerDblclick: 2.5,

        controller: undefined,
        tilesDir: 'seadragon_data/'
    };
    $.extend(sdData, options);


    // Seadragon options:
    if (typeof sdData.animationTime === 'number') {
        Seadragon.Config.animationTime = sdData.animationTime;
    } else {
        sdData.animationTime = Seadragon.Config.animationTime;
    }

    Seadragon.Config.zoomPerScroll = 1.2;
    Seadragon.Config.imageLoaderLimit = 50;

    Seadragon.Config.backgroundColor = '#2d2a2b';

    // Debug options:
    Seadragon.Config.debugMode = sdData.debugMode;
    Seadragon.Config.debugTileBorders = sdData.debugTileBorders;

    // Seadragon initialization:
    $container = $(sdData.containerSelector);
    sdData.controller = new Seadragon.Controller($container);

    dziDataArray = [];
    dziNamesArray.forEach(function (dziName, index) {
        dziDataArray[index] = {
            dziUrl: sdData.tilesDir + dziName + '.dzi',
            bounds: new Seadragon.Rectangle(1000000, 1000000, 1000, 1000)
        };
    });
    sdData.controller.openDziArray(dziDataArray);
    sdData.controller.layoutManager.alignRows(4920, 0, Infinity, true);

    // Adjust -- not necessary, just removes the need to do it by ourselves.
    sdData.controller.viewport.zoomTo(0.1, true);
    sdData.controller.viewport.panTo(new Seadragon.Point(7000, 2500), true);


    // Buttons.
    $('#animations_off').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            animationsOff = !animationsOff;
            if (animationsOff) {
                Seadragon.Config.animationTime = 0;
            } else {
                Seadragon.Config.animationTime = sdData.animationTime;
            }
            $(this).css('background-color', buttonColors[animationsOff]);
            return false;
        }
    });

    var $magnifier = $('#magnifier');
    if (Seadragon.Magnifier) {
        $magnifier.on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                if (pickerOn) {
                    $('#picker').trigger(event); // turn off the picker
                }
                sdData.controller.toggleMagnifier();
                magnifierOn = !magnifierOn;
                $(this).css('background-color', buttonColors[magnifierOn]);
                return false;
            }
        });
    } else {
        $magnifier.hide();
    }

    var $picker = $('#picker');
    if (Seadragon.Picker) {
        $picker.on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                if (magnifierOn) {
                    $('#magnifier').trigger(event); // turn off the magnifier
                }
                sdData.controller.togglePicker();
                pickerOn = !pickerOn;
                $(this).css('background-color', buttonColors[pickerOn]);
                return false;
            }
        });
    } else {
        $picker.hide();
    }


    $('#align_row').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrain_image_3 || constrain_image_17) {
                return false;
            }
            sdData.controller.layoutManager.alignRows(6000, 100, Infinity);
            return false;
        }
    });

    $('#align_column').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrain_image_3 || constrain_image_17) {
                return false;
            }
            sdData.controller.layoutManager.alignColumns(6000, 100, Infinity);
            return false;
        }
    });

    $('#align_rows').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrain_image_3 || constrain_image_17) {
                return false;
            }
            sdData.controller.layoutManager.alignRows(6000, 100, 100000);
            return false;
        }
    });

    $('#align_columns').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrain_image_3 || constrain_image_17) {
                return false;
            }
            sdData.controller.layoutManager.alignColumns(6000, 100, 100000);
            return false;
        }
    });

    $('#fit_image_3').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrain_image_17) {
                return false;
            }
            sdData.controller.fitImage(2);
            return false;
        }
    });

    $('#fit_image_17').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrain_image_3) {
                return false;
            }
            sdData.controller.fitImage(16);
            return false;
        }
    });

    $('#constrain_image_3').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (pickerOn) {
                return false;
            }
            constrain_image_3 = !constrain_image_3;
            $(this).css('background-color', buttonColors[constrain_image_3]);
            constrain_image_17 = false;
            $('#constrain_image_17').css('background-color', buttonColors[false]);
            Seadragon.Config.constraintViewport = constrain_image_3;
            sdData.controller.viewport.constraintBounds = new Seadragon.Rectangle(
                sdData.controller.dziImages[2].bounds.getRectangle()); // TODO better API
            sdData.controller.viewport.fitConstraintBounds();
            sdData.controller.viewport.applyConstraints();
            return false;
        }
    });

    $('#constrain_image_17').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (pickerOn) {
                return false;
            }
            constrain_image_17 = !constrain_image_17;
            $(this).css('background-color', buttonColors[constrain_image_17]);
            constrain_image_3 = false;
            $('#constrain_image_3').css('background-color', buttonColors[false]);
            Seadragon.Config.constraintViewport = constrain_image_17;
            sdData.controller.viewport.constraintBounds = new Seadragon.Rectangle(
                sdData.controller.dziImages[16].bounds.getRectangle()); // TODO better API
            sdData.controller.viewport.fitConstraintBounds();
            sdData.controller.viewport.applyConstraints();
            return false;
        }
    });
}
