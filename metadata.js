#!/usr/bin/gjs

/*
* Nautilus-Metadata a script to show metadata in a GUI on the Linux desktop
* Copyright (C) 2019  Jason Webb

* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.

* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.

* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// import standard libraries
const { Gio, GLib, Gtk, Gdk, Pango, WebKit2 }  = imports.gi;
const ByteArray = imports.byteArray;

/**
 * @class Class to display metadata from a file or files in a UI wrapper via
 * the nuatilus script contect menu.
 */
class Application {
    /**
     * @desc Class constructor
     * @external GLib
     */
    constructor() {
        this.widgets = {};
        this.fileNumber = 0;
        this.VERSION = '1.0';
        this.TITLE =  'Nautilus GetMetadata';
        GLib.set_prgname(this.TITLE);
    }

    /**
     * @desc Initial public method that will run the application
     * @event activate
     * @event startup
     * @external Gtk.Application
     */
    run() {
        this.application = new Gtk.Application();
        this.application.connect('activate', () => { this._onActivate(); });
        this.application.connect('startup', () => { this._onStartup(); });
        this.application.run([]);
    }

    /**
     * @desc Method called to quit the application
     */
    _quit() {
        this.application.quit();
    }

    /**
     * @desc Method called to show the main application window to the user
     */
    _showApplication() {
        this.window.show();
    }

    /**
     * @desc Method called via the activate event (called after startup)
     */
    _onActivate() {
        /*this.window.connect('key_press_event', (actor, event) => {
            const keyValue = event.get_keyval();
            if (keyValue[1] === 65361) {
                this._decreaseFileNumber();
            }
            if (keyValue[1] === 65363) {
                this._increaseFileNumber();
            }
        });*/
    }

    /**
     * @desc Method called via the startup event. From this method the initial
     * UI is built and the file(s) metadata is parsed and stored for use
     */
    _onStartup() {
        let commands = ARGV.map((arg) => (
            [ 'exiftool', '-j', '-g', '-H', '-l', arg]
        ));
        this._initMenus();
        this._buildUI();
        this._runCommand(commands)
            .then(data => this._checkForEmpty(data))
            .then(data => this._setMetadata(data));
    }

    /**
     * @desc Method to store a reference to the the individual widget within
     * the widgets object of the class.
     * @param {string} name a unique named for the widget
     * @param {object} widget a reference to a Gtk Widget
     */
    _widgetSetRef(name, widget) {
        this.widgets[name] = widget;
    }

    /**
     * @desc Method to return a Gtk Widget from the widgets object based on
     * the supplied name.
     * @param {string} name a unique named to request the coresponding widget
     * @returns {object} Gtk widget
     */
    _widgetGetRef(name) {
        return this.widgets[name];
    }

    /**
     * @desc Method to return an array of Gtk Widgets from the widgets
     * object based on the supplied array of unique widget names
     * @param {array} names an array of unique widget names
     * @returns {object} Gtk widget
     */
    _widgetGetRefs(names) {
        return names.map(name => (
            this.widgets[name]
        ));
    }

    /**
     * @desc Method to construct a new Gtk Widget (or WebView) from a supplied
     * object of properties.
     * @param {object} options object of properties to construct the widget
     * @property {string} options.type a string representing the Gtk Widget type
     * @property {object} options.properties an object containing the widget properties
     * @property {string} options.properties.name a string containing a unique name for the widget
     * @property {object} options.connect an object containing the signal functions for the widget
     * @property {(boolean | undefined)} options.hide setting to show or hide the widget
     * @external Gtk.WebKit2 used to construct a webview
     * @external Gtk [All Widget Types]
     * @returns {object} Gtk widget
     */
    _widgetConstruct(options) {
        let widget;
        switch (options.type) {
        case 'WebView':
            widget = new WebKit2.WebView();
            break;
        default:
            widget = new Gtk[options.type];
            break;
        }

        this._widgetSetRef(options.properties.name, widget);

        if (options.properties) {
            this._widgetSetProperties(widget, options.properties);
        }
        if (options.connect) {
            this._widgetSetConnect(widget, options.connect);
        }
        options.hide ? widget.hide() : widget.show();
        return widget;
    }

