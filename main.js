(function () {
    "use strict";
    let configFile = './config.json';
    if (process.argv.length > 2 && /\.json$/.test(process.argv[2])) {
        configFile = /^\.\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2];
    }
    const config = require(configFile);
    config.external = Object.freeze({
        fs: require('fs'),
        xlsx: require('xlsx')
    });
    config.postRequestHandler = { // TODO: Add handler if required
        sampleHandler: (request, onResponse, onError) => onResponse(`Sample handler response on request: '${request}'`)
    };
    const main = require('@markus.hardardt/js_utils/server/main.js');
    main(config);
}());