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
var arcgisRest = require('../lib/arcgis-rest.js');
arcgisRest.config = {};

exports.testHelperFunctions = {
    intersect: function (test) {
        test.deepEqual(arcgisRest.intersect(['12', '2', 'hi'], ['2', '3', 'boo']), ['2']);
        test.done();
    },
    logger: function (test) {
        test.equal(arcgisRest.logger('info', 'this is a message'), '[info] this is a message\n');
        test.done();
    },
    mkdirSync: function (test) {
        var fs = require('fs');
        test.equals(arcgisRest.mkdirSync('test'), false, 'Directory test does not exists');
        test.equals(arcgisRest.mkdirSync('boo'), true, 'Directory boo could not be created');
        fs.rmdirSync('boo');
        test.done();
    },
    mkdirpSync: function (test) {
        var fs = require('fs');
        test.equals(arcgisRest.mkdirpSync('boo/foo'), true, 'Directory boo/foo could not be created');
        fs.rmdirSync('boo/foo');
        fs.rmdirSync('boo');
        test.done();
    }
};
exports.testArcGisRest = {
    setUp: function (callback) {
        arcgisRest.config.options = {
            socksPort: 9050, // Tor port for local tor instance
            hostname: 'server.arcgisonline.com', //uri for the arcGIS server; omit http or https
            port: 80
        };
        callback();
    },
    tearDown: function (callback) {
        //empty the config
        arcgisRest.config = {
            "options": {}
        };
        callback();
    },
    get: function (test) {
        arcgisRest.get('/ArcGIS/rest/services/?f=json&pretty=true', '', function (result) {
            test.equals(result.currentVersion, '10.2', 'arcgis server is no longer running version 10.2');
            test.done();
        });
    },
    post: function (test) {
        arcgisRest.post('/ArcGIS/rest/services', {"f": "json", "pretty": "true"}, '', function (result) {
            test.equals(result.currentVersion, '10.2', 'arcgis server is no longer running version 10.2');
            test.done();
        });
    },
    getIdfield: function (test) {
        arcgisRest.getIdfield({"name": "Demographics/USA_Average_Household_Size"}, {"id": 1},
        function (result) {
            test.equals(result, 'OBJECTID', 'Demographics/USA_Average_Household_Size does not have OBJECTID as ID field');
            test.done();
        });
    },
    getObjectIds: function (test) {
        arcgisRest.getObjectIds({"name": "Demographics/USA_Average_Household_Size"}, {"id": 4},
        function (result) {
            test.equals(result.objectIds.length, '52', 'Demographics/USA_Average_Household_Size does not have 52 objects for States');
            test.done();
        });
    },
    getLists: function (test) {
        arcgisRest.getLists(
                function (result) {
                    test.equals(result.services.length, '12', 'server.arcgisonline.com does not have 12 services');
                    test.equals(result.folders.length, '7', 'server.arcgisonline.com does not have 7 folders');
                    test.done();
                });
    },
    getParseResult: function (test) {
        arcgisRest.parseResult(0,1,{"name": "Demographics/USA_Average_Household_Size"}, {"id": 4},'OBJECTID', 'esriGeometryPolygon',
                function (result) {
                    test.equals(result.error.code, 400, 'server.arcgisonline.com did return features while an error was expected');
                    test.done();
                });
    }, 
    postParseResult: function (test) {
        arcgisRest.parseResult(0,1,{"name": "Demographics/USA_Average_Household_Size"}, {"id": 4},{"objectIdFieldName":"OBJECTID","objectIds":[1]}, 'esriGeometryPolygon',
                function (result) {
                    test.equals(result.features.length, 1, 'server.arcgisonline.com did not return feature');
                    test.done();
                });
    }
};

