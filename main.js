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

    // create 'hmi' environment object
    const hmi = {}; // TODO: => "sys"
    // here we add our libraries
    hmi.lib = {};
    // load math
    hmi.lib.math = math;
    hmi.lib.jsonfx = jsonfx;
    hmi.lib.exec = Executor;
    hmi.lib.regex = Regex;
    hmi.lib.sql = SqlHelper;
    // add hmi-object-framweork
    hmi.create = function (object, element, onSuccess, onError, initData) {
        hmi_object.create(object, element, onSuccess, onError, hmi, initData);
    };
    hmi.destroy = hmi_object.destroy;
    hmi.env = {
        isInstance: instance => false, // TODO: Implement isInstance(instance)
        isSimulationEnabled: () => false // TODO: Implement isSimulationEnabled()
    };

    // Prepare web server
    const minimized = true;
    const webServer = new WebServer.Server({ secureKeyFile: config.secureKeyFile, secureCertFile: config.secureCertFile });
    webServer.RandomFileIdenabled = false;
    webServer.SetTitle('js hmi');
    webServer.AddStaticDir('./images', 'images');
    webServer.PrepareFavicon('images/favicon.ico');
    webServer.AddStaticFile('./ui/hmi_styles.css');
    webServer.AddStaticFile('./node_modules/jquery/dist/' + (minimized ? 'jquery.min.js' : 'jquery.js'));
    webServer.AddStaticFile('./node_modules/jquery-ui-dist/' + (minimized ? 'jquery-ui.min.css' : 'jquery-ui.css'));
    webServer.AddStaticFile('./node_modules/jquery-ui-dist/' + (minimized ? 'jquery-ui.min.js' : 'jquery-ui.js'));
    // Note: The next css file references png files by relative paths. Because 'media' is the common root, we must not scramble deeper folders.
    webServer.AddStaticFile('./node_modules/datatables/media', minimized ? 'css/jquery.dataTables.min.css' : 'css/jquery.dataTables.css');
    webServer.AddStaticFile('./node_modules/datatables/media', minimized ? 'js/jquery.dataTables.min.js' : 'js/jquery.dataTables.js');
    // Note: Don't use this extension! Shows paging even if not configured and every second page is empty.
    // webServer.AddStaticFile('./node_modules/datatables.net-scroller/js/dataTables.scroller.js');
    // Note: The next css file references png files by relative paths. Because 'dist' is the common root, we must not scramble deeper folders.
    webServer.AddStaticFile('./node_modules/jquery.fancytree/dist', minimized ? 'skin-lion/ui.fancytree.min.css' : 'skin-lion/ui.fancytree.css');
    webServer.AddStaticFile('./node_modules/jquery.fancytree/dist/' + (minimized ? 'jquery.fancytree-all.min.js' : 'jquery.fancytree-all.js'));
    /*
    webServer.AddStaticFile('./ext/jquery/jquery.transform2d.js');
    webServer.AddStaticFile('./ext/jquery/ajaxblob.js');
    webServer.AddStaticFile('./ext/jquery/layout-default-latest.css');
    webServer.AddStaticFile('./ext/jquery/jquery.layout-latest.js');
    webServer.AddStaticFile('./ext/jquery/dataTables.pageResize.min.js');
    webServer.AddStaticFile('./ext/jquery/dataTables.scrollResize.min.js');
    */
    webServer.addStaticFile('./node_modules/codemirror/lib/codemirror.css');
    webServer.addStaticFile('./node_modules/codemirror/lib/codemirror.js');
    webServer.addStaticFile('./node_modules/codemirror/mode/javascript/javascript.js');
    webServer.addStaticFile('./node_modules/codemirror/mode/xml/xml.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/edit/matchbrackets.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/edit/closebrackets.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/search/search.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/dialog/dialog.css');
    webServer.addStaticFile('./node_modules/codemirror/addon/dialog/dialog.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/search/searchcursor.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/search/match-highlighter.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/hint/show-hint.css');
    webServer.addStaticFile('./node_modules/codemirror/addon/hint/show-hint.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/hint/javascript-hint.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/scroll/annotatescrollbar.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/search/matchesonscrollbar.js');
    webServer.addStaticFile('./node_modules/codemirror/addon/search/matchesonscrollbar.css');
    webServer.addStaticFile('./node_modules/file-saver/dist/' + (minimized ? 'FileSaver.min.js' : 'FileSaver.js'));
    addStaticWebServerJsUtilsFiles(webServer);
    // No content - will be generated at runtime inside browser
    webServer.SetBody('');

}());