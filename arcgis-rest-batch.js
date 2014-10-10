/**
 *  Copyright (c) 2014 Milo van der Linden (milo@dogodigi.net)
 * 
 *  This file is part of arcgisminer
 *  
 *  arcgisminer is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  arcgisminer is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with arcgisminer. If not, see <http://www.gnu.org/licenses/>.
 *
 */
'use strict';
var fs = require('fs');
var ArcGIS = require('terraformer-arcgis-parser');
var spawn = require('child_process').spawn;
var path = require('path');
var querystring = require('querystring');
var config;

/**
 * Settings, check to see if a settings file is given
 */
process.argv.forEach(function (val, index, array) {
    if (index === 2) {
        config = require(val);
    }
});
if (!config) {
    config = require('./config/config.sample.js');
}
if(!config.outSr){
    config.outSr = "4326";
}
var http;
if (config.useTor) {
    http = require('socks5-http-client');
} else {
    http = require('http');
}

/* finds the intersection of 
 * two arrays in a simple fashion.  
 *
 * PARAMS
 *  a - first array, must already be sorted
 *  b - second array, must already be sorted
 *
 * NOTES
 *
 *  Should have O(n) operations, where n is 
 *    n = MIN(a.length(), b.length())
 */
function intersect(a, b) {
    var intersection = [];
    for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < b.length; j++) {
            if (a[i] === b[j]) {
                intersection.push(a[i]);
            }
        }
    }
    return intersection;
}

/**
 * function: logger
 *
 * Simple logger function, can be enhanced in the future
 * @param {type} type
 * @param {type} message
 * @returns {undefined}
 */
function logger(type, message) {
    if (!config.debug && type !== 'debug') {
        process.stdout.write('[' + type + ']  ' + message + "\n");
    } else if (config.debug) {
        process.stdout.write('[' + type + ']  ' + message + "\n");
    }
}

/**
 * function: mkdirSync
 *
 * Try to create a directory from a path object
 *
 * @param {path} path
 */
function mkdirSync(path) {
    try {
        fs.mkdirSync(path);
    } catch (e) {
        if (e.code !== 'EEXIST') {
            throw e;
        }
    }
}

/**
 * function: mkdirpSync
 *
 * @param {string} dirpath
 */
function mkdirpSync(dirpath) {
    //var outputFilename = outputFilename.replace(/\//g, '_');
    var parts = dirpath.split(path.sep);
    for (var i = 1; i <= parts.length; i++) {
        mkdirSync(path.join.apply(null, parts.slice(0, i)));
    }
}

/**
 * function: postRetrieve
 *
 * This function tries to parse a url as an arcGIS server rest-interface, 
 * 
 * @param {string} url
 * @param {object} postdata a json object to post
 * @param {string} type
 * @param {function} callback
 * @returns {object} JSON object
 */
function postRetrieve(url, postdata, type, callback) {
    var options = config.options;
    options.path = url;
    var postdataString = querystring.stringify(postdata);
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postdataString)
    };

    var req = http.request(options, function (res, err) {
        var version;
        var result = "";
        res.setEncoding('utf8');
        version = process.version.substr(1).split('.');
        if (version[0] > 0 || version[1] > 8) {
            res.on('readable', function () {
                result += res.read();
            });
        } else {
            res.on('data', function (chunk) {
                result += chunk;
            });
        }
        res.on('end', function () {
            if (res.statusCode === 200) {
                var result2 = result.replace(/NaN/g, 'null');
                try {
                    result = JSON.parse(result2);
                    if (type === '') {
                        //return all
                        callback(result);
                    } else {
                        if (result[type]) {
                            callback(result[type]);
                        } else {
                            callback(result);
                        }
                    }
                } catch (e) {
                    logger('error', '"' + e.message + '"');
                    callback();
                }
            } else {
                callback();
            }
        });
    });
    req.write(postdataString);
    req.end();
    req.on('error', function (e) {
        logger('problem with request: ' + e.message);
        logger(options.path);
        callback();
    });
}

/**
 * function: retrieve
 *
 * This function tries to parse a url as an arcGIS server rest-interface, 
 * 
 * @param {string} urlpath
 * @param {string} type
 * @param {function} callback
 * @returns {object} JSON object
 */
