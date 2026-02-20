(function () {
    "use strict";
    let configFile = './config.json';
    if (process.argv.length > 2 && /\.json$/.test(process.argv[2])) {
        configFile = /^\.\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2];
    }
    const config = require(configFile);
    config.external = Object.freeze({
        OPCUA: require('./src/OPCUA.js'),
        fs: require('fs'),
        xlsx: require('xlsx')
    });
    const main = require('@markus.hardardt/js_utils/server/main.js');
    main(config);
}());