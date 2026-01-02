(function () {
    "use strict";
    const {
        Client, // direct access: const Client = require('@markus.hardardt/js_utils/src/Client.js');
        Executor, // direct access: const Executor = require('@markus.hardardt/js_utils/src/Executor.js');
        HashLists, // direct access: const HashLists = require('@markus.hardardt/js_utils/src/HashLists.js');
        JsonFX, // direct access: const JsonFX = require('@markus.hardardt/js_utils/src/JsonFX.js');
        Mathematics, // direct access: const Mathematics = require('@markus.hardardt/js_utils/src/Mathematics.js');
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
        md5, // direct access: const md5 = require('@markus.hardardt/js_utils/ext/md5.js'); // external
        addStaticWebServerJsUtilsFiles
    } = require('@markus.hardardt/js_utils/js_utils.js');

    // debug
    const s_verbose_sql_queries = !true;

    // load configurations
    const db_access = require('./config/db_access.json');
    const db_config = require('./config/db_config.json');

    // Determine config file
    var configFile = './config.json';
    if (process.argv.length > 2 && /\.json$/.test(process.argv[2])) {
        configFile = /^\.\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2];
    }
    const config = require(configFile);

    // create 'hmi' environment object
    const hmi = {}; // TODO: -> "sys"
    // here we add our libraries
    hmi.lib = {};
    // load Mathematics
    hmi.lib.Mathematics = Mathematics;
    hmi.lib.JsonFX = JsonFX;
    hmi.lib.exec = Executor;
    hmi.lib.regex = Regex;
    hmi.lib.sql = SqlHelper;
    // add hmi-object-framweork
    hmi.create = (object, element, onSuccess, onError, initData) => ObjectLifecycleManager.create(object, element, onSuccess, onError, hmi, initData);
    hmi.destroy = ObjectLifecycleManager.destroy;
    hmi.env = {
        isInstance: instance => false, // TODO: Implement isInstance(instance)
        isSimulationEnabled: () => false // TODO: Implement isSimulationEnabled()
    };

    // Prepare web server
    const minimized = true;
    const webServer = new WebServer.Server({ secureKeyFile: config.secureKeyFile, secureCertFile: config.secureCertFile });
    webServer.RandomFileIdEnabled = false;
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
    webServer.AddStaticFile('./ext/jquery/jquery.ui.touch-punch.js');
    webServer.AddStaticFile('./ext/jquery/jquery.transform2d.js');
    webServer.AddStaticFile('./ext/jquery/ajaxblob.js');
    webServer.AddStaticFile('./ext/jquery/layout-default-latest.css');
    webServer.AddStaticFile('./ext/jquery/jquery.layout-latest.js');
    webServer.AddStaticFile('./ext/jquery/dataTables.pageResize.min.js');
    webServer.AddStaticFile('./ext/jquery/dataTables.scrollResize.min.js');
    /*
    webServer.AddStaticFile('./ext/jquery/jquery.transform2d.js');
    webServer.AddStaticFile('./ext/jquery/ajaxblob.js');
    webServer.AddStaticFile('./ext/jquery/layout-default-latest.css');
    webServer.AddStaticFile('./ext/jquery/jquery.layout-latest.js');
    webServer.AddStaticFile('./ext/jquery/dataTables.pageResize.min.js');
    webServer.AddStaticFile('./ext/jquery/dataTables.scrollResize.min.js');
    */
    // TODO: https://codemirror.net/docs/migration/   --> CodeMirror.fromTextArea
    webServer.AddStaticFile('./node_modules/codemirror/lib/codemirror.css');
    webServer.AddStaticFile('./node_modules/codemirror/lib/codemirror.js');
    webServer.AddStaticFile('./node_modules/codemirror/mode/javascript/javascript.js');
    webServer.AddStaticFile('./node_modules/codemirror/mode/xml/xml.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/edit/matchbrackets.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/edit/closebrackets.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/search/search.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/dialog/dialog.css');
    webServer.AddStaticFile('./node_modules/codemirror/addon/dialog/dialog.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/search/searchcursor.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/search/match-highlighter.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/hint/show-hint.css');
    webServer.AddStaticFile('./node_modules/codemirror/addon/hint/show-hint.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/hint/javascript-hint.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/scroll/annotatescrollbar.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/search/matchesonscrollbar.js');
    webServer.AddStaticFile('./node_modules/codemirror/addon/search/matchesonscrollbar.css');

    webServer.AddStaticFile('./node_modules/file-saver/dist/' + (minimized ? 'FileSaver.min.js' : 'FileSaver.js'));
    webServer.AddStaticFile('./node_modules/js-beautify/js/lib/beautify.js');
    webServer.AddStaticFile('./node_modules/js-beautify/js/lib/beautify-html.js');
    webServer.AddStaticFile('./node_modules/js-beautify/js/lib/beautify-css.js');
    addStaticWebServerJsUtilsFiles(webServer);
    // add the final static file: our hmi main loader
    webServer.AddStaticFile('./src/BrowserMain.js');
    // No content - will be generated at runtime inside browser
    webServer.SetBody('');

    /* let body = ''; // TODO Handle CodeMirror v5 -> v6 issues
    body += '<script type="module">\n';
    body += 'import { attachBrowserFeatures } from "./src/Client.js";\n';
    body += 'import "./src/ObjectLifecycleManager.js";\n';
    body += 'attachBrowserFeatures(window.ObjectLifecycleManager);\n';
    //body += 'const olm = new ObjectLifecycleManager();\n';
    body += '</script>\n';
    webServer.SetBody(body); */
    // deliver main config to client
    webServer.Post('/get_client_config', (request, response) => response.send(JSON.stringify({
        requestAnimationFrameCycle: config.clientRequestAnimationFrameCycle
    })));

    // prepare content management system
    // we need the handler for database access
    // TODO: reuse or remove    const sqlHelper = new SqlHelper.Connector(db_access, s_verbose_sql_queries);
    const sqlAdapterFactory = SqlHelper.getAdapterFactory(db_access, s_verbose_sql_queries);
    // we directly replace our icon directory to make sure on server and client
    // (with debug proxy too) our icons will be available
    db_config.icon_dir = '/' + webServer.AddStaticDir(db_config.icon_dir) + '/';
    db_config.jsonfx_pretty = config.jsonfx_pretty === true;
    // TODO: reuse or remove hmi.cms = new ContentManager(sqlHelper.createAdapter, db_config);
    hmi.cms = new ContentManager.Instance(sqlAdapterFactory, db_config);
    // we need access via ajax from clients
    webServer.Post(ContentManager.GET_CONTENT_DATA_URL, (request, response) => {
        hmi.cms.HandleRequest(request.body,
            result => response.send(JSON.stringify(result)),
            error => response.send(JSON.stringify(error.toString()))
        );
    });
    // the tree control requests da via 'GET' so we handle those request
    // separately
    webServer.Get(ContentManager.GET_CONTENT_TREE_NODES_URL, (request, response) => {
        hmi.cms.HandleFancyTreeRequest(request.query.request, request.query.path,
            result => response.send(JSON.stringify(result)),
            error => response.send(JSON.stringify(error.toString()))
        );
    });
    function addStaticFiles(file) {
        if (Array.isArray(file)) {
            for (var i = 0, l = file.length; i < l; i++) {
                addStaticFiles(file[i]);
            }
        } else if (typeof file === 'string' && file.length > 0) {
            webServer.AddStaticFile(file);
        }
    }
    addStaticFiles(config.staticClientFiles);
    webServer.AddStaticFile(config.touch ? config.scrollbar_hmi : config.scrollbar_config);

    // debug stuff start
    const DataIds = Object.freeze({ b: 'test:b', i: 'test:i', f: 'test:f', t: 'test:t' });
    const test_subscriptions = {};
    test_subscriptions[DataIds.b] = { value: false, onRefresh: null };
    test_subscriptions[DataIds.i] = { value: 0, onRefresh: null };
    test_subscriptions[DataIds.f] = { value: 1.618, onRefresh: null };
    test_subscriptions[DataIds.t] = { value: 'hello world', onRefresh: null };
    const test_dataPoints = {
        onOperationalStateChanged: null,
        IsOperational: true,
        SubscribeOperationalState: onOperationalStateChanged => { 
            test_dataPoints.onOperationalStateChanged = onOperationalStateChanged;
            onOperationalStateChanged(true);
        },
        UnsubscribeOperationalState: onOperationalStateChanged => test_dataPoints.onOperationalStateChanged = null,
        GetType: dataId => { },
        SubscribeData: (dataId, onRefresh) => {
            test_subscriptions[dataId].onRefresh = onRefresh;
            onRefresh(test_subscriptions[dataId].value);
        },
        UnsubscribeData: (dataId, onRefresh) => test_subscriptions[dataId].onRefresh = null,
        Read: (dataId, onResponse, onError) => test_subscriptions[dataId].value,
        Write: (dataId, value) => setTestValue(dataId, value)
    };
    function setTestValue(dataId, value) {
        test_subscriptions[dataId].value = value;
        if (test_subscriptions[dataId].onRefresh) {
            test_subscriptions[dataId].onRefresh(value);
        }
    }
    setInterval(() => {
        setTestValue(DataIds.b, Math.random() >= 0.5);
        setTestValue(DataIds.i, test_subscriptions[DataIds.i].value + 1);
        setTestValue(DataIds.f, Math.random());
        setTestValue(DataIds.t, `Hello world! ${Math.random()}`);
    }, 500);
    const test_dataPointsCollection = new DataPoint.Collection();
    test_dataPointsCollection.Parent = test_dataPoints;
    setTimeout(() => { // TODO: Renove when tested and running
        test_dataPointsCollection.Parent = null;
        test_dataPointsCollection.Parent = test_dataPoints;
    }, 5000)
    // debug stuff end

    const router = new DataPoint.Router();
    router.GetDataAccessObject = dataId => {
        const match = /^([a-z0-9_]+):.+$/i.exec(dataId);
        if (!match) {
            throw new Error(`Invalid id: '${dataId}'`);
        } else {
            switch (match[1]) {
                case 'test':
                    return test_dataPointsCollection; // test_dataPoints;
                default:
                    throw new Error(`Invalid prefix '${match[1]}' id: '${dataId}'`);
            }
        }
    };
    router.IsOperational = true; // TODO: Handle this (but when and how?)
    hmi.env.data = router;

    const dataConnectors = {};

    const tasks = [];

    // Prepare web socket server
    let webSocketServer = undefined;
    webServer.Post('/get_web_socket_session_config',
        (request, response) => response.send(JSON.stringify(webSocketServer.CreateSessionConfig()))
    );
    tasks.push((onSuccess, onError) => {
        try {
            webSocketServer = new WebSocketConnection.Server(config.webSocketPort, {
                secure: webServer.IsSecure,
                autoConnect: config.autoConnect,
                closedConnectionDisposeTimeout: config.closedConnectionDisposeTimeout,
                OnOpen: connection => {
                    console.log(`web socket client opened (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    const dataConnector = new DataConnector.ServerConnector();
                    dataConnector.Parent = router;
                    dataConnector.Connection = connection;
                    dataConnector.SendDelay = config.sendDelay;
                    dataConnector.SubscribeDelay = config.subscribeDelay;
                    dataConnector.UnsubscribeDelay = config.unsubscribeDelay;
                    dataConnector.SetDataPoints([
                        { id: DataIds.b, type: Core.DataType.Boolean },
                        { id: DataIds.i, type: Core.DataType.Int64 },
                        { id: DataIds.f, type: Core.DataType.Double },
                        { id: DataIds.t, type: Core.DataType.String }
                    ]);
                    dataConnectors[connection.SessionId] = dataConnector;
                    dataConnector.OnOpen();
                },
                OnReopen: connection => {
                    console.log(`web socket client reopened (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    const dataConnector = dataConnectors[connection.SessionId];
                    dataConnector.OnReopen();
                },
                OnClose: connection => {
                    console.log(`web socket client closed (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    const dataConnector = dataConnectors[connection.SessionId];
                    dataConnector.OnClose();
                },
                OnDispose: connection => {
                    console.log(`web socket client disposed (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    const dataConnector = dataConnectors[connection.SessionId];
                    dataConnector.OnDispose();
                    delete dataConnectors[connection.SessionId];
                    dataConnector.Connection = null;
                    dataConnector.Parent = null;
                },
                OnError: (connection, error) => {
                    console.error(`error in connection (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}') to server: ${error}`);
                }
            });
            onSuccess();
        } catch (error) {
            onError(error);
        }
    });

    tasks.push((onSuccess, onError) => {
        Server.startRefreshCycle(config.serverCycleMillis, () => ObjectLifecycleManager.refresh(new Date()));
        onSuccess();
    });

    tasks.push((onSuccess, onError) => {
        webServer.Listen(config.webServerPort, () => {
            console.log(`js hmi web server listening on port: ${config.webServerPort}`);
            onSuccess();
        });
    });

    Executor.run(tasks, () => Object.seal(hmi), error => console.error(error));
}());