function retrieve(urlpath, type, callback) {
    var options = config.options;
    options.path = urlpath;
    var req = http.get(options, function (res, err) {
        var version;
        var result = "";
        res.setEncoding('utf8');
        version = process.version.substr(1).split('.');
        if (version[0] > 0 || version[1] > 8) {
            res.on('readable', function () {
                result += res.read();
            });
        } else {
            res.on('data', function (chunk) {
                result += chunk;
            });
        }
        res.on('end', function () {
            if (res.statusCode === 200) {
                var result2 = result.replace(/NaN/g, 'null');
                try {
                    result = JSON.parse(result2);
                    if (type === '') {
                        //return all
                        callback(result);
                    } else {
                        if (result[type]) {
                            callback(result[type]);
                        } else {
                            callback(result);
                        }
                    }
                } catch (e) {
                    logger('error', '"' + e.message + '"');
                    callback();
                }
            } else {
                callback();
            }
        });
    });
    req.on('error', function (e) {
        logger('problem with request: ' + e.message);
        logger(options.path);
        callback();
    });
}
function getObjectIds(service, layer, callback) {
    var postdata = {
        "where": "1=1",
        "returnIdsOnly": "true",
        "f": "json"
    };
    var objectidUrl = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/query';
    //http://mapservices.prorail.nl/ArcGIS/rest/services/BBK_spoorobjecten/MapServer/36/query?where=1%3D1&returnIdsOnly=true&f=json
    postRetrieve(objectidUrl, postdata, '', function (result) {
        if (result) {
            callback(result);
        } else {
            callback([]);
        }
    });
}
function getIdfield(service, layer, callback) {
    var fieldUrl = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/?f=json';
    var idcolumn = 'OBJECTID';
    retrieve(fieldUrl, '', function (result) {
        if (result) {
            result.fields.forEach(function (field) {
                if (field.type && field.type === 'esriFieldTypeOID') {
                    idcolumn = field.name;
                }
            });
        }
        callback(idcolumn);
    });

}
function shspawn(command, workingdir) {
    spawn('sh', ['-c', command], {"stdio": "inherit", "cwd": workingdir});
}

function createShape(service, layer, geometryType){
    logger('debug', 'finished processing layer ' + layer.name);
    
    var format = 'POINT';
    switch (geometryType) {
        case "esriGeometryPolygon":
            format = 'POLYGON';
            break;
        case "esriGeometryPolyline":
            format = 'LINESTRING';
            break;
        case "esriGeometryPoint":
            format = 'POINT';
            break;
    }
    logger('info', 'merge.sh ' +  config.outputdir + '/' + service.name + '/' + layer.id + '_' + layer.name.replace(/([^a-z0-9]+)/gi, '_') + ' ' + format);
    shspawn(process.cwd() + '/merge.sh ' + layer.id + '_' + layer.name.replace(/([^a-z0-9]+)/gi, '_') + ' ' + format, process.cwd() + '/' + config.outputdir + '/' + service.name + '/');
}
/**
 * function: parseResult
 *
 * Creates a arcGIS server query, transforms the result to geoJSON
 * and stores it as a file. Is used recursive until fmax is reached
 *
 * @param {integer} fmin OBJECTID to start parsing from. Defaults to 0, can be set as setting
 * @param {integer} fmax highest OBJECTID
 * @param {object} service JSON object the service the layer belongs to
 * @param {object} layer JSON object the layer to query
 * @param {string} idcolumn
 * @param {string} geometryType
 */
