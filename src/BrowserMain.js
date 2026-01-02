(function (root) {
    "use strict";

    // create 'hmi' environment object
    const hmi = {};
    // debug brakeports
    hmi.debug_breakpoint = window.debug_breakpoint;
    // here we add our libraries
    hmi.lib = {};
    // load Mathematics
    hmi.lib.Mathematics = root.Mathematics;
    hmi.lib.JsonFX = root.JsonFX;
    hmi.lib.exec = root.Executor;
    hmi.lib.regex = root.Regex;
    // here all droppables will be stored
    hmi.droppables = {};

    hmi.env = {
        isInstance: instance => false, // TODO: Implement isInstance(instance)
        isSimulationEnabled: () => false // TODO: Implement isSimulationEnabled()
    };

    // add hmi-object-framweork
    hmi.create = (object, element, onSuccess, onError, initData) =>
        ObjectLifecycleManager.create(object, element, onSuccess, onError, hmi, initData);
    hmi.destroy = ObjectLifecycleManager.destroy;
    hmi.showPopup = (config, onSuccess, onError) =>
        ObjectLifecycleManager.showPopup(hmi, config, onSuccess, onError);
    hmi.showDefaultConfirmationPopup = (config, onSuccess, onError) =>
        ObjectLifecycleManager.showDefaultConfirmationPopup(hmi, config, onSuccess, onError);
    // all static files have been loaded and now we create the hmi.
    $(() => {
        const tasks = [];
        tasks.parallel = false;

        const dataConnector = new DataConnector.ClientConnector();
        hmi.env.data = dataConnector;

        let webSocketSessionConfig = undefined;
        // Load web socket session config from server
        tasks.push((onSuccess, onError) => Client.fetch('/get_web_socket_session_config', undefined, response => {
            webSocketSessionConfig = JSON.parse(response);
            console.log('Loaded web socket session configuration successfully. Session ID:', webSocketSessionConfig.sessionId);
            onSuccess();
        }, error => {
            console.error(`Error loading web socket session configuration: ${error}`);
            onError(error);
        }));

        let webSocketConnection = undefined;
        tasks.push((onSuccess, onError) => {
            try {
                webSocketConnection = new WebSocketConnection.ClientConnection(document.location.hostname, webSocketSessionConfig, {
                    heartbeatInterval: 2000,
                    heartbeatTimeout: 1000,
                    reconnectStart: 1000,
                    reconnectMax: 32000,
                    OnOpen: () => {
                        console.log(`web socket client opened (sessionId: '${WebSocketConnection.formatSesionId(webSocketConnection.SessionId)}')`);
                        dataConnector.OnOpen();
                    },
                    OnClose: () => {
                        console.log(`web socket client closed (sessionId: '${WebSocketConnection.formatSesionId(webSocketConnection.SessionId)}')`);
                        dataConnector.OnClose();
                    },
                    OnError: error => {
                        console.error(`error in connection (sessionId: '${WebSocketConnection.formatSesionId(webSocketConnection.SessionId)}') to server: ${error}`);
                    }
                });
                dataConnector.Connection = webSocketConnection;
                onSuccess();
            } catch (error) {
                onError(error);
            }
        });
        // load client config
        let config = false;
        tasks.push((onSuccess, onError) => {
            Client.fetch('/get_client_config', null, response => {
                config = JSON.parse(response);
                onSuccess();
            }, onError);
        });
        // prepare content management system
        tasks.push((onSuccess, onError) => hmi.cms = new ContentManager.Proxy(onSuccess, onError));
        tasks.push((onSuccess, onError) => {
            const languages = hmi.cms.GetLanguages();
            if (Array.isArray(languages) && languages.length > 0) {
                hmi.languages = languages;
                hmi.language = languages[0];
                onSuccess();
            } else {
                onError('no languages available');
            }
        });
        let rootObject = null;
        tasks.push((onSuccess, onError) => {
            const params = new URLSearchParams(root.location.search);
            const view = params.get('view');
            const defaultObject = { text: `view: '${view}' is not available` };
            console.log(`view: '${view}'`);
            if (view) {
                hmi.cms.GetObject(view, hmi.language, ContentManager.PARSE, object => {
                    if (object !== null && typeof object === 'object' && !Array.isArray(object)) {
                        rootObject = object;
                    } else {
                        rootObject = { text: `view: '${view}' is not a visual object` }; // TODO: Implement 'better' info object
                    }
                    onSuccess();
                }, error => rootObject = { text: `Failed loading view: '${view}' because of error: ${error}` });  // TODO: Implement 'better' info object
            } else {
                rootObject = ContentEditor.create(hmi);
                onSuccess();
            }
        });
        tasks.push((onSuccess, onError) => {
            Client.startRefreshCycle(config.requestAnimationFrameCycle, () => ObjectLifecycleManager.refresh(new Date()));
            onSuccess();
        });
        // load hmi
        Executor.run(tasks, () => {
            Object.seal(hmi);
            const body = $(document.body);
            body.empty();
            body.addClass('hmi-body');
            hmi.create(rootObject, body, () => console.log('js hmi started'), error => console.error(error));
            body.on('unload', () => {
                hmi.destroy(rootObject, () => console.log('js hmi stopped'), error => console.error(error));
            });
        }, error => console.error(error));
    });
}(globalThis));
