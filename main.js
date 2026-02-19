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
        Logger, // direct access: const Logger = require('@markus.hardardt/js_utils/src/Logger.js');
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

    Logger.setLevel(config.serverLogLevel);

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
            Logger,
            ContentEditor,
            md5
        },
        // Environment
        env: {
            logger: new Logger('js_utils'),
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
    webServer.randomFileIdEnabled = false;
    webServer.setTitle('js_hmi');
    webServer.addStaticDirectory('./images', 'images');
    webServer.prepareFavicon('images/favicon.ico');
    webServer.addStaticFile('./node_modules/jquery/dist/' + (minimized ? 'jquery.min.js' : 'jquery.js'));
    webServer.addStaticFile('./node_modules/jquery-ui-dist/' + (minimized ? 'jquery-ui.min.css' : 'jquery-ui.css'));
    webServer.addStaticFile('./node_modules/jquery-ui-dist/' + (minimized ? 'jquery-ui.min.js' : 'jquery-ui.js'));
    // Note: The next css file references png files by relative paths. Because 'media' is the common root, we must not scramble deeper folders.
    webServer.addStaticFile('./node_modules/datatables/media', minimized ? 'css/jquery.dataTables.min.css' : 'css/jquery.dataTables.css');
    webServer.addStaticFile('./node_modules/datatables/media', minimized ? 'js/jquery.dataTables.min.js' : 'js/jquery.dataTables.js');
    // Note: Don't use this extension! Shows paging even if not configured and every second page is empty.
    // webServer.addStaticFile('./node_modules/datatables.net-scroller/js/dataTables.scroller.js');
    // Note: The next css file references png files by relative paths. Because 'dist' is the common root, we must not scramble deeper folders.
    webServer.addStaticFile('./node_modules/jquery.fancytree/dist', minimized ? 'skin-lion/ui.fancytree.min.css' : 'skin-lion/ui.fancytree.css');
    webServer.addStaticFile('./node_modules/jquery.fancytree/dist/' + (minimized ? 'jquery.fancytree-all.min.js' : 'jquery.fancytree-all.js'));
    webServer.addStaticFile('./ext/jquery/jquery.ui.touch-punch.js');
    webServer.addStaticFile('./ext/jquery/jquery.transform2d.js');
    webServer.addStaticFile('./ext/jquery/ajaxblob.js');
    webServer.addStaticFile('./ext/jquery/layout-default-latest.css');
    webServer.addStaticFile('./ext/jquery/jquery.layout-latest.js');
    webServer.addStaticFile('./ext/jquery/dataTables.pageResize.min.js');
    webServer.addStaticFile('./ext/jquery/dataTables.scrollResize.min.js');
    /*
    webServer.addStaticFile('./ext/jquery/jquery.transform2d.js');
    webServer.addStaticFile('./ext/jquery/ajaxblob.js');
    webServer.addStaticFile('./ext/jquery/layout-default-latest.css');
    webServer.addStaticFile('./ext/jquery/jquery.layout-latest.js');
    webServer.addStaticFile('./ext/jquery/dataTables.pageResize.min.js');
    webServer.addStaticFile('./ext/jquery/dataTables.scrollResize.min.js');
    */
    // TODO: https://codemirror.net/docs/migration/   --> CodeMirror.fromTextArea
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
    webServer.addStaticFile('./node_modules/js-beautify/js/lib/beautify.js');
    webServer.addStaticFile('./node_modules/js-beautify/js/lib/beautify-html.js');
    webServer.addStaticFile('./node_modules/js-beautify/js/lib/beautify-css.js');
    // Note: This needs to be added towards the end because it overrides the dark background of dialogues, which is defined by jquery-ui.css.
    webServer.addStaticFile('./ui/hmi_styles.css');
    addStaticWebServerJsUtilsFiles(webServer);
    // No content - will be generated at runtime inside browser
    webServer.setBody('');
    // deliver main config to client
    webServer.post('/get_client_config', (request, response) => response.send(JsonFX.stringify({
        logLevel: config.clientLogLevel,
        requestAnimationFrameCycle: config.clientRequestAnimationFrameCycle,
        accessPointUnsubscribeDelay: config.clientAccessPointRemoveObserverDelay
    }, false)));
    // prepare content management system
    // we need the handler for database access
    const sqlAdapterFactory = SqlHelper.getAdapterFactory();
    // Setting up content manager and add directory containing the icons for the configurator
    const configIconDirectory = webServer.addStaticDirectory('./node_modules/@markus.hardardt/js_utils/cfg/icons');
    const contentManager = ContentManager.getInstance(hmi.env.logger, sqlAdapterFactory, configIconDirectory);
    hmi.env.cms = contentManager;
    contentManager.registerOnWebServer(webServer);
    // Set up task manager
    const taskManager = TaskManager.getInstance(hmi);
    hmi.env.tasks = taskManager;
    contentManager.registerAffectedTypesListener(ContentManager.DataType.Task, taskManager.onTasksChanged);
    // Set up the handler for routing to individual target systems
    const dataAccessRouter = new DataPoint.Router(hmi.env.logger);
    hmi.env.router = dataAccessRouter;
    // Set up a simple router using the target system router
    const dataAccessSwitch = new DataPoint.Switch(dataAccessRouter.getDataAccessObject); // Use the access router handler as source
    // Set up the server side access point
    const dataAccessPoint = new DataPoint.AccessPoint(hmi.env.logger, dataAccessSwitch); // Use the router as source
    dataAccessPoint.removeObserverDelay = config.serverAccessPointRemoveObserverDelay;
    if (typeof config.serverAccessPointRemoveObserverDelay === 'number' && config.serverAccessPointRemoveObserverDelay > 0) {
        dataAccessRouter.onBeforeUpdateDataConnectors = () => dataAccessPoint.removeObserverDelay = false;
        dataAccessRouter.onAfterUpdateDataConnectors = () => dataAccessPoint.removeObserverDelay = config.serverAccessPointRemoveObserverDelay;
    }
    hmi.env.data = dataAccessPoint; // Enable access from anyhwere

    // Add static finels
    function addStaticFiles(file) {
        if (Array.isArray(file)) {
            for (const f of file) {
                addStaticFiles(f);
            }
        } else if (typeof file === 'string' && file.length > 0) {
            webServer.addStaticFile(file);
        }
    }
    addStaticFiles(config.staticClientFiles);
    webServer.addStaticFile(config.touch ? config.scrollbar_hmi : config.scrollbar_config);

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
    webServer.post('/get_web_socket_session_config',
        (request, response) => response.send(JsonFX.stringify(webSocketServer.createSessionConfig(), false))
    );
    tasks.push((onSuccess, onError) => {
        try {
            webSocketServer = new WebSocketConnection.Server(hmi.env.logger, config.webSocketPort, {
                secure: webServer.isSecure,
                autoConnect: config.autoConnect,
                closedConnectionDisposeTimeout: config.closedConnectionDisposeTimeout,
                onOpen: connection => {
                    hmi.env.logger.info(`web socket client opened (sessionId: '${WebSocketConnection.formatSesionId(connection.sessionId)}')`);
                    taskManager.onOpen(connection);
                    const dataConnector = DataConnector.getInstance(hmi.env.logger);
                    dataConnector.source = dataAccessPoint;
                    dataConnector.connection = connection;
                    dataConnector.sendDelay = config.dataConnectorSendDelay;
                    dataConnector.addObserverDelay = config.dataConnectorAddObserverDelay;
                    dataConnector.removeObserverDelay = config.dataConnectorRemoveObserverDelay;
                    dataConnectors[connection.sessionId] = dataConnector;
                    dataAccessRouter.registerDataConnector(dataConnector);
                    dataConnector.onOpen();
                },
                onReopen: connection => {
                    hmi.env.logger.info(`web socket client reopened (sessionId: '${WebSocketConnection.formatSesionId(connection.sessionId)}')`);
                    taskManager.onOpen(connection);
                    const dataConnector = dataConnectors[connection.sessionId];
                    dataConnector.OnOpen();
                    dataAccessRouter.registerDataConnector(dataConnector);
                },
                onClose: connection => {
                    hmi.env.logger.info(`web socket client closed (sessionId: '${WebSocketConnection.formatSesionId(connection.sessionId)}')`);
                    taskManager.onClose(connection);
                    const dataConnector = dataConnectors[connection.sessionId];
                    dataConnector.onClose();
                    dataAccessRouter.unregisterDataConnector(dataConnector);
                },
                onDispose: connection => {
                    hmi.env.logger.info(`web socket client disposed (sessionId: '${WebSocketConnection.formatSesionId(connection.sessionId)}')`);
                    taskManager.onClose(connection);
                    const dataConnector = dataConnectors[connection.sessionId];
                    dataConnector.onClose();
                    delete dataConnectors[connection.sessionId];
                    dataConnector.connection = null;
                    dataConnector.source = null;
                },
                onError: (connection, error) => {
                    hmi.env.logger.error(`error in connection (sessionId: '${WebSocketConnection.formatSesionId(connection.sessionId)}') to server`, error);
                }
            });
            onSuccess();
        } catch (error) {
            onError(error);
        }
    });

    tasks.push((onSuccess, onError) => taskManager.initialize(onSuccess, onError));

    tasks.push((onSuccess, onError) => taskManager.startAutorunTasks(onSuccess, onError));

    tasks.push((onSuccess, onError) => {
        webServer.listen(config.webServerPort, () => {
            hmi.env.logger.info(`js_hmi web server listening on port: ${config.webServerPort}`);
            onSuccess();
        });
    });

    Executor.run(tasks, () => hmi.env.logger.info('js_hmi running'), error => hmi.env.logger.error(error));

    function shutdownTaskManagerAsync() {
        return new Promise((resolve, reject) => {
            taskManager.shutdown(() => resolve(), error => {
                hmi.env.logger.error(`Failed to shutdown task manager: ${error}`);
                reject(error);
            });
        });
    }

    async function cleanupAsync() {
        hmi.env.logger.info("cleaning up ...");
        await shutdownTaskManagerAsync();
        hmi.env.logger.info("cleanup done");
    }
    const cleanup = () => { (async () => await cleanupAsync())(); }

    function cleanUpAndExit() {
        cleanupAsync().then(() => process.exit(0));
    }

    process.on("SIGINT", cleanUpAndExit);
    process.on("SIGTERM", cleanUpAndExit);

    if (false) { // TODO: Remove debug stuff
        setTimeout(() => {
            hmi.env.logger.info('Trigger debug shutdown');
            cleanup();
        }, 5000);
    }
}());