function parseResult(fmin, fmax, service, layer, idcolumn, geometryType) {
    var top;
    //vars for the request
    if (fmax < (fmin + 1000)) {
        top = fmax + 1;
    } else {
        top = fmin + 1001;
    }
    //vars for the filename
    var lower = fmin + 1;
    var upper = top - 1;
    if (upper > fmax) {
        upper = fmax;
    }
    //construct request where clause
    if (typeof idcolumn === 'string') {
        var whereclause = idcolumn + '+%3E+' + fmin + '+AND+' + idcolumn + '+%3C+' + top;
        var urlpath = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/query?where=' + whereclause
                + '&returnGeometry=true&outSR=' + config.outSr+ '&outFields=*&f=pjson';
        retrieve(urlpath, '', function (result6) {
            var collection = {"type": "FeatureCollection", "features": []};
            if (result6 && result6.features) {
                result6.features.forEach(function (feature) {
                    var outfeat = ArcGIS.parse(feature);
                    collection.features.push(outfeat);
                });
                //split the service.name on the slash to create subdirs
                mkdirpSync(config.outputdir + '/' + service.name);
                var outputFilename = config.outputdir + '/' + service.name + '/' + layer.id + '_' + layer.name.replace(/([^a-z0-9]+)/gi, '_') + '_' + lower + '_' + upper + '.geojson';
                fs.writeFile(outputFilename, JSON.stringify(collection, null, 2), function (err) {
                    if (err) {
                        logger(err);
                    } else {
                        logger('info', "JSON saved to " + outputFilename);
                        var newfmin = fmin + 1000;
                        if (newfmin < (fmax + 1)) {
                            //repeat, now with offset for next 1000 features
                            parseResult(newfmin, fmax, service, layer, idcolumn, geometryType);
                        } else {
                            logger('debug', 'finished processing layer ' + layer.name);
                            createShape(service, layer, geometryType);
                        }
                    }
                });
            } else {
                logger('error', 'parseResult(1) - Could not parse ' + config.options.hostname + urlpath);
            }
        });
    } else if (idcolumn.objectIdFieldName) {
        //do a post, with the id's
        var urlpath = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/query';

        var postdata = {
            "returnGeometry": "true",
            "outSR": config.outSr,
            "outFields": "*",
            "f": "json"

        };
        postdata.objectIds = idcolumn.objectIds.slice(fmin, top).join(',');
        postRetrieve(urlpath, postdata, '', function (result6) {
            var collection = {"type": "FeatureCollection", "features": []};
            if (result6 && result6.features) {
                result6.features.forEach(function (feature) {
                    var outfeat = ArcGIS.parse(feature);
                    collection.features.push(outfeat);
                });
                //split the service.name on the slash to create subdirs
                mkdirpSync(config.outputdir + '/' + service.name);
                var outputFilename = config.outputdir + '/' + service.name + '/' + layer.id + '_' + layer.name.replace(/([^a-z0-9]+)/gi, '_') + '_' + lower + '_' + upper + '.geojson';
                fs.writeFile(outputFilename, JSON.stringify(collection, null, 2), function (err) {
                    if (err) {
                        logger(err);
                    } else {
                        logger('info', "JSON saved to " + outputFilename);
                        var newfmin = fmin + 1000;
                        if (newfmin < (fmax + 1)) {
                            //repeat, now with offset for next 1000 features
                            parseResult(newfmin, fmax, service, layer, idcolumn, geometryType);
                        } else {
                            createShape(service, layer, geometrytype);
                        }
                    }
                });
            } else {
                logger('error', 'parseResult(2) - Could not parse ' + config.options.hostname + urlpath);
            }
        });
    }
}

/**
 * Process Lists
 * @param {string} callback
 * @return {array} result
 */
function processLists(callback) {
    retrieve(config.arcGISRootQuery, '', function (listresult) {
        if (listresult) {
            var resultlist = {
                "services": [],
                "folders": []
            };
            if (listresult.folders) {
                if (config.useFolderList) {
                    //check to see if folderlist is in the folderslist returned by the server
                    resultlist.folders = intersect(config.folderList, listresult.folders);
                } else {
                    //process all folders
                    resultlist.folders = listresult.folders;
                }
            } else {
                logger('info', 'No folders for ' + config.options.hostname + '' + config.arcGISRootQuery);
            }
            //loop through the services and wrap up the MapServers
            if (listresult.services) {
                var newServicesList = [];
                for (var i = 0; i < listresult.services.length; i++) {
                    if (listresult.services[i].type === "MapServer") {
                        newServicesList.push(listresult.services[i].name);
                    }
                }
                if (config.useRootServices) {
                    resultlist.services = newServicesList;
                    if (config.useServicesList) {
                        //check to see if folderlist is in the folderslist returned by the server
                        resultlist.services = intersect(config.servicesList, newServicesList);
                    } else {
                        //process all folders
                        resultlist.services = newServicesList;
                    }
                }
            } else {
                logger('info', 'No services for ' + config.options.hostname + '' + config.arcGISRootQuery);
            }
            callback(resultlist);
        } else {
            logger('info', 'Incorrect response for ' + config.options.hostname + '' + config.arcGISRootQuery);
            callback();
        }
    });
}

