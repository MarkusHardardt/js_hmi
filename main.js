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
        LanguageSwitching, // direct access: const LanguageSwitching = require('@markus.hardardt/js_utils/src/LanguageSwitching.js');
        TargetSystem, // direct access: const TargetSystem = require('@markus.hardardt/js_utils/src/TargetSystem.js');
        WebSocketConnection, // direct access: const WebSocketConnection = require('@markus.hardardt/js_utils/src/WebSocketConnection.js');
        ContentEditor, // direct access: const ContentEditor = require('@markus.hardardt/js_utils/src/ContentEditor.js');
        TaskManager, // direct access: const TaskManager = require('@markus.hardardt/js_utils/src/TaskManager.js');
        md5, // direct access: const md5 = require('@markus.hardardt/js_utils/ext/md5.js'); // external
        addStaticWebServerJsUtilsFiles
    } = require('@markus.hardardt/js_utils/js_utils.js');

    // Determine config file
    let configFile = './config.json';
    if (process.argv.length > 2 && /\.json$/.test(process.argv[2])) {
        configFile = /^\.\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2];
    }
    const config = require(configFile);

    // create 'hmi' environment object
    const hmi = {
        // add hmi-object-framweork
        create: (object, element, onSuccess, onError, initData) =>
            ObjectLifecycleManager.create(object, element, onSuccess, onError, hmi, initData),
        kill: ObjectLifecycleManager.kill,
        // Environment
        env: {
            isInstance: instance => false, // TODO: Implement isInstance(instance)
            isSimulationEnabled: () => false // TODO: Implement isSimulationEnabled()
        }
    };
    // Prepare web server
    const minimized = true;
    const webServer = new WebServer.Server({ secureKeyFile: config.secureKeyFile, secureCertFile: config.secureCertFile });
    webServer.RandomFileIdEnabled = false;
    webServer.SetTitle('js hmi');
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
    // add the final static file: our hmi main loader
    // webServer.AddStaticFile('./src/BrowserMain.js');
    // webServer.AddStaticFile('./node_modules/@markus.hardardt/js_utils/main/BrowserMain.js'); // external

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
    webServer.Post('/get_client_config', (request, response) => response.send(JsonFX.stringify({
        requestAnimationFrameCycle: config.clientRequestAnimationFrameCycle,
        unsubscribeDelay: config.unsubscribeDelay
    }, false)));

    // prepare content management system
    // we need the handler for database access
    const sqlAdapterFactory = SqlHelper.getAdapterFactory();
    // add directory containing the icons for the configurator
    const configIconDirectory = webServer.AddStaticDir('./node_modules/@markus.hardardt/js_utils/cfg/icons');
    const contentManager = new ContentManager.Instance(sqlAdapterFactory, configIconDirectory);
    hmi.env.cms = contentManager;
    contentManager.RegisterOnWebServer(webServer);

    const taskManager = TaskManager.getInstance(hmi);;
    hmi.env.tasks = taskManager;
    contentManager.RegisterAffectedTypesListener(ContentManager.DataType.Task, taskManager.OnTasksChanged);

    const targetIdValidRegex = /^[a-z0-9_]+$/i;
    const targetIdRegex = /^([a-z0-9_]+):.+$/i;
    class AccessRouterHandler { // TODO: move to separtate file
        constructor() {
            this._dataConnectors = [];
            this._dataAccesObjects = {};
            this._getDataAccessObject = dataId => {
                const match = targetIdRegex.exec(dataId);
                if (!match) {
                    throw new Error(`Invalid id: '${dataId}'`);
                }
                const targetId = match[1];
                const accObj = this._dataAccesObjects[targetId];
                if (!accObj) {
                    throw new Error(`No data access object registered for target '${targetId}' in data id: '${dataId}'`);
                }
                return accObj;
            };
        }

        RegisterDataConnector(dataConnector) {
            for (const connector in this._dataConnectors) {
                if (dataConnector === connector) {
                    console.error('Data connector is already registered');
                    return;
                }
            }
            this._dataConnectors.push(dataConnector);
            const dataPoints = this._getDataPoints();
            dataConnector.SetDataPoints(dataPoints);
        }

        UnregisterDataConnector(dataConnector) {
            for (let i = 0; i < this._dataConnectors.length; i++) {
                if (dataConnector === this._dataConnectors[i]) {
                    this._dataConnectors.splice(i, 1);
                    return;
                }
            }
            console.error('Data connector is not registered');
        }

        RegisterDataAccesObject(targetId, accessObject) {
            if (typeof targetId !== 'string') {
                throw new Error(`Invalid target id: '${targetId}'`);
            } else if (!targetIdValidRegex.test(targetId)) {
                throw new Error(`Invalid target id format: '${targetId}'`);
            } else if (this._dataAccesObjects[targetId] !== undefined) {
                throw new Error(`Target id: '${targetId}' is already registered`);
            } else {
                Common.validateAsDataAccessServerObject(accessObject, true);
                const prefixLength = targetId.length + 1;
                function getRawDataId(dataId) {
                    return dataId.substring(prefixLength);
                }
                this._dataAccesObjects[targetId] = {
                    accessObject,
                    GetType: dataId => accessObject.GetType(getRawDataId(dataId)),
                    SubscribeData: (dataId, onRefresh) => accessObject.SubscribeData(getRawDataId(dataId), onRefresh),
                    UnsubscribeData: (dataId, onRefresh) => accessObject.UnsubscribeData(getRawDataId(dataId), onRefresh),
                    Read: (dataId, onResponse, onError) => accessObject.Read(getRawDataId(dataId), onResponse, onError),
                    Write: (dataId, value) => accessObject.Write(getRawDataId(dataId), value)
                }
                this._updateDataConnectors();
            }
        }

        UnregisterDataAccesObject(targetId, accessObject) {
            if (typeof targetId !== 'string') {
                throw new Error(`Invalid target id: '${targetId}'`);
            } else if (!targetIdValidRegex.test(targetId)) {
                throw new Error(`Invalid target id format: '${targetId}'`);
            } else if (this._dataAccesObjects[targetId] === undefined) {
                throw new Error(`Target id '${targetId}' is not registered`);
            } else if (this._dataAccesObjects[targetId].accessObject !== accessObject) {
                throw new Error(`Target id '${targetId}' is registered for different data access object`);
            } else {
                delete this._dataAccesObjects[targetId];
                this._updateDataConnectors();
            }
        }

        _updateDataConnectors() {
            const dataPoints = this._getDataPoints();
            for (const dataConnector of this._dataConnectors) {
                dataConnector.SetDataPoints(dataPoints, true);
            }
        }

        _getDataPoints() {
            const result = [];
            for (const targetId in this._dataAccesObjects) {
                if (this._dataAccesObjects.hasOwnProperty(targetId)) {
                    const object = this._dataAccesObjects[targetId];
                    const dataPoints = object.accessObject.GetDataPoints();
                    for (const dataPoint of dataPoints) {
                        result.push({ id: `${targetId}:${dataPoint.id}`, type: dataPoint.type });
                    }
                }
            }
            return result;
        }

        get GetDataAccessObject() {
            return this._getDataAccessObject;
        }
    }
    const dataAccessRouterHandler = new AccessRouterHandler();
    hmi.env.router = dataAccessRouterHandler;

    const dataAccessRouter = new DataPoint.Router();
    dataAccessRouter.GetDataAccessObject = dataAccessRouterHandler.GetDataAccessObject;

    const dataAccessPoint = new DataPoint.AccessPoint();
    dataAccessPoint.UnsubscribeDelay = config.unsubscribeDelay;
    dataAccessPoint.Source = dataAccessRouter; // Use the router as source
    hmi.env.data = dataAccessPoint; // Enable access from anyhwere

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
    if (false) {
        const DataIds = Object.freeze({ b: 'test:b', i: 'test:i', f: 'test:f', t: 'test:t' });
        const test_subscriptions = {};
        test_subscriptions[DataIds.b] = { value: false, onRefresh: null };
        test_subscriptions[DataIds.i] = { value: 0, onRefresh: null };
        test_subscriptions[DataIds.f] = { value: 1.618, onRefresh: null };
        test_subscriptions[DataIds.t] = { value: 'hello world', onRefresh: null };
        const test_dataPoints = {
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
        const testDataAccessPoint = new DataPoint.AccessPoint();
        testDataAccessPoint.Source = test_dataPoints;
        setTimeout(() => { // TODO: Renove when tested and running
            testDataAccessPoint.Source = null;
            testDataAccessPoint.Source = test_dataPoints;
        }, 5000)
        dataAccessRouter.GetDataAccessObject = dataId => { // TODO: Refactor this
            const match = /^([a-z0-9_]+):.+$/i.exec(dataId);
            if (!match) {
                throw new Error(`Invalid id: '${dataId}'`);
            } else {
                switch (match[1]) {
                    case 'test':
                        return testDataAccessPoint; // test_dataPoints;
                    default:
                        throw new Error(`Invalid prefix '${match[1]}' id: '${dataId}'`);
                }
            }
        };
    }
    // debug stuff end

    const dataConnectors = {};

    const tasks = [];

    // Prepare web socket server
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
                    const dataConnector = new DataConnector.ServerConnector();
                    dataConnector.Source = dataAccessPoint;
                    dataConnector.Connection = connection;
                    dataConnector.SendDelay = config.sendDelay;
                    dataConnector.SubscribeDelay = config.subscribeDelay;
                    dataConnector.UnsubscribeDelay = config.unsubscribeDelay;
                    /*dataConnector.SetDataPoints([ // TODO: remove
                        { id: DataIds.b, type: Core.DataType.Boolean },
                        { id: DataIds.i, type: Core.DataType.Int64 },
                        { id: DataIds.f, type: Core.DataType.Double },
                        { id: DataIds.t, type: Core.DataType.String }
                    ]);*/
                    // dataConnector.SetDataPoints(dataAccessRouterHandler.GetDataPoints()); // TODO: How to trigger this?
                    dataConnectors[connection.SessionId] = dataConnector;
                    dataConnector.OnOpen();
                    dataAccessRouterHandler.RegisterDataConnector(dataConnector);
                },
                OnReopen: connection => {
                    console.log(`web socket client reopened (sessionId: '${WebSocketConnection.formatSesionId(connection.SessionId)}')`);
                    taskManager.OnReopen(connection);
                    const dataConnector = dataConnectors[connection.SessionId];
                    dataConnector.OnReopen();
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
                    taskManager.OnDispose(connection);
                    const dataConnector = dataConnectors[connection.SessionId];
                    dataConnector.OnDispose();
                    delete dataConnectors[connection.SessionId];
                    dataConnector.Connection = null;
                    dataConnector.Source = null;
                    // dataAccessRouterHandler.UnregisterDataConnector(dataConnector); // TODO: remove line if really not required
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

    tasks.push((onSuccess, onError) => taskManager.Initialize(onSuccess, onError));

    tasks.push((onSuccess, onError) => taskManager.StartAutorunTasks(onSuccess, onError));

    function shutdownTaskManagerAsync() {
        return new Promise((resolve, reject) => {
            taskManager.Shutdown(() => resolve(), error => {
                console.error(`Failed to shutdown task manager: ${error}`);
                reject(error);
            });
        });
    }

    tasks.push((onSuccess, onError) => {
        webServer.Listen(config.webServerPort, () => {
            console.log(`js hmi web server listening on port: ${config.webServerPort}`);
            onSuccess();
        });
    });

    Executor.run(tasks, () => {
        Object.seal(hmi.env);
        Object.seal(hmi);
    }, error => console.error(error));

    async function cleanupAsync() {
        console.log("cleaning up ...");
        await shutdownTaskManagerAsync();
        // await session.close();
        // await client.disconnect();
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