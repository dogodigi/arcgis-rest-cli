var arcgisRest = require('../lib/arcgis-rest.js');
arcgisRest.config = {};

exports.testHelperFunctions = {
    testIntersect: function (test) {
        test.deepEqual(arcgisRest.intersect(['12', '2', 'hi'], ['2', '3', 'boo']), ['2']);
        test.done();
    },
    testLogger: function (test) {
        test.equal(arcgisRest.logger('info', 'this is a message'), '[info] this is a message\n');
        test.done();
    },
    testMkdirSync: function (test) {
        var fs = require('fs');
        test.equals(arcgisRest.mkdirSync('test'), false, 'Directory test does not exists');
        test.equals(arcgisRest.mkdirSync('boo'), true, 'Directory boo could not be created');
        fs.rmdirSync('boo');
        test.equals(arcgisRest.mkdirpSync('boo/foo'), true, 'Directory boo/foo could not be created');
        fs.rmdirSync('boo/foo');
        fs.rmdirSync('boo');
        test.done();
    }
};
exports.testArcgis = {
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
    testVersionGet: function (test) {
        arcgisRest.retrieve('/ArcGIS/rest/services/?f=json&pretty=true', '', function (result) {
            test.equals(result.currentVersion, '10.2', 'arcgis server is no longer running version 10.2');
            test.done();
        });
    },
    testVersionPost: function (test) {
        arcgisRest.postRetrieve('/ArcGIS/rest/services', {"f": "json", "pretty": "true"}, '', function (result) {
            test.equals(result.currentVersion, '10.2', 'arcgis server is no longer running version 10.2');
            test.done();
        });
    },
    testGetIdfield: function (test) {
        arcgisRest.getIdfield({"name": "Demographics/USA_Average_Household_Size"}, {"id": 1},
        function (result) {
            test.equals(result, 'OBJECTID', 'Demographics/USA_Average_Household_Size does not have OBJECTID as ID field');
            test.done();
        });
    },
    testGetObjectIds: function (test) {
        arcgisRest.getObjectIds({"name": "Demographics/USA_Average_Household_Size"}, {"id": 4},
        function (result) {
            test.equals(result.objectIds.length, '52', 'Demographics/USA_Average_Household_Size does not have 52 objects for States');
            test.done();
        });
    },
    testProcessLists: function (test) {
        arcgisRest.processLists(
                function (result) {
                    test.equals(result.services.length, '12', 'server.arcgisonline.com does not have 12 services');
                    test.equals(result.folders.length, '7', 'server.arcgisonline.com does not have 7 folders');
                    test.done();
                });
    }
};