function processServices(subset, callback) {
    subset.forEach(function (item) {
        //process services
        retrieve('/ArcGIS/rest/services/' + item + '?f=json&pretty=true', 'services', function (result2) {
            if (result2) {
                result2.forEach(function (service) {
                    //do a capabilities to see if we can query
                    var yesContinue = false;
                    if (!config.useServicesList) {
                        yesContinue = true;
                    } else if (config.useServicesList && config.servicesList.indexOf(service.name) > -1) {
                        yesContinue = true;
                    }
                    if (yesContinue) {
                        //logger('match!');
                        processLayers(service);
                    }
                });
            } else {
                logger('error', 'processServices - Could not retrieve layers for ' + config.options.hostname + '' + urlpath);
                callback();
            }
        });
    });
}
function processLayers(service, callback) {
    if (service.type && service.type === 'MapServer') {
        retrieve('/ArcGIS/rest/services/' + service.name + '/MapServer?f=json&pretty=true', 'layers', function (result3) {
            if (result3) {
                result3.forEach(function (layer) {
                    if (!layer.subLayerIds) {
                        //do a capabilities to see if we can query
                        var yesContinue = false;
                        if (!config.useLayerList) {
                            yesContinue = true;
                        } else if (config.useLayerList && config.layersList.indexOf(layer.id) > -1) {
                            yesContinue = true;
                        }
                        if (yesContinue) {
                            logger('debug', service.name + ' ' + layer.name + ' (' + layer.id + ') - PARSING');
                            var urlpath = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '?f=json&pretty=true';
                            retrieve(urlpath, '', function (result4) {
                                if (result4) {
                                    var isQuery = false;

                                    if (result4.capabilities) {
                                        isQuery = result4.capabilities.split(',').indexOf('Query') > -1;
                                    }
                                    var geometryType = result4.geometryType;
                                    if (isQuery) {
                                        var urlpath = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/query?where=1%3D1&returnCountOnly=true&f=json';
                                        retrieve(urlpath, '', function (result5) {
                                            if (result5 && result5.count) {
                                                if (config.testOnly) {
                                                    logger('info', 'service "' + service.name + '" layer:"' + layer.name + '" id:' + layer.id + ' count: ' + result5.count);
                                                } else {
                                                    //retrieve to get ID column
                                                    logger('info', 'service "' + service.name + '" layer:"' + layer.name + '" id:' + layer.id + ' count: ' + result5.count);
                                                    if(!config.useObjectIDs){
                                                        parseResult(config.offsetStart, result5.count, service, layer, 'OBJECTID', geometryType);
                                                    } else {
                                                        getObjectIds(service, layer, function (objectIdInfo) {
                                                            parseResult(config.offsetStart, result5.count, service, layer, objectIdInfo, geometryType);
                                                        });
                                                    }
                                                }
                                            } else {
                                                logger('debug', service.name + '/' + layer.name + ' (' + layer.id + ') returned no feature count, not processed.');
                                            }
                                        });
                                    }
                                } else {
                                    logger('error', 'processLayers - Could not get count for ' + service.name + '/' + layer.name + ' (' + layer.id + ')');
                                }
                            });
                        }
                    }
                });
            } else {
                logger('error', 'Could not get layers for ' + service.name);
                callback();
            }
        });
    }
}
/**
 * _main_ process
 */
processLists(function (result) {
    if (result) {
        if (result.folders.length > 0) {
            processServices(result.folders, function (folderfinal) {

            });
        }
        if (result.services.length > 0) {
            result.services.forEach(function (service) {
                processLayers({"name": service, "type": "MapServer"}, function (servicesfinal) {

                });
            });
        }
    }
});
