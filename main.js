(function () {
    "use strict";
    const {
        Client, // direct access: const Client = require('@markus.hardardt/js_utils/src/Client.js');
        Executor, // direct access: const Executor = require('@markus.hardardt/js_utils/src/Executor.js');
        HashLists, // direct access: const HashLists = require('@markus.hardardt/js_utils/src/HashLists.js');
        jsonfx, // direct access: const jsonfx = require('@markus.hardardt/js_utils/src/jsonfx.js');
        math, // direct access: const math = require('@markus.hardardt/js_utils/src/math.js');
        ObjectPositionSystem, // direct access: const ObjectPositionSystem = require('@markus.hardardt/js_utils/src/ObjectPositionSystem.js');
        Regex, // direct access: const Regex = require('@markus.hardardt/js_utils/src/Regex.js');
        Server, // direct access: const Server = require('@markus.hardardt/js_utils/src/Server.js');
        Sorting, // direct access: const Sorting = require('@markus.hardardt/js_utils/src/Sorting.js');
        SqlHelper, // direct access: const SqlHelper = require('@markus.hardardt/js_utils/src/SqlHelper.js');
        Utilities, // direct access: const Utilities = require('@markus.hardardt/js_utils/src/Utilities.js');
        Core, // direct access: const Core = require('@markus.hardardt/js_utils/src/Core.js');
        WebServer, // direct access: const WebServer = require('@markus.hardardt/js_utils/src/WebServer.js');
        ContentManager, // direct access: const ContentManager = require('@markus.hardardt/js_utils/src/ContentManager.js');
        Common, // direct access: const Common = require('@markus.hardardt/js_utils/src/Common.js');
        ObjectLifecycleManager, // direct access: const ObjectLifecycleManager = require('@markus.hardardt/js_utils/src/ObjectLifecycleManager.js');
        DataPoint, // direct access: const DataPoint = require('@markus.hardardt/js_utils/src/DataPoint.js');
        TargetSystem, // direct access: const TargetSystem = require('@markus.hardardt/js_utils/src/TargetSystem.js');
        WebSocketConnection, // direct access: const WebSocketConnection = require('@markus.hardardt/js_utils/src/WebSocketConnection.js');
        DataConnector, // direct access: const DataConnector = require('@markus.hardardt/js_utils/src/DataConnector.js');
        addStaticWebServerJsUtilsFiles
    } = require('@markus.hardardt/js_utils/js_utils.js');


    // debug
    const s_verbose_sql_queries = !true;

    // load configurations
    const main_config = require('./main_config.json');
    const db_access = require('./config/db_access.json');
    const db_config = require('./config/db_config.json');

    // Determine config file
    var configFile = './config.json';
    if (process.argv.length > 2 && /\.json$/.test(process.argv[2])) {
        configFile = /^\.\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2];
    }
    const config = require(configFile);

    // Prepare web server
    const minimized = true;
    const webServer = new WebServer.Server({ secureKeyFile: config.secureKeyFile, secureCertFile: config.secureCertFile });
    webServer.RandomFileIdenabled = false;
    webServer.SetTitle('js hmi');
    webServer.AddStaticDir('./images', 'images');
    webServer.PrepareFavicon('images/favicon.ico');
    webServer.AddStaticFile('./ui/hmi_styles.css');
    addStaticWebServerJsUtilsFiles(webServer);
    // No content - will be generated at runtime inside browser
    webServer.SetBody('');

    // TODO ...

}());