    /**
     * @desc Method to connect a series of events to the individial widget. The
     * name of each prporty in the connects object must be equal to the name of
     * a coresponding signal that is availbale to the widget passed in. The connect
     * function passes in two arguments. First is the widget that is connected
     * to the signal and the other is the actual event information. The third
     * argument is a reference to this (the application class), that can be used
     * within the connected function to oerform operations on the class.
     * @param {object} widget a reference to a Gtk Widget
     * @param {object} connects an object with the coresponding connect events
     */
    _widgetSetConnect(widget, connects) {
        Object.keys(connects).forEach((key) => {
            widget.connect(key, (wgt, evt) => {
                connects[key](wgt, evt, this);
            });
        });
    }

    /**
     * @desc Method to actviate properties on the passed in Gtk Widget. The prperties
     * can be a key value pair or a function. The prperty (or function) names must
     * match those applicable to the type of Gtk Widget passed in.
     * @param {object} widget a reference to a Gtk Widget
     * @param {object} properties an object with prperties to asign to the widget
     */
    _widgetSetProperties(widget, properties) {
        Object.keys(properties)
            .forEach(property => {
                switch(property) {
                case 'add':
                    widget.add(properties[property]);
                    break;
                case 'attach':
                    const test = widget;
                    properties[property].forEach(child => {
                        const { widget, left, top, width, height } = child;
                        test.attach(widget, left, top, width, height);
                    });
                    break;
                case 'pack_start':
                    widget.pack_start(properties[property]);
                    break;
                case 'pack_end':
                    widget.pack_end(properties[property]);
                    break;
                case 'set_style':
                    const style = new Gtk.CssProvider();
                    style.load_from_data(properties[property]);
                    widget.get_style_context().add_provider(style, 0);
                    break;
                case 'set_title':
                    widget.set_title(properties[property]);
                    break;
                case 'set_subtitle':
                    widget.set_subtitle(properties[property]);
                    break;
                case 'set_width_chars':
                    widget.set_width_chars(properties[property]);
                    break;
                case 'set_size_request':
                    widget.set_size_request(properties[property][0], properties[property][1]);
                    break;
                case 'set_border_width':
                    widget.set_border_width(properties[property]);
                    break;
                case 'set_shadow_type':
                    widget.set_shadow_type(properties[property]);
                    break;
                case 'set_popover':
                    widget.set_popover(properties[property]);
                    break;
                case 'set_menu_model':
                    widget.set_menu_model(properties[property]);
                    break;
                case 'load_uri':
                    widget.load_uri(properties[property]);
                    break;
                case 'run_javascript':
                    widget.run_javascript(
                        properties[property][0],
                        properties[property][1],
                        properties[property][2]
                    );
                    break;
                case 'start':
                    widget.start();
                    break;
                case 'set_image':
                    const image = new Gtk.Image({
                        icon_name: properties[property].icon_name,
                        icon_size: properties[property].icon_size,
                    });
                    widget.set_image(image);
                    break;
                case 'add_named':
                    properties[property].forEach((item) => {
                        Object.keys(item).forEach((key) => {
                            widget.add_named(item[key], key);
                            this._widgetSetRef(key, item[key]);
                        });
                    });
                    break;
                case 'show_all':
                    widget.show_all(properties[property]);
                    break;
                default:
                    widget[property] = properties[property];
                    break;
                }
            });
    }

    /**
     * @desc Method to handle any errors in the class and to display the coresponding
     * dialog to the user.
     * @param {(object || string)} err an error object or string
     */
    _handleError(err) {
        const dialog = (message) => {
            this._createDialog({
                name: 'dialog-error',
                modal: true,
                title: 'Metadata Dialog',
                message,
                show: true,
                button: {
                    label: 'OK',
                    onClick(wgt, evt, self) {
                        wgt.destroy();
                        self._quit();
                    }
                }
            });
        };

        if (typeof err !== 'string' && err.toString().includes('No such file or directory')) {
            dialog('Please install exiftool');
        } else {
            dialog(err);
        }
    }

    /**
     * @desc Method to test the inputed data object to see if it contains data
     * that is formated in JSON as expected fromt the exiftool command. If not
     * then the user must have tried to get metadata on a folder and we then
     * display a dialog stating that we cant get metadata on folders.
     * @param {array} data an array of strings formated in JSON
     * @returns {array} the same data after performing a test of JSON.parse test on it
     */
    _checkForEmpty(data) {
        try {
            if (data.length === 1 ) {
                JSON.parse(data);
                this._showApplication();
            } else {
                this._showApplication();
            }
            return data;
        } catch (err) {
            this._handleError('Unable to provide metadata for folders...');
        }
    }

