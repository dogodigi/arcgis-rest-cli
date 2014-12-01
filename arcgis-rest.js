/**
 *  Copyright (c) 2014 Milo van der Linden (milo@dogodigi.net)
 * 
 *  This file is part of arcgis-rest-cli
 *  
 *  arcgis-rest-cli is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  arcgis-rest-cli is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with arcgis-rest-cli. If not, see <http://www.gnu.org/licenses/>.
 *
 */
'use strict';
var arcgisRest = require('./lib/arcgis-rest.js');

/**
 * Settings, check to see if a settings file is given
 */
process.argv.forEach(function (val, index, array) {
    if (index === 2) {
        arcgisRest.setConfig(val);
    }
});

/**
 * _main_ process
 */
arcgisRest.run();
