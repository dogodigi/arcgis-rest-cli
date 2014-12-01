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
var fs = require('fs');
var ArcGIS = require('terraformer-arcgis-parser');
var spawn = require('child_process').spawn;
var path = require('path');
var querystring = require('querystring');
var config;
exports.setConfig = function (val) {
    this.config = require(val);
};
exports.getConfig = function () {
    if (!this.config) {
        this.setConfig('../config/config.sample.js');
    } 
    return this.config;
};
/** 
 * finds the intersection of 
 * two arrays in a simple fashion.  
 * Should have O(n) operations, where n is 
 * n = MIN(a.length(), b.length())
 * 
 * @param {array} a first array, must already be sorted
 * @param {array} b second array, must already be sorted
 * @returns {array} intersection
 */
exports.intersect = function (a, b) {
    var intersection = [];
    for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < b.length; j++) {
            if (a[i] === b[j]) {
                intersection.push(a[i]);
            }
        }
    }
    return intersection;
};

exports.shspawn = function (command, workingdir) {
    spawn('sh', ['-c', command], {"stdio": "inherit", "cwd": workingdir});
};

exports.createShape = function (service, layer, geometryType) {
    this.logger('debug', 'finished processing layer ' + layer.name);

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
    this.logger('info', 'merge.sh ' + config.outputdir + '/' + service.name + '/' + layer.id + '_' + layer.name.replace(/([^a-z0-9]+)/gi, '_') + ' ' + format);
    shspawn(process.cwd() + '/merge.sh ' + layer.id + '_' + layer.name.replace(/([^a-z0-9]+)/gi, '_') + ' ' + format, process.cwd() + '/' + config.outputdir + '/' + service.name + '/');
};
/**
 * function: logger
 *
 * Simple logger function, can be enhanced in the future
 * @param {type} type
 * @param {type} message
 * @returns {undefined}
 */
exports.logger = function (type, message) {
    var final = '[' + type + '] ' + message + "\n";
    if (!this.config || this.config.debug && type !== 'debug') {
        process.stdout.write(final);
    } else if (this.config && this.config.debug) {
        process.stdout.write(final);
    }
    return '[' + type + '] ' + message + "\n";
};

/**
 * function: mkdirSync
 *
 * Try to create a directory from a path object
 *
 * @param {path} path
 */
exports.mkdirSync = function (path) {
    try {
        fs.mkdirSync(path);
        return true;
    } catch (e) {
        if (e.code !== 'EEXIST') {
            throw e;
        } else {
            return false;
        }
    }
};

/**
 * function: mkdirpSync
 *
 * @param {string} dirpath
 */
exports.mkdirpSync = function (dirpath) {
    //var outputFilename = outputFilename.replace(/\//g, '_');
    var success = false;
    var parts = dirpath.split(path.sep);

    for (var i = 1; i <= parts.length; i++) {
        success = this.mkdirSync(path.join.apply(null, parts.slice(0, i)));
    }
    return success;
};

/**
 * function: post
 *
 * This function tries to parse a url as an arcGIS server rest-interface, 
 * 
 * @param {string} url
 * @param {object} postdata a json object to post
 * @param {string} type
 * @param {function} callback
 * @returns {object} JSON object
 */
exports.post = function (url, postdata, type, callback) {
    var http;
    if (this.config && this.config.useTor) {
        http = require('socks5-http-client');
    } else {
        http = require('http');
    }
    var options = this.config.options;
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
                    callback(e);
                }
            } else {
                callback();
            }
        });
    });
    req.write(postdataString);
    req.end();
    req.on('error', function (e) {
        callback(e);
    });
};

/**
 * function: get
 *
 * This function tries to parse a url as an arcGIS server rest-interface, 
 * 
 * @param {string} urlpath
 * @param {string} type
 * @param {function} callback
 * @returns {object} JSON object
 */
exports.get = function (urlpath, type, callback) {
    var http;
    var conf = this.getConfig();
    if (conf && conf.useTor) {
        http = require('socks5-http-client');
    } else {
        http = require('http');
    }
    var logger = this.logger;

    var options = conf.options;
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

            } else {
                callback();
            }
        });
    });
    req.on('error', function (e) {
        logger('problem with request: ' + e.message);
        callback();
    });
};

exports.getIdfield = function (service, layer, callback) {
    var get = this.get;
    var fieldUrl = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/?f=json';
    var idcolumn = 'OBJECTID';
    this.get(fieldUrl, '', function (result) {
        if (result) {
            result.fields.forEach(function (field) {
                if (field.type && field.type === 'esriFieldTypeOID') {
                    idcolumn = field.name;
                }
            });
        }
        callback(idcolumn);
    });

};