    /**
     * @desc Method that takes an array of commands. The first being the name of
     * the command line program to run, with the remainder being the required
     * arguments supplied to that command. The method will then run this command
     * and pass the output back to standard out, where it is captured and stored
     * in an array. The results of the command are return in a promise as this
     * is an async operation.
     * @external GLib
     * @external Gio.DataInputStream
     * @external Gio.UnixInputStream
     * @constant GLib.SpawnFlags.SEARCH_PATH
     * @constant GLib.PRIORITY_LOW
     * @param {array} commands an array of argument strings to spawn the command
     * @returns {array} a promised array of metadata for each file passed in
     */
    _runCommand(commands) {
        let promises = [];
        const spawn = (path, command, func) => {
            let res, pid, stdin, stdout, stderr, stream;
            try {
                [res, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(
                    path, command, null, GLib.SpawnFlags.SEARCH_PATH, null);
            } catch (err) {
                this._handleError(err);
            }
            stream = new Gio.DataInputStream({
                base_stream : new Gio.UnixInputStream({ fd : stdout })
            });
            read(stream, func);
        };

        const read = (stream, func) => {
            const callback = (source, res) => {
                let [out, length] = source.read_line_finish(res);
                if (out !== null) {
                    func(out);
                    read(source, func);
                } else {
                    func(out);
                }
            };
            stream.read_line_async(GLib.PRIORITY_LOW, null, callback);
        };

        commands.forEach((command) => {
            let data = '';
            promises.push(new Promise(function(resolve, reject) {
                spawn('./', command, (res) => {
                    !res ? resolve(data) : data += ByteArray.toString(res);
                });
            }));
        });
        return Promise.all(promises);
    }

    /**
     * @desc Method takes an array of JSON strings that contains the raw metadata
     * for the individual files from exiftool and parses that data to remove
     * the SourceFile and ExifTool keys. It then foramts that data into an array of
     * metadat keys and values based on the desc and val keys of the raw ExifTool
     * metadata. The data is then stored in the class varaible metadata.
     * @param {array} metadataArray an array of JSON stringified metadata
     */
    _setMetadata(metadataArray) {
        const allMetadata = [];
        const init = true;
        metadataArray
            .map((metadata) =>(
                JSON.parse(metadata)[0]
            ))
            .forEach((metadata) => {
                const output = {};
                Object.keys(metadata).forEach((key1) => {
                    if (key1 !== 'SourceFile' && key1 !== 'ExifTool') {
                        output[key1] = Object.keys(metadata[key1])
                            .map((key2) => {
                                let keep;
                                if (metadata[key1][key2] && metadata[key1][key2].val) {
                                    keep = [metadata[key1][key2].desc, metadata[key1][key2].val];
                                }
                                return keep;
                            })
                            .filter(pair => pair !== undefined);
                    }
                });
                allMetadata.push(output);
            });
        this.metadata = allMetadata;
        this._updateUI(init);
    }

    /**
     * @desc Method to return the file metadata of relating to the passed in
     * number parameter.
     * @param {number} fileNumber a number indicating which file metadata to return
     */
    _getMetadata(fileNumber) {
        return this.metadata[fileNumber];
    }

    /**
     * @desc Method to increase the filenNumber variable for the class. This
     * variable is used to display the correct metadata window to the user and
     * also used to display to the left and right icons in the headerbar. After
     * the increase the UI is updated to reflect this change.
     */
    _increaseFileNumber() {
        if (this.fileNumber < ARGV.length -1) {
            this.fileNumber++;
            this._updateUI();
        }
    }

    /**
     * @desc Method to decrease the filenNumber variable for the class. This
     * variable is used to display the correct metadata window to the user and
     * also used to display to the left and right icons in the headerbar. After
     * the dencrease the UI is updated to reflect this change.
     */
    _decreaseFileNumber() {
        if (this.fileNumber > 0) {
            this.fileNumber--;
            this._updateUI();
        }

    }

    /**
     * @desc Takes an input of GPS data in degrees, minutes and seconds and
     * returns this value formated into decimal degrees. Decimal degrees are
     * required to format the URL string to display the file location on a map.
     * @param {string} input
     * @returns {string} inputed string formated to decimal degrees
     */
    _parseLatLong(input) {
        if (input.indexOf('N') === -1 && input.indexOf('S') === -1 &&
            input.indexOf('W') === -1 && input.indexOf('E') === -1) {
            return input.split(',');
        }
        let parts = input.split(/[°'"]+/).join(' ').split(/[^\w\S]+/);
        let directions = [];
        let coords = [];
        let dd = 0;
        let pow = 0;
        let i;

        for( i in parts ) {
            // we end on a direction
            if (isNaN(parts[i])) {
                let _float = parseFloat( parts[i] );
                let direction = parts[i];

                if(!isNaN(_float)) {
                    dd += (_float / Math.pow( 60, pow++));
                    direction = parts[i].replace( _float, '' );
                }

                direction = direction[0];
                if(direction === 'S' || direction === 'W')
                    dd *= -1;

                directions[ directions.length ] = direction;
                coords[ coords.length ] = dd;
                dd = pow = 0;

            } else {
                dd += (parseFloat(parts[i]) / Math.pow( 60, pow++));
            }
        }

        if( directions[0] === 'W' || directions[0] === 'E' ) {
            let tmp = coords[0];
            coords[0] = coords[1];
            coords[1] = tmp;
        }
        return coords;
    }

    /**
     * @desc Creates a url string formated for openstreetmap based on a
     * the latitude and longitiude properties supplied in the object gspData
     * @param {object} gpsData
     * @property {string} gpdData.latitude      value in degrees, minutes and seconds
     * @property {string} gpsData.latitudeRef   (either East or West)
     * @property {string} gpsData.longitude     value in degrees, minutes and seconds
     * @property {string} gpsData.longitudeRef  (either North or South)
     * @returns {string} url formated string to display openstreetmap of location
     */
    _getMapUri(gpsData) {
        let gpsLat = `${gpsData.latitude} ${gpsData.latitudeRef}`;
        let gpsLong = `${gpsData.longitude} ${gpsData.longitudeRef}`;
        let location = this._parseLatLong(`${gpsLat} ${gpsLong}`);
        return `https://www.openstreetmap.org/?mlat=${location[0]}&mlon=${location[1]}&zoom=8`;
    }

    /**
     * @desc Uses the supplied mime type to return a string created in the
     * name of a standard Gtk icon_name
     * @param {string} mime a corectly formated mime type
     * @returns {string} Gtk icon_name
     */
    _getFromMIMEType(mime) {
        if(mime.split('/')[0] === 'image') {
            return 'image-x-generic';
        } else if (mime.split('/')[0] === 'audio') {
            return 'audio-x-generic';
        } else if (mime.split('/')[0] === 'audio') {
            return 'video-x-generic';
        } else if (mime.split('/')[0] === 'application') {
            return `application-x-${mime.split('/')[1]}`;
        } else {
            return 'text-x-generic';
        }
    }

    /**
     * @desc Constructs a Gtk.PopWidget from a series of passed in properties,
     * including the widget that is to be shown within the created popwidget.
     * name of a standard Gtk icon_name
     * @param {object} properties
     * @property {string} properties.label      value for the widget label
     * @property {object} properties.widget     a Gtk Widget to insert into this popwidget
     * @returns {object} Gtk.Widget
     */
    _getPopWidget(properties) {
        let grid = this._widgetConstruct({
            type: 'Grid',
            properties: {
                name: 'popwidget-button-grid',
                attach: [{
                    widget: this._widgetConstruct({
                        type: 'Label',
                        properties: {
                            name: 'pop-widet-label',
                            label: properties.label,
                        },
                    }),
                    left: 0,
                    top: 0,
                    width: 1,
                    height: 1,
                },{
                    widget: this._widgetConstruct({
                        type: 'Image',
                        properties: {
                            name: 'pop-widget-image',
                            icon_name: 'pan-down-symbolic',
                            icon_size: Gtk.IconSize.SMALL_TOOLBAR,
                        },
                    }),
                    left: 1,
                    top: 0,
                    width: 1,
                    height: 1,
                }]
            }
        });

        let popWidgetButton = this._widgetConstruct({
            type: 'ToggleButton',
            properties: {
                name: 'headerbar-popwidget-reveal',
                add: grid,
            },
            connect: {
                clicked(widget, evt, self) {
                    if (self._widgetGetRef('headerbar-popwidget-reveal').get_active()) {
                        self._widgetGetRef('headerbar-popwidget').show_all();
                    }
                }
            }
        });

        return this._widgetConstruct({
            type: 'Popover',
            hide: true,
            properties: {
                name: 'headerbar-popwidget',
                border_width: 2,
                set_size_request: [-1, -1],
                relative_to: popWidgetButton,
                add: properties.widget,
            },
            connect: {
                closed(widget, evt, self) {
                    if (self._widgetGetRef('headerbar-popwidget-reveal').get_active()) {
                        self._widgetGetRef('headerbar-popwidget-reveal').set_active(false);
                    }
                }
            }
        });
    }

    /**
     * @desc Method to construct the main application display window. THis Method
     * sets the sizing of the window and the basic layout of the main widgets. The
     * UI is then updated with the final data fron the _updateUI method.
     * @external Gtk.Window
     * @constant this.TITLE
     * @constant Gtk.WindowPosition.CENTER
     * @constant Gtk.StackTransitionType.SLIDE_UP
     * @constant Gtk.IconSize.DIALOG
     * @constant Pango.EllipsizeMode.END
     * @constant Gdk.WindowHints.MAX_SIZE
     * @constant Gdk.WindowHints.MIN_SIZE
     */
    _buildUI() {
        this.window = new Gtk.Window({
  		    application: this.application,
            title: this.TITLE,
            window_position: Gtk.WindowPosition.CENTER,
  	     });

        const defaultIcon = this._getFromMIMEType('text-x-generic');
        const metadataStack = this._widgetConstruct({
            type: 'Stack',
            properties: {
                name: 'metadata-stack',
                vexpand: true,
                hexpand: true,
                margin_top: 5,
                transition_type: Gtk.StackTransitionType.SLIDE_UP,
                transition_duration: 700,
            },
        });

        let box = this._widgetConstruct({
            type: 'Box',
            properties: {
                name: 'icon-box',
                valign: true,
            }
        });

        let separator = this._widgetConstruct({
            type: 'Separator',
            properties: {
                margin_bottom: 10,
                margin_top: 2,
                name: 'file-separator',
            },
        });

        box.pack_start(this._widgetConstruct({
            type: 'Image',
            properties: {
                name: 'file-icon',
                margin_bottom: 10,
                margin_top: 5,
                halign: true,
                icon_name: defaultIcon,
                icon_size: Gtk.IconSize.DIALOG,
            },
        }), true, true, 10);

        box.pack_end(this._widgetConstruct({
            type: 'Label',
            properties: {
                name: 'file-label',
                label: '', // will be set dynamically during updateUI
                valign: true,
                halign: true,
                margin_top: 10,
                ellipsize: Pango.EllipsizeMode.END,
                max_width_chars: 32,
                tooltip_markup: ARGV[0],
                set_style: ' label { font-size: 1.1em; }',
            },
        }), true, true, 10);

        const uppergrid = this._widgetConstruct({
            type: 'Grid',
            properties: {
                name: 'upper-box',
                vexpand: true,
                hexpand: true,
                attach: [
                    { widget: box,           left: 0, top: 0, width: 1, height: 1 },
                    { widget: separator,     left: 0, top: 1, width: 1, height: 1 },
                    { widget: metadataStack, left: 0, top: 2, width: 1, height: 1 }
                ]
            },
        });

        this.window.set_geometry_hints(null, new Gdk.Geometry({
            max_height: 1200,
            min_height: 1000,
            min_width: 300,
            max_width: 300
        }), (Gdk.WindowHints.MAX_SIZE && Gdk.WindowHints.MIN_SIZE));
        this.window.set_border_width(12);
        this.window.add(uppergrid);
        this.window.set_resizable(false);
        this.window.set_titlebar(this._getTitleBar());
        this.window.set_icon_name('application-x-executable');
    }

    /**
     * @desc Constructs a Gtk.Headerbar from a series widgets.
     * @returns {object} Gtk.HeaderBar widget to insert into the UI
     */
    _getTitleBar() {
        const next = this._widgetConstruct({
            type: 'Button',
            hide: ARGV.length === 1 ? true : false, // display button only if multiple files selected
            properties: {
                name: 'headerbar-next',
                set_image: {
                    icon_name: 'go-next-rtl-symbolic',
                    icon_size: Gtk.IconSize.SMALL_TOOLBAR,
                },
                tooltip_markup: 'Go the previous file metadata page',
            },
            connect: {
                clicked(widget, evt, self) {
                    self._decreaseFileNumber();
                }
            }
        });

        const previous = this._widgetConstruct({
            type: 'Button',
            hide: ARGV.length ===1 ? true : false, // display button only if multiple files selected
            properties: {
                name: 'headerbar-prev',
                set_image: {
                    icon_name: 'go-previous-rtl-symbolic',
                    icon_size: Gtk.IconSize.SMALL_TOOLBAR,
                },
                tooltip_markup: 'Go the next file metadata page',
            },
            connect: {
                clicked(widget, evt, self) {
                    self._increaseFileNumber();
                }
            }
        });

        this._getPopWidget({
            label: 'Group',
            widget: this._widgetConstruct({
                type: 'Grid',
                properties: {
                    name: 'popwidget-grid',
                    row_spacing: 1,
                    halign: Gtk.Align.CENTER,
                    set_border_width: 15,
                },
            })
        });

        const reveal = this._widgetGetRef('headerbar-popwidget-reveal');
        const pack_start = this._widgetConstruct({
            type: 'Grid',
            properties: {
                name: 'headerbar-pack-start',
                attach: [
                    { widget: reveal,   left: 0, top: 0, width: 1, height: 1 },
                    { widget: next,     left: 1, top: 0, width: 1, height: 1 },
                    { widget: previous, left: 2, top: 0, width: 1, height: 1 }
                ]
            }
        });

        const pack_end = this._widgetConstruct({
            type: 'MenuButton',
            properties: {
                name: 'headerbar-packend-button',
                set_image: {
                    icon_name: 'open-menu-symbolic',
                    icon_size: Gtk.IconSize.SMALL_TOOLBAR,
                },
                set_popover: this._widgetConstruct({
                    type: 'Popover',
                    properties: {
                        name: 'headerbar-packend-popwidget',
                        set_size_request: [-1, -1],
                    }
                }),
                set_menu_model: this._getMenu(),
            },
        });

        return this._widgetConstruct({
            type: 'HeaderBar',
            properties: {
                name: 'headerbar',
                set_title: 'GetMetadata',
                set_subtitle: `${ARGV.length} files selected` ,
                show_close_button: true,
                pack_end,
                pack_start,
            },
        });
    }

    /**
     * @desc Method to reconstruct the main application display window based on
     * the current file metadata that is obtained from the _getMetadata method
     * using the current fileNumber stored in the class fileNumber variable.
     * @param {boolean} init a flag to indicate if it is the first render of the UI
     * @constant Gtk.IconSize.DIALOG
     * @constant Pango.EllipsizeMode.END
     * @constant Gtk.ShadowType.NONE
     */
    _updateUI(init) {
        const popwidgetGrid = this._widgetGetRef('popwidget-grid');
        const metadataStack = this._widgetGetRef('metadata-stack');
        const filelabel = this._widgetGetRef('file-label');
        const fileicon = this._widgetGetRef('file-icon');
        const output = this._getMetadata(this.fileNumber);

        let hasMap = false;
        let mapUri;

        // update the UI header with the correct icon type and file name
        output.File.forEach((item) => {
            if (item[0] === 'MIME Type') {
                fileicon.set_from_icon_name(this._getFromMIMEType(item[1]), Gtk.IconSize.DIALOG);
            } else if (item[0] === 'File Name') {
                filelabel.set_text(item[1]);
            }
        });

        // if we are re-rendering the UI then first destroy all current widgets
        if (!init) {
            [metadataStack, popwidgetGrid].forEach(widget => {
                widget.get_children()
                    .forEach(child => {
                        child.destroy();
                    });
            });
        }

        Object.keys(output).forEach((key, i) => {
            let children = [];
            if (key === 'EXIF') {
                const gpsData = {};
                output[key].forEach((pair) => {
                    if (pair[0] === 'GPS Latitude') {
                        hasMap = true;
                        gpsData.latitude = pair[1].replace('deg', '\u00b0').replace(/\s+/g, '');
                    }

                    if (pair[0] === 'GPS Latitude Ref') {
                        gpsData.latitudeRef = pair[1].charAt(0);
                    }

                    if (pair[0] === 'GPS Longitude') {
                        gpsData.longitude = pair[1].replace('deg', '\u00b0').replace(/\s+/g, '');
                    }

                    if (pair[0] === 'GPS Longitude Ref') {
                        gpsData.longitudeRef = pair[1].charAt(0);
                    }
                });
                mapUri = this._getMapUri(gpsData);
            }

            output[key].forEach((item, i) => {
                const isEditable = () => {
                    if (key === 'File') {
                        return false;
                    }
                    return true;
                };

                if (item) {
                    children.push({
                        widget: this._widgetConstruct({
                            type: 'Label',
                            properties: {
                                name: `metadata-${key}-${i}`,
                                label: item[0],
                                xalign: 1, // align right
                                tooltip_markup: item[0],
                                max_width_chars: 22,
                                set_width_chars: 22,
                                ellipsize: Pango.EllipsizeMode.END,
                            },
                        }),
                        left: 0,
                        top: (key === 'File') ? i + 2 : i, // make allowance for file icon and separator
                        width: 1,
                        height: 1,
                    });

                    children.push({
                        widget: this._widgetConstruct({
                            type: 'Entry',
                            properties: {
                                name: `metadata-${key}-${i + 1}`,
                                text: item[1].toString(), // stored as number in array
                                set_width_chars: 22,
                                editable: isEditable(),
                            },
                        }),
                        left: 1,
                        top: (key === 'File') ? i + 2 : i, // make allowance for file icon and separator
                        width: 1,
                        height: 1,
                    });
                }
            });

            if ((children.length / 2) > 21) {
                this._widgetSetProperties(metadataStack, {
                    add_named: [{
                        [`metadata-${key}`]: this._widgetConstruct({
                            type: 'ScrolledWindow',
                            properties: {
                                name: `metadata-${key}`,
                                set_shadow_type:  Gtk.ShadowType.NONE,
                                add:  this._widgetConstruct({
                                    type: 'Grid',
                                    properties: {
                                        name: `metadata-${key}-grid`,
                                        row_spacing: 4,
                                        column_spacing: 10,
                                        attach: children,
                                    },
                                })
                            }
                        })
                    }]
                });
            } else {
                this._widgetSetProperties(metadataStack, {
                    add_named: [{
                        [`metadata-${key}`]: this._widgetConstruct({
                            type: 'Grid',
                            properties: {
                                name: `metadata-${key}`,
                                row_spacing: 4,
                                column_spacing: 10,
                                attach: children,
                            },
                        })
                    }]
                });
            }

            popwidgetGrid.attach(
                this._widgetConstruct({
                    type: 'Button',
                    properties: {
                        name: `popopen-${key}`,
                        label: `${key} ...`,
                        set_size_request: [160, -1],
                        tooltip_markup: `View the ${key} metadata`,
                    },
                    connect: {
                        clicked(widget, evt, self) {
                            const widgetRefs = self._widgetGetRefs([
                                'headerbar-popwidget', 'metadata-stack', `metadata-${key}`,
                            ]);
                            widgetRefs[0].hide();
                            widgetRefs[1].set_visible_child(widgetRefs[2]);
                        }
                    }
                }),
                0, i, 1, 1);
        });

        if (hasMap) {
            let top = Object.keys(output).length; // number of menu items already
            const run_javascript = [`window.addEventListener("load", function() {
                var elem = document.getElementsByTagName("header")[0];
                elem.style.display = "none";
                var content = document.getElementById("content");
                content.style.top = "0px";
                var sidebar = document.getElementById("sidebar");
                sidebar.style.display = "none";})`, null, null];

            this._widgetSetProperties(metadataStack, {
                add_named: [{
                    ['metadata-map-grid']: this._widgetConstruct({
                        type: 'Grid',
                        properties: {
                            name: 'metadata-map-grid',
                            attach: [{
                                widget: this._widgetConstruct({
                                    type: 'WebView',
                                    hide: true,
                                    properties: {
                                        vexpand: true,
                                        hexpand: true,
                                        load_uri: mapUri,
                                        name: 'metadata-map-webview',
                                        run_javascript,
                                    },
                                    connect: {
                                        load_changed(widget, evt, self) {
                                            if (evt === 3) {
                                                const spinner = self._widgetGetRef('metadata-map-spinner');
                                                spinner.hide();
                                                widget.show();
                                            }
                                        }
                                    }
                                }),
                                left: 0,
                                top: 0,
                                width: 1,
                                height: 1,
                            },{
                                widget: this._widgetConstruct({
                                    type: 'Spinner',
                                    properties: {
                                        vexpand: true,
                                        hexpand: true,
                                        start: true,
                                        name: 'metadata-map-spinner',
                                    },
                                }),
                                left: 0,
                                top: 1,
                                width: 1,
                                height: 1,
                            }]
                        }
                    })
                }]
            });

            popwidgetGrid.attach(
                this._widgetConstruct({
                    type: 'Button',
                    properties: {
                        label: 'Map ...',
                        name: 'popopen-map',
                        set_size_request: [160, -1],
                        tooltip_markup: 'View the location on a map',
                    },
                    connect: {
                        clicked(widget, evt, self) {
                            const widgetRefs = self._widgetGetRefs([
                                'headerbar-popwidget', 'metadata-stack', 'metadata-map-grid'
                            ]);
                            widgetRefs[0].hide();
                            widgetRefs[1].set_visible_child(widgetRefs[2]);
                        }
                    }
                }),
                0, top, 1, 1);
        }
    }

    /**
     * @desc Construct and show the main application menus
     * @external Gio.Menu
     * @external Gio.SimpleAction
     * @return {object} Gtk.Menu to display in the UI
     */
    _getMenu() {
        let menu = new Gio.Menu();
        let section = new Gio.Menu();

        section.append('About', 'app.about');
        section.append('Quit', 'app.quit');
        menu.append_section(null, section);

        let actionAbout = new Gio.SimpleAction ({ name: 'about' });
        actionAbout.connect('activate', () => {
            this._showAbout();
        });
        this.application.add_action(actionAbout);

        let actionQuit = new Gio.SimpleAction ({ name: 'quit' });
        actionQuit.connect('activate', () => {
            this._quit();
        });
        this.application.add_action(actionQuit);
        return menu;
    }

    /**
     * @desc Construct and show the Gtk standard about dialog that provides the
     * user with details on the software version, owner licence etc...
     * @constant Gtk.License.GPL_3_0_ONLY
     * @constant this.VERSION
     */
    _showAbout() {
        this._widgetConstruct({
            type: 'AboutDialog',
            properties: {
                program_name: 'Nautilus GetMetadata',
                version: this.VERSION,
                authors: ['Jason Webb'],
                logo_icon_name: 'application-x-executable',
                wrap_lisence: true,
                license_type: Gtk.License.GPL_3_0_ONLY,
                comments: 'This script would not be possible without the years of hard work put in by Phil Harvey on his excellent program \'ExifTool\'.',
            }
        });
    }

    /**
     * @desc Construct the standard user menus that are displayed in the
     * headerbar.
     * @external Gio.Menu
     * @external Gio.SimpleAction
     */
    _initMenus() {
        let menu = new Gio.Menu();
        menu.append('About', 'app.about');
        menu.append('Quit','app.quit');
        this.application.set_app_menu(menu);

        let aboutAction = new Gio.SimpleAction ({ name: 'about' });
        aboutAction.connect('activate', () => { this._showAbout(); });
        this.application.add_action(aboutAction);

        let quitAction = new Gio.SimpleAction ({ name: 'quit' });
        quitAction.connect('activate', () => { this._quit(); });
        this.application.add_action(quitAction);
    }

    /**
     * @desc Construct and show a Gtk Dialog
     * @param {object} options used to construct individual dialogs
     * @property {string} options.name
     * @property {boolean} options.modal
     * @property {string} options.message
     * @property {object} options.button
     * @property {string} options.button.label
     * @property {function} options.button.onClick
     */
    _createDialog(options) {
        const dialog = this._widgetConstruct({
            type: 'Dialog',
            properties: {
                name: options.name,
                set_title: options.title || false,
                modal: options.modal || false,
                set_border_width: 6,
                set_size_request: [ 340, 100,],
                show_all: true,
            }
        });

        const dialogLabel = this._widgetConstruct({
            type: 'Label',
            properties: {
                name: `label-${options.name}`,
                label: options.message,
            }
        });

        const dialogButton = this._widgetConstruct({
            type: 'Button',
            properties: {
                name: `button-${options.name}`,
                label: options.button.label,
            },
            connect: {
                clicked(wgt, evt, self) {
                    options.button.onClick(wgt, evt, self);
                }
            }
        });

        const contentArea = dialog.get_content_area();
        const actionArea = dialog.get_action_area();
        contentArea.add(dialogLabel);
        actionArea.add(dialogButton);
    }
}

//Run the application
let APP = new Application();
APP.run(ARGV);
