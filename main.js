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
        Common, // direct access: const Common = require('@markus.hardardt/js_utils/src/Common.js');
        ContentManager, // direct access: const ContentManager = require('@markus.hardardt/js_utils/src/ContentManager.js');
        ObjectLifecycleManager, // direct access: const ObjectLifecycleManager = require('@markus.hardardt/js_utils/src/ObjectLifecycleManager.js');
        DataConnector, // direct access: const DataConnector = require('@markus.hardardt/js_utils/src/DataConnector.js');
        DataPoint, // direct access: const DataPoint = require('@markus.hardardt/js_utils/src/DataPoint.js');
        WebSocketConnection, // direct access: const WebSocketConnection = require('@markus.hardardt/js_utils/src/WebSocketConnection.js');
        ContentEditor, // direct access: const ContentEditor = require('@markus.hardardt/js_utils/src/ContentEditor.js');
        LanguageSwitching, // direct access: const LanguageSwitching = require('@markus.hardardt/js_utils/src/LanguageSwitching.js');
        TaskManager, // direct access: const TaskManager = require('@markus.hardardt/js_utils/src/TaskManager.js');
        md5, // direct access: const md5 = require('@markus.hardardt/js_utils/ext/md5.js'); // external
        addStaticWebServerJsUtilsFiles
    } = require('@markus.hardardt/js_utils/js_utils.js');
    const OPCUA = require('./src/OPCUA.js');
    const fs = require('fs');
    const xlsx = require('xlsx');

    // Determine config file
    let configFile = './config.json';
    if (process.argv.length > 2 && /\.json$/.test(process.argv[2])) {
        configFile = /^\.\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2];
    }
    const config = require(configFile);

    // create 'hmi' environment object
    const hmi = {
        // add hmi-object-framweork
        createObject: (object, element, onSuccess, onError, initData) =>
            ObjectLifecycleManager.createObject(object, element, onSuccess, onError, hmi, initData),
        killObject: ObjectLifecycleManager.killObject,
        utils: {
            Executor,
            HashLists,
            JsonFX,
            Mathematics,
            Regex,
            Server,
            Sorting,
            SqlHelper,
            Utilities,
            Core,
            Common,
            ContentManager,
            ObjectLifecycleManager,
            DataPoint,
            ContentEditor,
            md5
        },
        // Environment
        env: {
            isInstance: instance => false, // TODO: Implement isInstance(instance)
            isSimulationEnabled: () => false // TODO: Implement isSimulationEnabled()
        },
        ext: {
            OPCUA,
            fs,
            xlsx
        }
    };
    // Prepare web server
    const minimized = true;
    const webServer = new WebServer.Server({ secureKeyFile: config.secureKeyFile, secureCertFile: config.secureCertFile });
    webServer.RandomFileIdEnabled = false;
    webServer.SetTitle('js_hmi');
    webServer.AddStaticDir('./images', 'images');
    webServer.PrepareFavicon('images/favicon.ico');
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
    // Note: This needs to be added towards the end because it overrides the dark background of dialogues, which is defined by jquery-ui.css.
    webServer.AddStaticFile('./ui/hmi_styles.css');
    addStaticWebServerJsUtilsFiles(webServer);
    // No content - will be generated at runtime inside browser
    webServer.SetBody('');
    // deliver main config to client
    webServer.Post('/get_client_config', (request, response) => response.send(JsonFX.stringify({
        requestAnimationFrameCycle: config.clientRequestAnimationFrameCycle,
        accessPointUnsubscribeDelay: config.clientAccessPointUnsubscribeDelay
    }, false)));
    // prepare content management system
    // we need the handler for database access
    const sqlAdapterFactory = SqlHelper.getAdapterFactory();
    // Setting up content manager and add directory containing the icons for the configurator
    const configIconDirectory = webServer.AddStaticDir('./node_modules/@markus.hardardt/js_utils/cfg/icons');
    const contentManager = new ContentManager.Instance(sqlAdapterFactory, configIconDirectory);
    hmi.env.cms = contentManager;
    contentManager.RegisterOnWebServer(webServer);
    // Setting up task manager
    const taskManager = TaskManager.getInstance(hmi);;
    hmi.env.tasks = taskManager;
    contentManager.RegisterAffectedTypesListener(ContentManager.DataType.Task, taskManager.OnTasksChanged);
    // Setting up
    const dataAccessRouterHandler = new DataPoint.AccessRouterHandler();
    hmi.env.router = dataAccessRouterHandler;
    // Setting up
    const dataAccessRouter = new DataPoint.AccessRouter();
    dataAccessRouter.GetDataAccessObject = dataAccessRouterHandler.GetDataAccessObject;
    // Setting up
    const dataAccessPoint = new DataPoint.AccessPoint();
    dataAccessPoint.UnsubscribeDelay = config.serverAccessPointUnsubscribeDelay;
    dataAccessPoint.Source = dataAccessRouter; // Use the router as source
    hmi.env.data = dataAccessPoint; // Enable access from anyhwere
    // Add static finels
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

    // Freeze the hmi object and it's content
    Object.freeze(hmi.utils);
    Object.freeze(hmi.env);
    Object.freeze(hmi.ext);
    Object.freeze(hmi);

    // Here we store the tasks to be executed as a sequence in order to start the server environment.
    const tasks = [];

    // Prepare web socket server
    const dataConnectors = {};
    let webSocketServer = undefined;
    webServer.Post('/get_web_socket_session_config',
        (request, response) => response.send(JsonFX.stringify(webSocketServer.CreateSessionConfig(), false))
    );
    tasks.push((onSuccess, onError) => {
        try {
            webSocketServer = new WebSocketConnection.Server(config.webSocketPort, {
                secure: webServer.IsSecure,
                autoConnect: config.autoConnect,
                closedConnectionDisposeTimeout: config.closedConnectionDisposeTimeout,
                OnOpen: connection => {
                    console.log(`web socket client opened (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    taskManager.OnOpen(connection);
                    const dataConnector = DataConnector.getInstance();
                    dataConnector.Source = dataAccessPoint;
                    dataConnector.Connection = connection;
                    dataConnector.SendDelay = config.dataConnectorSendDelay;
                    dataConnector.SubscribeDelay = config.dataConnectorSubscribeDelay;
                    dataConnector.UnsubscribeDelay = config.dataConnectorUnsubscribeDelay;
                    dataConnectors[connection.SessionId] = dataConnector;
                    dataAccessRouterHandler.RegisterDataConnector(dataConnector);
                    dataConnector.OnOpen();
                },
                OnReopen: connection => {
                    console.log(`web socket client reopened (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    taskManager.OnOpen(connection);
                    const dataConnector = dataConnectors[connection.SessionId];
                    dataConnector.OnOpen();
                    dataAccessRouterHandler.RegisterDataConnector(dataConnector);
                },
                OnClose: connection => {
                    console.log(`web socket client closed (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    taskManager.OnClose(connection);
                    const dataConnector = dataConnectors[connection.SessionId];
                    dataConnector.OnClose();
                    dataAccessRouterHandler.UnregisterDataConnector(dataConnector);
                },
                OnDispose: connection => {
                    console.log(`web socket client disposed (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    taskManager.OnClose(connection);
                    const dataConnector = dataConnectors[connection.SessionId];
                    dataConnector.OnClose();
                    delete dataConnectors[connection.SessionId];
                    dataConnector.Connection = null;
                    dataConnector.Source = null;
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

    tasks.push((onSuccess, onError) => taskManager.Initialize(onSuccess, onError));

    tasks.push((onSuccess, onError) => taskManager.StartAutorunTasks(onSuccess, onError));

    tasks.push((onSuccess, onError) => {
        webServer.Listen(config.webServerPort, () => {
            console.log(`js_hmi web server listening on port: ${config.webServerPort}`);
            onSuccess();
        });
    });

    Executor.run(tasks, () => console.log('js_hmi runnning'), error => console.error(error));

    function shutdownTaskManagerAsync() {
        return new Promise((resolve, reject) => {
            taskManager.Shutdown(() => resolve(), error => {
                console.error(`Failed to shutdown task manager: ${error}`);
                reject(error);
            });
        });
    }

    async function cleanupAsync() {
        console.log("cleaning up ...");
        await shutdownTaskManagerAsync();
        console.log("cleanup done");
    }
    const cleanup = () => { (async () => await cleanupAsync())(); }

    function cleanUpAndExit() {
        cleanupAsync().then(() => process.exit(0));
    }

    process.on("SIGINT", cleanUpAndExit);
    process.on("SIGTERM", cleanUpAndExit);

    if (false) { // TODO: Remove debug stuff
        setTimeout(() => {
            console.log('Trigger debug shutdown');
            cleanup();
        }, 5000);
    }
}());