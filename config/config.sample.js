/**
 * This is an example configuration file for running arcgis-rest-cli.
 * If no config is given as parameter, this config file will be ran.
 */
module.exports = {
    options: {
        socksPort: 9050, // Tor port for local tor instance
        hostname: 'server.arcgisonline.com', //uri for the arcGIS server; omit http or https
        port: 80
    },
    arcGISRootQuery: '/ArcGIS/rest/services/?f=json&pretty=true',
    useRootServices: true,
    outputdir: 'data/arcgisonline',
    useTor: true, // You can use a Tor proxy running on localhost if you want to.
    useLayerList: true, //Do you want to use a layers list to limit the datasets parsed?
    useServicesList: true, //Do you want to use a serviceslist to servicesthat are being checked?
    useFolderList: false, //Do you want to use a serviceslist to servicesthat are being checked?
    folderList: ['Demographics'],
    servicesList: ['Demographics/USA_Average_Household_Size'], //Provide an array of services that you want parsed assuming you know their correct name.
    layersList: [2, 12, 14, 23], // Provide a list of layer id's (integers)
    offsetStart: 0, //the lower limit of the OBJECTID. Can be changed if certain datasets halted somewhere in the middle during processing (start at this OBJECTID)
    testOnly: true, //run tests and log output. Don't parse and store data
    debug: true
};