exports.getObjectIds = function (service, layer, callback) {
    var postdata = {
        "where": "1=1",
        "returnIdsOnly": "true",
        "f": "json"
    };
    var objectidUrl = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/query';
    //http://mapservices.prorail.nl/ArcGIS/rest/services/BBK_spoorobjecten/MapServer/36/query?where=1%3D1&returnIdsOnly=true&f=json
    this.post(objectidUrl, postdata, '', function (result) {
        if (result) {
            callback(result);
        } else {
            callback([]);
        }
    });
};

exports.processLayers = function (service, callback) {
    var get = this.get;
    if (service.type && service.type === 'MapServer') {
        get('/ArcGIS/rest/services/' + service.name + '/MapServer?f=json&pretty=true', 'layers', function (result3) {
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
                            get(urlpath, '', function (result4) {
                                if (result4) {
                                    var isQuery = false;

                                    if (result4.capabilities) {
                                        isQuery = result4.capabilities.split(',').indexOf('Query') > -1;
                                    }
                                    var geometryType = result4.geometryType;
                                    if (isQuery) {
                                        var urlpath = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/query?where=1%3D1&returnCountOnly=true&f=json';
                                        get(urlpath, '', function (result5) {
                                            if (result5 && result5.count) {
                                                if (config.testOnly) {
                                                    logger('info', 'service "' + service.name + '" layer:"' + layer.name + '" id:' + layer.id + ' count: ' + result5.count);
                                                } else {
                                                    //get to get ID column
                                                    logger('info', 'service "' + service.name + '" layer:"' + layer.name + '" id:' + layer.id + ' count: ' + result5.count);
                                                    if (!config.useObjectIDs) {
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
};

exports.processServices = function (subset, callback) {
    var get = this.get;
    var config = this.getConfig();
    subset.forEach(function (item) {
        //process services
        get('/ArcGIS/rest/services/' + item + '?f=json&pretty=true', 'services', function (result2) {
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
                logger('error', 'processServices - Could not get layers for ' + config.options.hostname + '' + urlpath);
                callback();
            }
        });
    });
};

/**
 * Process Lists
 * @param {string} callback
 * @return {array} result
 */
exports.getLists = function (callback) {
    var _obj = this;
    var config = this.getConfig();
    var listurl = config.arcGISRootQuery || '/ArcGIS/rest/services/?f=json&pretty=true';
    var useServices = config.useRootServices || true;
    _obj.get(listurl, '', function (listresult) {
        if (listresult) {
            var resultlist = {
                "services": [],
                "folders": []
            };

            if (listresult.folders) {
                if (!config.useFolderList) {
                    resultlist.folders = listresult.folders;
                } else {
                    if (!config.folderList) {
                        resultlist.folders = [];
                    } else {
                        resultlist.folders = _obj.intersect(config.folderList, listresult.folders);
                    }
                }
            } else {
                _obj.logger('info', 'No folders for ' + config.options.hostname + '' + listurl);
            }
            //loop through the services and wrap up the MapServers
            if (listresult.services) {
                var newServicesList = [];
                for (var i = 0; i < listresult.services.length; i++) {
                    if (listresult.services[i].type === "MapServer") {
                        newServicesList.push(listresult.services[i].name);
                    }
                }
                if (useServices) {
                    resultlist.services = newServicesList;
                    if (!config.useServicesList) {
                        resultlist.services = newServicesList;
                    } else {
                        if (!config.servicesList) {
                            resultlist.folders = [];
                        } else {
                            resultlist.services = _obj.intersect(config.servicesList, newServicesList);
                        }

                    }
                }
            } else {
                _obj.logger('info', 'No services for ' + config.options.hostname + '' + listurl);
            }
            callback(resultlist);
        } else {
            _obj.logger('info', 'Incorrect response for ' + config.options.hostname + '' + listurl);
            callback();
        }
    });
};

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
 * @param {function} callback
 */
exports.parseResult = function (fmin, fmax, service, layer, idcolumn, geometryType, callback) {
    var outSr = this.config.outSr || "4326";
    var config = this.config;
    var testOnly = this.config.testOnly || true;
    var logger = this.logger;
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
    var urlpath = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/query';

    var postdata = {
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": outSr,
        "f": "json"
    };

    if (typeof idcolumn === 'string') {
        postdata.where = idcolumn + '+>+' + fmin + '+AND+' + idcolumn + '+<+' + top;
    } else if (idcolumn.objectIdFieldName) {
        //do a post, with the id's
        postdata.objectIds = idcolumn.objectIds.slice(fmin, top).join(',');
    } else {
        //don't know what to do, exit
        callback();
    }
    this.post(urlpath, postdata, '', function (result6) {
        var collection = {"type": "FeatureCollection", "features": []};
        if (result6 && result6.features) {
            result6.features.forEach(function (feature) {
                var outfeat = ArcGIS.parse(feature);
                collection.features.push(outfeat);
            });
            //split the service.name on the slash to create subdirs
            if (testOnly) {
                callback(result6);
            } else {
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
                            callback();
                        }
                    }
                });
            }
        } else {
            //logger('error', 'parseResult(2) - Could not parse ' + config.options.hostname + urlpath);
            result6.urlpath = urlpath;
            result6.hostname = config.options.hostname;
            result6.postdata = postdata;
            callback(result6);
        }
    });
};

exports.processLayers = function(service, callback) {
    var me = this;
    var config = this.getConfig();
    if (service.type && service.type === 'MapServer') {
        me.get('/ArcGIS/rest/services/' + service.name + '/MapServer?f=json&pretty=true', 'layers', function (result3) {
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
                            me.logger('debug', service.name + ' ' + layer.name + ' (' + layer.id + ') - PARSING');
                            var urlpath = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '?f=json&pretty=true';
                            me.get(urlpath, '', function (result4) {
                                if (result4) {
                                    var isQuery = false;

                                    if (result4.capabilities) {
                                        isQuery = result4.capabilities.split(',').indexOf('Query') > -1;
                                    }
                                    var geometryType = result4.geometryType;
                                    if (isQuery) {
                                        var urlpath = '/ArcGIS/rest/services/' + service.name + '/MapServer/' + layer.id + '/query?where=1%3D1&returnCountOnly=true&f=json';
                                        me.get(urlpath, '', function (result5) {
                                            if (result5 && result5.count) {
                                                if (config.testOnly) {
                                                    me.logger('info', 'service "' + service.name + '" layer:"' + layer.name + '" id:' + layer.id + ' count: ' + result5.count);
                                                } else {
                                                    me.logger('info', 'service "' + service.name + '" layer:"' + layer.name + '" id:' + layer.id + ' count: ' + result5.count);
                                                    if (!config.useObjectIDs) {
                                                        me.parseResult(config.offsetStart, result5.count, service, layer, 'OBJECTID', geometryType);
                                                    } else {
                                                        me.getObjectIds(service, layer, function (objectIdInfo) {
                                                            me.parseResult(config.offsetStart, result5.count, service, layer, objectIdInfo, geometryType);
                                                        });
                                                    }
                                                }
                                            } else {
                                                me.logger('debug', service.name + '/' + layer.name + ' (' + layer.id + ') returned no feature count, not processed.');
                                            }
                                        });
                                    }
                                } else {
                                    me.logger('error', 'processLayers - Could not get count for ' + service.name + '/' + layer.name + ' (' + layer.id + ')');
                                }
                            });
                        }
                    }
                });
            } else {
                me.logger('error', 'Could not get layers for ' + service.name);
                callback();
            }
        });
    }
};
exports.processServices = function(subset, callback) {
    var me = this;
    var config = this.getConfig();
    subset.forEach(function (item) {
        //process services
        me.get('/ArcGIS/rest/services/' + item + '?f=json&pretty=true', 'services', function (result2) {
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
                        me.processLayers(service);
                    }
                });
            } else {
                me.logger('error', 'processServices - Could not get layers for ' + config.options.hostname + '' + urlpath);
                callback();
            }
        });
    });
}

/**
 * 
 * @param {type} command
 * @param {type} workingdir
 * @returns {undefined}
 */
exports.shspawn = function (command, workingdir) {
    spawn('sh', ['-c', command], {"stdio": "inherit", "cwd": workingdir});
};

exports.createShape = function (service, layer, geometryType) {
    var config = this.getConfig();
    this.logger('debug', 'finished processing layer ' + layer.name);

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
    this.logger('info', 'merge.sh ' + config.outputdir + '/' + service.name + '/' + layer.id + '_' + layer.name.replace(/([^a-z0-9]+)/gi, '_') + ' ' + format);
    shspawn(process.cwd() + '/merge.sh ' + layer.id + '_' + layer.name.replace(/([^a-z0-9]+)/gi, '_') + ' ' + format, process.cwd() + '/' + config.outputdir + '/' + service.name + '/');
};

exports.run = function () {
    var me = this;
    this.getLists(function (result) {
        if (result) {
            if (result.folders.length > 0) {
                me.processServices(result.folders, function (folderfinal) {

                });
            }
            if (result.services.length > 0) {
                result.services.forEach(function (service) {
                    me.processLayers({"name": service, "type": "MapServer"}, function (servicesfinal) {
                    });
                });
            }
        }
    });
};