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
    hmi.create = function (object, element, onSuccess, onError, initData) {
        ObjectLifecycleManager.create(object, element, onSuccess, onError, hmi, initData);
    };
    hmi.destroy = ObjectLifecycleManager.destroy;
    hmi.showPopup = function (config, onSuccess, onError) {
        ObjectLifecycleManager.showPopup(hmi, config, onSuccess, onError);
    };
    hmi.showDefaultConfirmationPopup = function (config, onSuccess, onError) {
        ObjectLifecycleManager.showDefaultConfirmationPopup(hmi, config, onSuccess, onError);
    };
    // all static files have been loaded and now we create the hmi.
    $(function () {
        const main = [];
        main.parallel = false;
        // load client config
        let config = false;
        main.push(function (onSuccess, onError) {
            $.ajax({ // TODO: Replace
                type: 'POST',
                url: '/get_client_config',
                contentType: 'application/json;charset=utf-8',
                data: '',
                dataType: 'text',
                success: function (config) {
                    config = jsonfx.parse(config, false, true);
                    onSuccess();
                },
                error: onError,
                timeout: 10000
            });
        });
        // prepare content management system
        main.push(function (onSuccess, onError) {
            hmi.cms = new ContentManager.Proxy(onSuccess, onError);
        });
        main.push(function (onSuccess, onError) {
            const languages = hmi.cms.getLanguages();
            if (Array.isArray(languages) && languages.length > 0) {
                hmi.languages = languages;
                hmi.language = languages[0];
                onSuccess();
            } else {
                onError('no languages available');
            }
        });
        main.push(function (onSuccess, onError) {
            let raf_cycle = typeof config.raf_cycle === 'number' && config.raf_cycle > 0 ? config.raf_cycle : 60;
            let raf_idx = 0;
            let loop = function () {
                raf_idx++;
                if (raf_idx >= raf_cycle) {
                    raf_idx = 0;
                    ObjectLifecycleManager.refresh(new Date());
                }
                window.requestAnimationFrame(loop, document.body);
            };
            // start the loop
            window.requestAnimationFrame(loop, document.body);
            onSuccess();
        });
        // load hmi
        Executor.run(main, function () {
            Object.seal(hmi);
            var body = $(document.body);
            body.empty();
            body.addClass('hmi-body');
            var object = getContentEditor(hmi);
            hmi.create(object, body, function () {
                console.log('js hmi started');
            }, function (error) {
                console.error(error);
            });
            body.on('unload', function () {
                if (clientHandler) {
                    clientHandler.shutdown();
                }
                hmi.destroy(object, function () {
                    console.log('js hmi stopped');
                }, function (error) {
                    console.error(error);
                });
            });
        }, function (error) {
            console.error(error);
        });
    });
}());
