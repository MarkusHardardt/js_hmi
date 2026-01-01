(function () {
    "use strict";

    // create 'hmi' environment object
    const hmi = {};
    // debug brakeports
    hmi.debug_breakpoint = window.debug_breakpoint;
    // here we add our libraries
    hmi.lib = {};
    // load math
    hmi.lib.math = window.math;
    hmi.lib.jsonfx = window.jsonfx;
    hmi.lib.exec = window.Executor;
    hmi.lib.regex = window.Regex;
    // here all droppables will be stored
    hmi.droppables = {};

    // add hmi-object-framweork
    hmi.create = (object, element, onSuccess, onError, initData) => ObjectLifecycleManager.create(object, element, onSuccess, onError, hmi, initData);
    hmi.destroy = ObjectLifecycleManager.destroy;
    hmi.showPopup = (config, onSuccess, onError) => ObjectLifecycleManager.showPopup(hmi, config, onSuccess, onError);
    hmi.showDefaultConfirmationPopup = (config, onSuccess, onError) => ObjectLifecycleManager.showDefaultConfirmationPopup(hmi, config, onSuccess, onError);
    // all static files have been loaded and now we create the hmi.
    $(() => {
        const tasks = [];
        tasks.parallel = false;
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
            const languages = hmi.cms.getLanguages();
            if (Array.isArray(languages) && languages.length > 0) {
                hmi.languages = languages;
                hmi.language = languages[0];
                onSuccess();
            } else {
                onError('no languages available');
            }
        });
        tasks.push((onSuccess, onError) => {
            Client.startRefreshCycle(config.requestAnimationFrameCycle, () => ObjectLifecycleManager.refresh(new Date()));
            onSuccess();
        });
        // load hmi
        Executor.run(tasks, () => {
            Object.seal(hmi);
            var body = $(document.body);
            body.empty();
            body.addClass('hmi-body');
            var object = getContentEditor(hmi);
            hmi.create(object, body, () => console.log('js hmi started'), error => console.error(error));
            body.on('unload', () => {
                if (clientHandler) {
                    clientHandler.shutdown();
                }
                hmi.destroy(object, () => console.log('js hmi stopped'), error => console.error(error));
            });
        }, error => console.error(error));
    });
}());
