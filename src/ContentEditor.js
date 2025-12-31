(function () {
    "use strict";

    const DEFAULT_ROW_HEIGHT = '24px';
    const DEFAULT_COLUMN_WIDTH = '64px';
    const SMALL_COLUMN_WIDTH = '42px';
    const BIG_COLUMN_WIDTH = '80px';
    const HEADER_HEIGHT = '54px';
    const DEFAULT_TIMEOUT = 2000;
    const ALARM_COLOR = '#ff0000';
    const VALID_COLOR = '#000000';
    const SEPARATOR = 4;

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // DIVERSE
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    function handleScrolls(scrolls, id, textarea, restore) {
        scrolls = textarea.hmi_handleScrollParams(scrolls[id], restore);
        if (scrolls.viewport_left > 0 || scrolls.viewport_top) {
            scrolls[id] = scrolls;
        }
        else {
            delete scrolls[id];
        }
    }

    function updateScrolls(scrolls, params) {
        switch (params.action) {
            case ContentManager.COPY:
                var objs = params.objects, i, l = scrolls.length, scrolls, src, data, attr, copy;
                for (src in objs) {
                    if (objs.hasOwnProperty(src)) {
                        for (i = 0; i < l; i++) {
                            scrolls = scrolls[i];
                            data = scrolls[src];
                            if (data) {
                                copy = {};
                                for (attr in data) {
                                    if (data.hasOwnProperty(attr)) {
                                        copy[attr] = data[attr];
                                    }
                                }
                                scrolls[objs[src]] = copy;
                            }
                        }
                    }
                }
                break;
            case ContentManager.MOVE:
                var objs = params.objects, i, l = scrolls.length, scrolls, src;
                for (src in objs) {
                    if (objs.hasOwnProperty(src)) {
                        for (i = 0; i < l; i++) {
                            scrolls = scrolls[i];
                            data = scrolls[src];
                            if (data) {
                                delete scrolls[src];
                                scrolls[objs[src]] = data;
                            }
                        }
                    }
                }
                break;
            case ContentManager.DELETE:
                var objs = params.objects, i, l = scrolls.length, scrolls, src = params.source;
                if (objs) {
                    for (src in objs) {
                        if (objs.hasOwnProperty(src)) {
                            for (i = 0; i < l; i++) {
                                delete scrolls[i][src];
                            }
                        }
                    }
                }
                else {
                    for (i = 0; i < l; i++) {
                        delete scrolls[i][src];
                    }
                }
                break;
            case ContentManager.INSERT:
                // nothing to do
                break;
            case ContentManager.UPDATE:
                // nothing to do
                break;
        }
    }

    function getHandler(desc, lab, htm, txt, jso) {
        if (!desc) {
            return false;
        } else if (desc.jsonfx) {
            return { cont: jso, desc };
        } else if (!desc.multilingual) {
            return { cont: txt, desc };
        } else if (desc.multiedit) {
            return { cont: lab, desc };
        } else {
            return { cont: htm, desc };
        }
    }

    function updateContainer(container, previous, next, data, language, onSuccess, onError) {
        if (previous) {
            if (next) {
                if (previous !== next) {
                    previous.keyChanged(false, language, () => {
                        container.hmi_removeContent(() => {
                            container.hmi_setContent(next, () => next.keyChanged(data, language, onSuccess, onError), onError);
                        }, onError);
                    }, onError);
                } else {
                    next.keyChanged(data, language, onSuccess, onError);
                }
            } else {
                previous.keyChanged(false, language, () => container.hmi_removeContent(onSuccess, onError), onError);
            }
        } else if (next) {
            container.hmi_setContent(next, () => next.keyChanged(data, language, onSuccess, onError), onError);
        } else {
            onSuccess();
        }
    }

    function performModification(hmi, startEditChecksum, startEditId, id, language, value, onSuccess, onError) {
        let cms = hmi.cms, tasks = [], checksum = false, equal_id = startEditId === id;
        if (equal_id) {
            tasks.push((onSuc, onErr) => {
                cms.getChecksum(id, cs => {
                    checksum = cs;
                    onSuc();
                }, onErr);
            });
        }
        Executor.run(tasks, () => {
            if (equal_id && startEditChecksum !== checksum) {
                let txt = '<b>';
                txt += 'Object has been modified!';
                txt += '</b><br><code>';
                txt += id;
                txt += '</code><br><br>';
                txt += 'Select new id';
                hmi.showDefaultConfirmationPopup({
                    width: $(window).width() * 0.4,
                    height: $(window).height() * 0.3,
                    title: 'Warning',
                    html: txt,
                    ok: () => onSuccess(false),
                    closed: () => onSuccess(false)
                });
            } else {
                cms.getModificationParams(id, language, value, params => {
                    if (typeof params.error === 'string') {
                        if (typeof onError === 'function') {
                            onError(params.error);
                        }
                    } else if (params.action === 'delete') {
                        if (Array.isArray(params.externalUsers) && params.externalUsers.length > 0) {
                            let txt = '<b>';
                            txt += 'Object is referenced!';
                            txt += '</b><br><b>';
                            txt += 'Sure to proceed?';
                            txt += '</b><br><code>';
                            for (let i = 0; i < params.externalUsers.length; i++) {
                                if (i > 10) {
                                    txt += '<br>...';
                                    break;
                                }
                                txt += '<br>';
                                txt += params.externalUsers[i];
                            }
                            txt += '</code>';
                            hmi.showDefaultConfirmationPopup({
                                width: $(window).width() * 0.8,
                                height: $(window).height() * 0.8,
                                title: 'Warning',
                                html: txt,
                                yes: () => cms.setObject(id, language, value, params.checksum, () => onSuccess(params), onError),
                                cancel: () => onSuccess(false),
                                closed: () => onSuccess(false)
                            });
                        } else {
                            cms.setObject(id, language, value, params.checksum, () => onSuccess(params), onError);
                        }
                    } else if (!equal_id) {
                        // if the id has changed
                        cms.exists(id, exists => {
                            if (exists !== false) {
                                let txt = '<b>';
                                txt += 'Identificator already exists!';
                                txt += '</b><br><code>';
                                txt += id;
                                txt += '</code><br><br>';
                                txt += 'Sure to proceed?';
                                hmi.showDefaultConfirmationPopup({
                                    width: $(window).width() * 0.8,
                                    height: $(window).height() * 0.8,
                                    title: 'Warning',
                                    html: txt,
                                    yes: () => cms.setObject(id, language, value, params.checksum, () => onSuccess(params), onError),
                                    cancel: () => onSuccess(false),
                                    closed: () => onSuccess(false)
                                });
                            } else {
                                cms.setObject(id, language, value, params.checksum, () => onSuccess(params), onError);
                            }
                        }, onError)
                    } else {
                        // selected node has changed
                        cms.setObject(id, language, value, params.checksum, () => onSuccess(params), onError);
                    }
                }, onError);
            }
        }, onError);
    }

    function performRefactoring(hmi, source, target, action, onSuccess, onEerror) {
        var cms = hmi.cms;
        cms.getRefactoringParams(source, target, action, params => {
            // console.log(JSONX.stringify(i_params));
            if (typeof params.error === 'string') {
                hmi.showDefaultConfirmationPopup({
                    width: $(window).width() * 0.8,
                    height: $(window).height() * 0.8,
                    title: 'Warning',
                    html: params.error,
                    ok: () => onSuccess(false),
                    closed: () => onSuccess(false)
                });
            } else if (params.action === ContentManager.DELETE) {
                let txt = '';
                if (params.externalUsers !== undefined && Array.isArray(params.externalUsers) && params.externalUsers.length > 0) {
                    txt += '<b>';
                    txt += 'Object is referenced!';
                    txt += '</b><br><code>';
                    for (let i = 0; i < params.externalUsers.length; i++) {
                        if (i > 10) {
                            txt += '<br>...';
                            break;
                        }
                        txt += '<br>';
                        txt += params.externalUsers[i];
                    }
                    txt += '</code>';
                } else {
                    txt += '<b>';
                    txt += 'Delete:';
                    txt += ':</b><br><code>';
                    txt += source;
                    txt += '</code>';
                }
                txt += '<br><br><b>';
                txt += 'Sure to proceed?';
                txt += '</b>';
                hmi.showDefaultConfirmationPopup({
                    width: $(window).width() * 0.8,
                    height: $(window).height() * 0.8,
                    title: 'Warning',
                    html: txt,
                    yes: () => cms.performRefactoring(source, target, action, params.checksum, () => onSuccess(params), onEerror),
                    cancel: () => onSuccess(false),
                    closed: () => onSuccess(false)
                });
            } else if (params.action === ContentManager.MOVE || params.action === ContentManager.COPY) {
                if (params.existingTargets !== undefined && Array.isArray(params.existingTargets) && params.existingTargets.length > 0) {
                    let txt = '<b>';
                    txt += 'Object already exists!';
                    txt += '</b><br><code>';
                    for (let i = 0; i < params.existingTargets.length; i++) {
                        if (i > 10) {
                            txt += '<br>...';
                            break;
                        }
                        txt += '<br>';
                        txt += params.existingTargets[i];
                    }
                    txt += '</code>';
                    txt += '<br><br><b>';
                    txt += 'Sure to proceed?';
                    txt += '</b>';
                    hmi.showDefaultConfirmationPopup({
                        width: $(window).width() * 0.8,
                        height: $(window).height() * 0.8,
                        title: 'Warning',
                        html: txt,
                        yes: () => cms.performRefactoring(source, target, action, params.checksum, () => onSuccess(params), onEerror),
                        cancel: () => onSuccess(false),
                        closed: () => onSuccess(false)
                    });
                } else {
                    cms.performRefactoring(source, target, action, params.checksum, () => onSuccess(params), onEerror);
                }
            } else {
                onSuccess(false);
            }
        }, onEerror);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // LANGUAGES
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    function getLanguageSelector(hmi, adapter) {
        let langs = hmi.cms.getLanguages(), language = langs[0], children = [{
            x: 0,
            y: 0,
            align: 'right',
            text: 'languages:'
        }], columns = [1], select_language = btn => {
            for (let i = 0, l = children.length; i < l; i++) {
                let button = children[i];
                button.hmi_setSelected(button === btn);
            }
            language = btn.text;
            adapter.languageChanged(language);
        };
        for (let i = 0, l = langs.length; i < l; i++) {
            let lang = langs[i];
            children.push({
                x: i + 1,
                y: 0,
                text: lang,
                border: true,
                selected: i === 0,
                clicked: function () { // Note: Do not change to lambda function becaus 'this' will not be the button anymore!
                    select_language(this);
                }
            });
            columns.push(DEFAULT_COLUMN_WIDTH);
        }
        return {
            type: 'grid',
            columns: columns,
            rows: 1,
            separator: SEPARATOR,
            children: children,
            getLanguage: () => language
        };
    }

    function compareErrors(error1, error2) {
        let time1 = error1.date.getTime();
        let time2 = error2.date.getTime();
        return time2 !== time1 ? time2 - time1 : Sorting.compareTextsAndNumbers(error1.text, i_error12.text, false, false);
    }

    function getLogHandler(hmi) {
        let errors = [], last_read_offset = 0, push = entry => {
            let idx = Sorting.getInsertionIndex(entry, errors, false, compareErrors);
            errors.splice(idx, 0, entry);
            last_read_offset++;
            update();
        }, update = () => {
            let active = last_read_offset > 0;
            // button[active ? 'hmi_removeClass' :
            // 'hmi_addClass']('highlighted-green');
            button[active ? 'hmi_addClass' : 'hmi_removeClass']('highlighted-red');
            button.hmi_text(active ? 'error' : 'info');
            button.hmi_css('color', active ? 'white' : 'black');
            // container.hmi_setEnabled(active);
            if (active) {
                let txt = errors[0].text;
                if (errors.length > 1) {
                    txt += ' (' + (errors.length - 1) + ' more errors)';
                }
                info.hmi_value(txt);
            }
        }, info = {
            type: 'textfield',
            editable: false
        }, button = {
            text: 'info',
            border: true,
            clicked: () => {
                let table = {
                    location: 'top',
                    type: 'table',
                    highlightSelectedRow: true,
                    searching: true,
                    paging: false,
                    columns: [{
                        width: 15,
                        text: 'timestamp',
                        textsAndNumbers: true
                    }, {
                        width: 85,
                        text: 'error',
                        textsAndNumbers: true
                    }],
                    getRowCount: () => errors.length,
                    getCellHtml: (row, column) => {
                        let error = errors[row];
                        switch (column) {
                            case 0:
                                return Utilities.formatTimestamp(error.date);
                            case 1:
                                return error.text;
                            default:
                                return '';
                        }
                    },
                    prepare: (that, onSuccess, onError) => {
                        table.hmi_reload();
                        onSuccess();
                    },
                    handleTableRowClicked: (row) => {
                        let error = errors[row];
                        textarea.hmi_value(Utilities.formatTimestamp(error.date) + '\n' + error.text);
                    }
                };
                let textarea = {
                    location: 'bottom',
                    type: 'textarea',
                    editable: false
                };
                let popup_object = {
                    type: 'split',
                    topSize: math.GOLDEN_CUT_INVERTED,
                    columns: 1,
                    rows: [3, 1],
                    children: [table, textarea]
                };
                let buttons = [];
                if (errors.length > 0) {
                    buttons.push({
                        text: 'clear all',
                        click: onClose => {
                            errors.splice(0, errors.length);
                            last_read_offset = 0;
                            info.hmi_value('');
                            update();
                            onClose();
                        }
                    });
                }
                if (last_read_offset > 0) {
                    buttons.push({
                        text: 'reset',
                        click: onClose => {
                            last_read_offset = 0;
                            info.hmi_value('');
                            update();
                            onClose();
                        }
                    });
                    buttons.push({
                        text: 'cancel',
                        click: onClose => {
                            update();
                            onClose();
                        }
                    });
                }
                else {
                    buttons.push({
                        text: 'ok',
                        click: onClose => {
                            update();
                            onClose();
                        }
                    });
                }
                hmi.showPopup({
                    title: 'errors',
                    width: Math.floor($(window).width() * 0.9),
                    height: Math.floor($(window).height() * 0.95),
                    object: popup_object,
                    buttons: buttons
                });
            },
            pushError: error => {
                push({
                    date: new Date(),
                    data: error,
                    text: typeof error === 'string' ? error : (error ? error.toString() : 'unknown'),
                    timeout: false
                });
                console.error(error);
            },
            pushTimeout: message => {
                push({
                    date: new Date(),
                    data: message,
                    text: typeof message === 'string' ? message : (message ? message.toString() : 'unknown'),
                    timeout: true
                });
                console.error(message);
            },
            prepare: (that, onSuccess, onError) => {
                update();
                onSuccess();
            },
            reset: () => {
                last_read_offset = 0;
                info.hmi_value('');
                update();
            },
            updateInfo: info => {
                if (last_read_offset === 0) {
                    info.hmi_value(info);
                }
            }
        };
        button.info = info;
        return button;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // KEY TEXTFIELD
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    function getKeyTextfield(hmi, adapter) {
        const cms = hmi.cms;
        const keyTextField = {
            x: 0,
            y: 0,
            type: 'textfield',
            border: false,
            prepare: (that, onSuccess, onError) => {
                that._keyup = event => {
                    if (event.which === 13) {
                        var path = that.hmi_value().trim();
                        adapter.keySelected(cms.analyzeID(path));
                    }
                };
                that.hmi_getTextField().on('keyup', that._keyup);
                that._on_change = () => {
                    var data = cms.analyzeID(that.hmi_value().trim());
                    that._update_color(data);
                    adapter.keyEdited(data);
                };
                that.hmi_addChangeListener(that._on_change);
                onSuccess();
            },
            destroy: (that, onSuccess, onError) => {
                that.hmi_getTextField().off('keyup', that._keyup);
                delete that._keyup;
                that.hmi_removeChangeListener(that._on_change);
                delete that._on_change;
                onSuccess();
            },
            _update_color: data => keyTextField.hmi_getTextField().css('color', data.file || data.folder ? VALID_COLOR : ALARM_COLOR),
            update: data => {
                keyTextField.hmi_value(data.id);
                keyTextField._update_color(data);
            },
            getIdData: () => cms.analyzeID(keyTextField.hmi_value().trim())
        };
        return keyTextField;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // BROWSER TREE
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    function getBrowserTree(hmi, adapter) {
        let cms = hmi.cms, sel_data, selected = false, unstress = Executor.unstress(adapter.notifyError, () => adapter.notifyTimeout(sel_data), DEFAULT_TIMEOUT);
        const tree = {
            x: 0,
            y: 2,
            type: 'tree',
            rootURL: ContentManager.GET_CONTENT_TREE_NODES_URL,
            rootRequest: ContentManager.COMMAND_GET_CHILD_TREE_NODES,
            compareNodes: (node1, node2) => cms.compare(node1.data.path, node2.data.path),
            nodeActivated: node => {
                let path = node.data.path;
                if (selected !== path) {
                    selected = path;
                    adapter.keySelected(cms.analyzeID(path));
                }
            },
            nodeClicked: node => {
                selected = node.data.path;
                adapter.keySelected(cms.analyzeID(selected));
            },
            expand: data => {
                unstress((onSuccess, onError) => {
                    sel_data = data;
                    tree.hmi_setActivePath(data.id, node => tree.hmi_updateLoadedNodes(onSuccess, onError), onError);
                });
            }
        };
        return tree;
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // SEARCH CONTAINER
    // ///////////////////////////////////////////////////////////////////////////////////////////////
    function getSearchContainer(hmi, adapter) {
        let cms = hmi.cms, search_running = false, perform_search = () => {
            let key = search_key_textfield.hmi_value().trim();
            let value = search_value_textfield.hmi_value().trim();
            if (key.length > 0 || value.length > 0) {
                search_running = true;
                button_search.hmi_setEnabled(false);
                cms.getSearchResults(key, value, results => {
                    search_running = false;
                    button_search.hmi_setEnabled(true);
                    search_results.splice(0, search_results.length);
                    for (let i = 0, l = results.length; i < l; i++) {
                        let id = results[i], icon = cms.getIcon(id);
                        search_results.push({
                            id: id,
                            icon: icon
                        });
                    }
                    search_table.hmi_reload();
                }, error => adapter.notifyError(error));
            }
        }, trigger_search = event => {
            if (event.which === 13 && !search_running) {
                perform_search();
            }
        }, search_key_textfield = {
            x: 1,
            y: 0,
            type: 'textfield',
            border: false,
            prepare: (that, onSuccess, onError) => {
                that.hmi_getTextField().on('keyup', trigger_search);
                onSuccess();
            },
            destroy: (that, onSuccess, onError) => {
                that.hmi_getTextField().off('keyup', trigger_search);
                onSuccess();
            }
        }, search_value_textfield = {
            x: 3,
            y: 0,
            type: 'textfield',
            border: false,
            prepare: (that, onSuccess, onError) => {
                that.hmi_getTextField().on('keyup', trigger_search);
                onSuccess();
            },
            destroy: (that, onSuccess, onError) => {
                that.hmi_getTextField().off('keyup', trigger_search);
                onSuccess();
            }
        }, button_search = {
            x: 4,
            y: 0,
            text: 'search',
            border: true,
            clicked: () => {
                if (!search_running) {
                    perform_search();
                }
            }
        }, search_results = [], search_table = {
            x: 0,
            y: 1,
            width: 5,
            height: 1,
            type: 'table',
            searching: false,
            paging: false,
            highlightSelectedRow: true,
            columns: [{
                width: 150,
                text: 'identificator',
                textsAndNumbers: true
            }, {
                width: 10,
                text: 'type'
            }],
            getRowCount: () => search_results.length,
            getCellHtml: (row, column) => {
                let result = search_results[row];
                switch (column) {
                    case 0:
                        let id = result.id;
                        return id.length < 80 ? id : id.substr(0, 35) + ' ... ' + id.substr(id.length - 45, id.length);
                    case 1:
                        return '<img src="' + result.icon + '" />';
                    default:
                        return '';
                }
            },
            handleTableRowClicked: row => adapter.keySelected(cms.analyzeID(search_results[row].id))
        };
        return {
            visible: false,
            type: 'grid',
            x: 0,
            y: 2,
            separator: SEPARATOR,
            columns: [SMALL_COLUMN_WIDTH, 1, SMALL_COLUMN_WIDTH, 1, DEFAULT_COLUMN_WIDTH],
            rows: [DEFAULT_ROW_HEIGHT, 1],
            children: [{
                x: 0,
                y: 0,
                text: 'key:',
                align: 'right'
            }, search_key_textfield, {
                x: 2,
                y: 0,
                text: 'value:',
                align: 'right'
            }, search_value_textfield, button_search, search_table]
        };
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // MAIN NAIGATION BROWSER
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    var get_navigator = function (i_hmi, i_adapter, i_key_textfield, i_browser_tree, i_search_container) {
        var cms = i_hmi.cms;
        var update_mode = function (i_button) {
            button_select_browse.selected = i_button === button_select_browse;
            button_select_browse.hmi_setSelected(button_select_browse.selected);
            button_select_search.selected = i_button === button_select_search;
            button_select_search.hmi_setSelected(button_select_search.selected);
            if (button_select_browse.selected) {
                i_adapter.showBrowserTree();
            }
            else {
                i_adapter.showSearchTable();
            }
        };
        var button_select_browse = {
            x: 1,
            y: 0,
            text: 'browse',
            border: true,
            selected: true,
            clicked: function () {
                update_mode(this);
            }
        };
        var button_select_search = {
            x: 2,
            y: 0,
            text: 'search',
            border: true,
            clicked: function () {
                update_mode(this);
            }
        };
        var button_reload = {
            x: 3,
            y: 0,
            text: 'reload',
            border: true,
            clicked: i_adapter.reload
        };
        return {
            type: 'grid',
            columns: 1,
            rows: [DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT, 1],
            children: [i_key_textfield, {
                type: 'grid',
                x: 0,
                y: 1,
                columns: [1, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],
                rows: [DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT, 1],
                children: [{
                    x: 0,
                    y: 0,
                    align: 'right',
                    text: 'hmijs-content-manager'
                }, button_select_browse, button_select_search, button_reload]
            }, i_browser_tree, i_search_container],
            showBrowser: function () {
                update_mode(button_select_browse);
            }
        };
    };

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // CROSS REFERENCES BROWSER
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    var get_references = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, sel_data, selected = false, unstress = Executor.unstress(i_adapter.notifyError, function () {
            i_adapter.notifyTimeout(sel_data);
        }, DEFAULT_TIMEOUT);
        ;
        var text = {
            x: 0,
            y: 1,
            width: 4,
            height: 1,
            id: 'path',
            type: 'textfield',
            readonly: true
        };
        var tree = {
            x: 0,
            y: 2,
            width: 4,
            height: 1,
            type: 'tree',
            rootURL: ContentManager.GET_CONTENT_TREE_NODES_URL,
            rootRequest: ContentManager.COMMAND_GET_REFERENCES_TO_TREE_NODES,
            compareNodes: function (i_node1, i_node2) {
                return cms.compare(i_node1.data.path, i_node2.data.path);
            },
            nodeActivated: function (i_node) {
                var path = i_node.data.path;
                text.hmi_value(path);
                if (selected !== path) {
                    selected = path;
                    i_adapter.keySelected(cms.analyzeID(path));
                }
            },
            nodeClicked: function (i_node) {
                selected = i_node.data.path;
                text.hmi_value(selected);
                i_adapter.keySelected(cms.analyzeID(selected));
            }
        };
        var updateReferences = function (i_button) {
            if (i_button) {
                buttonRefTo.hmi_setSelected(buttonRefTo === i_button);
                buttonRefFrom.hmi_setSelected(buttonRefFrom === i_button);
            }
            unstress(function (i_success, i_error) {
                text.hmi_value(sel_data.id);
                tree.hmi_setRootPath(sel_data.id, i_success, i_error);
            });
        };
        var buttonRefTo = {
            x: 1,
            y: 0,
            border: true,
            text: 'uses',
            selected: true,
            clicked: function () {
                tree.rootRequest = ContentManager.COMMAND_GET_REFERENCES_TO_TREE_NODES;
                updateReferences(this);
            }
        };
        var buttonRefFrom = {
            x: 2,
            y: 0,
            border: true,
            text: 'users',
            clicked: function () {
                tree.rootRequest = ContentManager.COMMAND_GET_REFERENCES_FROM_TREE_NODES;
                updateReferences(this);
            }
        };
        var buttonEdit = {
            x: 3,
            y: 0,
            border: true,
            text: 'browse',
            clicked: function () {
                i_adapter.selectInNavigator(cms.analyzeID(text.hmi_value()));
            }
        };
        return {
            type: 'grid',
            columns: [1, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],
            rows: [DEFAULT_ROW_HEIGHT, DEFAULT_ROW_HEIGHT, 1],
            children: [text, {
                x: 0,
                y: 0,
                align: 'right',
                text: 'cross references:'
            }, buttonRefTo, buttonRefFrom, buttonEdit, tree],
            setRootIdData: function (i_data) {
                sel_data = i_data;
                updateReferences();
            },
            update: updateReferences,
            getIdData: function () {
                return cms.analyzeID(text.hmi_value());
            }
        };
    };

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // LABELS - PREVIEW & EDITOR
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    var get_lab_preview = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, langs = i_hmi.cms.getLanguages(), children = [], rows = [], values = {};
        var reload = function (i_data, i_language, i_success, i_error) {
            if (i_data && i_data.file) {
                cms.getObject(i_data.file, undefined, ContentManager.INCLUDE, function (i_build) {
                    if (i_build !== undefined) {
                        for (var i = 0, l = langs.length; i < l; i++) {
                            var lang = langs[i], lab = i_build[lang];
                            values[lang].hmi_html(lab || '');
                        }
                    }
                    else {
                        for (var i = 0, l = langs.length; i < l; i++) {
                            values[langs[i]].hmi_html('');
                        }
                    }
                    i_success();
                }, function (i_exception) {
                    for (var i = 0, l = langs.length; i < l; i++) {
                        values[langs[i]].hmi_html('');
                    }
                    i_error(i_exception);
                });
            }
            else {
                for (var i = 0, l = langs.length; i < l; i++) {
                    values[langs[i]].hmi_html('');
                }
                i_success();
            }
        };
        for (var i = 0, l = langs.length; i < l; i++) {
            var lang = langs[i];
            children.push({
                x: 0,
                y: i,
                text: lang,
                border: false,
                classes: 'hmi-dark'
            });
            var obj = {
                x: 1,
                y: i,
                align: 'left',
                border: false,
                classes: 'hmi-dark'
            };
            children.push(obj);
            values[lang] = obj;
            rows.push(DEFAULT_ROW_HEIGHT);
        }
        rows.push(1);
        return {
            type: 'grid',
            columns: [DEFAULT_COLUMN_WIDTH, 1],
            rows: rows,
            children: children,
            keyChanged: function (i_data, i_language, i_success, i_error) {
                reload(i_data, i_language, i_success, i_error);
            }
        };
    };

    var get_lab_editor = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, langs = cms.getLanguages(), children = [], rows = [], values = {};
        var reload = function (i_data, i_language, i_success, i_error) {
            if (i_data && i_data.file) {
                cms.getObject(i_data.file, undefined, ContentManager.RAW, function (i_raw) {
                    if (i_raw !== undefined) {
                        for (var i = 0, l = langs.length; i < l; i++) {
                            var lang = langs[i], lab = i_raw[lang];
                            values[lang].hmi_value(lab || '');
                        }
                    }
                    else {
                        for (var i = 0, l = langs.length; i < l; i++) {
                            values[langs[i]].hmi_value('');
                        }
                    }
                    i_success();
                }, function (i_exception) {
                    for (var i = 0, l = langs.length; i < l; i++) {
                        values[langs[i]].hmi_value('');
                    }
                    i_error(i_exception);
                });
            }
            else {
                for (var i = 0, l = langs.length; i < l; i++) {
                    values[langs[i]].hmi_value('');
                }
                i_success();
            }
        };
        for (var i = 0, l = langs.length; i < l; i++) {
            var lang = langs[i];
            children.push({
                x: 0,
                y: i,
                text: lang,
                border: false,
                classes: 'hmi-dark'
            });
            var obj = {
                x: 1,
                y: i,
                type: 'textfield',
                editable: true,
                border: false,
                classes: 'hmi-dark',
                prepare: function (that, i_success, i_error) {
                    this.hmi_addChangeListener(i_adapter.edited);
                    i_success();
                },
                destroy: function (that, i_success, i_error) {
                    this.hmi_removeChangeListener(i_adapter.edited);
                    i_success();
                }
            };
            children.push(obj);
            values[lang] = obj;
            rows.push(DEFAULT_ROW_HEIGHT);
        }
        rows.push(1);
        var get_value = function () {
            var value = {};
            for (var lang in values) {
                if (values.hasOwnProperty(lang)) {
                    value[lang] = values[lang].hmi_value().trim();
                }
            }
            return value;
        };
        return {
            type: 'grid',
            columns: [DEFAULT_COLUMN_WIDTH, 1],
            rows: rows,
            children: children,
            keyChanged: reload,
            getValue: get_value
        };
    };

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // HTML - PREVIEW & EDITOR
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    var get_htm_preview = function (i_hmi, i_adapter) {
        var mode = ContentManager.RAW, update_mode = function (i_mode) {
            mode = i_mode;
            button_include.selected = i_mode === ContentManager.INCLUDE;
            button_include.hmi_setSelected(button_include.selected);
            button_raw.selected = i_mode === ContentManager.RAW;
            button_raw.hmi_setSelected(button_raw.selected);
            i_adapter.triggerReload();
        };
        var reload = function (i_data, i_language, i_success, i_error) {
            if (i_data && i_data.file) {
                switch (mode) {
                    case ContentManager.RAW:
                        i_hmi.cms.getObject(i_data.file, i_language, ContentManager.RAW, function (i_raw) {
                            preview.hmi_html(i_raw !== undefined ? i_raw : '');
                            i_success();
                        }, function (i_exception) {
                            preview.hmi_html('');
                            i_error(i_exception);
                        });
                        break;
                    case ContentManager.INCLUDE:
                        i_hmi.cms.getObject(i_data.file, i_language, ContentManager.INCLUDE, function (i_build) {
                            preview.hmi_html(i_build !== undefined ? i_build : '');
                            i_success();
                        }, function (i_exception) {
                            preview.hmi_html('');
                            i_error(i_exception);
                        });
                        break;
                }
            }
            else {
                preview.hmi_html('');
                i_success();
            }
        };
        var preview = {
            x: 0,
            y: 0,
            width: 3,
            height: 1,
            border: false,
            scrollable: true
        };
        var info_lang = {
            x: 0,
            y: 1,
            align: 'left'
        };
        var button_include = {
            x: 1,
            y: 1,
            text: 'include',
            border: true,
            clicked: function () {
                update_mode(ContentManager.INCLUDE);
            }
        };
        var button_raw = {
            x: 2,
            y: 1,
            text: 'raw',
            border: true,
            selected: true,
            clicked: function () {
                update_mode(ContentManager.RAW);
            }
        };
        return {
            type: 'grid',
            columns: [1, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],
            rows: [1, DEFAULT_ROW_HEIGHT],
            children: [preview, info_lang, button_include, button_raw],
            keyChanged: function (i_data, i_language, i_success, i_error) {
                info_lang.hmi_text('language: "' + i_language + '"');
                button_include.hmi_setEnabled(false);
                button_raw.hmi_setEnabled(false);
                reload(i_data, i_language, function () {
                    button_include.hmi_setEnabled(true);
                    button_raw.hmi_setEnabled(true);
                    i_success();
                }, function (i_exception) {
                    button_include.hmi_setEnabled(true);
                    button_raw.hmi_setEnabled(true);
                    i_error(i_exception);
                });
            }
        };
    };

    var get_htm_editor = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, scrolls = {};
        var reload = function (i_data, i_language, i_success, i_error) {
            info_lang.hmi_text('language: "' + i_language + '"');
            if (textarea.file) {
                handleScrolls(scrolls, textarea.file, textarea, false);
                delete textarea.file;
            }
            if (i_data && i_data.file) {
                cms.getObject(i_data.file, i_language, ContentManager.RAW, function (i_raw) {
                    textarea.hmi_value(i_raw !== undefined ? i_raw : '');
                    if (i_raw !== undefined) {
                        textarea.file = i_data.file;
                        handleScrolls(scrolls, textarea.file, textarea, true);
                    }
                    i_success();
                }, function (i_exception) {
                    textarea.hmi_html('');
                    i_error(i_exception);
                });
            }
            else {
                textarea.hmi_value('');
                i_success();
            }
        };
        var textarea = {
            x: 0,
            y: 0,
            type: 'textarea',
            code: 'html',
            editable: true,
            beautify: true,
            prepare: function (that, i_success, i_error) {
                this.hmi_addChangeListener(i_adapter.edited);
                i_success();
            },
            destroy: function (that, i_success, i_error) {
                this.hmi_removeChangeListener(i_adapter.edited);
                i_success();
            }
        };
        var info_lang = {
            x: 0,
            y: 1,
            align: 'left'
        };
        var get_value = function () {
            return textarea.hmi_value().trim();
        };
        return {
            type: 'grid',
            columns: 1,
            rows: [1, DEFAULT_ROW_HEIGHT],
            children: [textarea, info_lang],
            keyChanged: reload,
            getValue: get_value,
            scrolls: scrolls
        };
    };

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // TEXT - PREVIEW & EDITOR
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    var get_txt_preview = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, mode = ContentManager.RAW, scrolls_raw = {}, scrolls_build = {}, update_mode = function (i_mode) {
            mode = i_mode;
            button_include.selected = i_mode === ContentManager.INCLUDE;
            button_include.hmi_setSelected(button_include.selected);
            button_raw.selected = i_mode === ContentManager.RAW;
            button_raw.hmi_setSelected(button_raw.selected);
            i_adapter.triggerReload();
        };
        var reload = function (i_data, i_language, i_success, i_error) {
            if (textarea.file_raw) {
                handleScrolls(scrolls_raw, textarea.file_raw, textarea, false);
                delete textarea.file_raw;
            }
            if (textarea.file_build) {
                handleScrolls(scrolls_build, textarea.file_build, textarea, false);
                delete textarea.file_build;
            }
            if (i_data && i_data.file) {
                switch (mode) {
                    case ContentManager.RAW:
                        cms.getObject(i_data.file, i_language, ContentManager.RAW, function (i_raw) {
                            textarea.hmi_value(i_raw !== undefined ? i_raw : '');
                            if (i_raw !== undefined) {
                                textarea.file_raw = i_data.file;
                                handleScrolls(scrolls_raw, textarea.file_raw, textarea, true);
                            }
                            i_success();
                        }, function (i_exception) {
                            textarea.hmi_value('');
                            i_error(i_exception);
                        });
                        break;
                    case ContentManager.INCLUDE:
                        cms.getObject(i_data.file, i_language, ContentManager.INCLUDE, function (i_build) {
                            textarea.hmi_value(i_build !== undefined ? i_build : '');
                            if (i_build !== undefined) {
                                textarea.file_build = i_data.file;
                                handleScrolls(scrolls_build, textarea.file_build, textarea, true);
                            }
                            i_success();
                        }, function (i_exception) {
                            textarea.hmi_value('');
                            i_error(i_exception);
                        });
                        break;
                }
            }
            else {
                textarea.hmi_value('');
                i_success();
            }
        };
        var textarea = {
            x: 0,
            y: 0,
            width: 3,
            height: 1,
            type: 'textarea',
            code: 'javascript',
            editable: false
        };
        var info_lang = {
            x: 0,
            y: 1,
            align: 'left'
        };
        var button_include = {
            x: 1,
            y: 1,
            text: 'include',
            border: true,
            clicked: function () {
                update_mode(ContentManager.INCLUDE);
            }
        };
        var button_raw = {
            x: 2,
            y: 1,
            text: 'raw',
            border: true,
            selected: true,
            clicked: function () {
                update_mode(ContentManager.RAW);
            }
        };
        return {
            type: 'grid',
            columns: [1, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],
            rows: [1, DEFAULT_ROW_HEIGHT],
            children: [textarea, info_lang, button_include, button_raw],
            keyChanged: function (i_data, i_language, i_success, i_error) {
                info_lang.hmi_text('language: "' + i_language + '"');
                button_include.hmi_setEnabled(false);
                button_raw.hmi_setEnabled(false);
                reload(i_data, i_language, function () {
                    button_include.hmi_setEnabled(true);
                    button_raw.hmi_setEnabled(true);
                    i_success();
                }, function (i_exception) {
                    button_include.hmi_setEnabled(true);
                    button_raw.hmi_setEnabled(true);
                    i_error(i_exception);
                });
            },
            scrolls_raw: scrolls_raw,
            scrolls_build: scrolls_build
        };
    };

    var get_txt_editor = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, scrolls = {};
        var reload = function (i_data, i_language, i_success, i_error) {
            info_lang.hmi_text('language: "' + i_language + '"');
            if (textarea.file) {
                handleScrolls(scrolls, textarea.file, textarea, false);
                delete textarea.file;
            }
            if (i_data && i_data.file) {
                cms.getObject(i_data.file, i_language, ContentManager.RAW, function (i_raw) {
                    textarea.hmi_value(i_raw !== undefined ? i_raw : '');
                    if (i_raw !== undefined) {
                        textarea.file = i_data.file;
                        handleScrolls(scrolls, textarea.file, textarea, true);
                    }
                    i_success();
                }, function (i_exception) {
                    textarea.hmi_value('');
                    i_error(i_exception);
                });
            }
            else {
                textarea.hmi_value('');
                i_success();
            }
        };
        var textarea = {
            x: 0,
            y: 0,
            type: 'textarea',
            code: 'javascript',
            editable: true,
            prepare: function (that, i_success, i_error) {
                this.hmi_addChangeListener(i_adapter.edited);
                i_success();
            },
            destroy: function (that, i_success, i_error) {
                this.hmi_removeChangeListener(i_adapter.edited);
                i_success();
            }
        };
        var info_lang = {
            x: 0,
            y: 1,
            align: 'left'
        };
        var get_value = function () {
            return textarea.hmi_value().trim();
        };
        return {
            type: 'grid',
            columns: 1,
            rows: [1, DEFAULT_ROW_HEIGHT],
            children: [textarea, info_lang],
            keyChanged: reload,
            getValue: get_value,
            scrolls: scrolls
        };
    };

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // JSONFX - PREVIEW & EDITOR
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    var get_jso_preview = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, scrolls_raw = {}, scrolls_build = {}, mode = ContentManager.RAW, update_mode = function (i_mode) {
            mode = i_mode;
            button_hmi.selected = i_mode === ContentManager.PARSE;
            button_hmi.hmi_setSelected(button_hmi.selected);
            button_include.selected = i_mode === ContentManager.INCLUDE;
            button_include.hmi_setSelected(button_include.selected);
            button_raw.selected = i_mode === ContentManager.RAW;
            button_raw.hmi_setSelected(button_raw.selected);
            i_adapter.triggerReload();
        };
        var reload = function (i_data, i_language, i_success, i_error) {
            if (textarea.file_raw) {
                handleScrolls(scrolls_raw, textarea.file_raw, textarea, false);
                delete textarea.file_raw;
            }
            if (textarea.file_build) {
                handleScrolls(scrolls_build, textarea.file_build, textarea, false);
                delete textarea.file_build;
            }
            if (i_data && i_data.file) {
                switch (mode) {
                    case ContentManager.RAW:
                        container.hmi_removeContent(function () {
                            cms.getObject(i_data.file, i_language, ContentManager.RAW, function (i_raw) {
                                var value = i_raw !== undefined ? jsonfx.stringify(jsonfx.reconstruct(i_raw), true) : '';
                                textarea.value = value;
                                container.hmi_setContent(textarea, function () {
                                    if (i_raw !== undefined) {
                                        textarea.file_raw = i_data.file;
                                        handleScrolls(scrolls_raw, textarea.file_raw, textarea, true);
                                    }
                                    i_success();
                                }, i_error);
                            }, i_error);
                        }, i_error);
                        break;
                    case ContentManager.INCLUDE:
                        container.hmi_removeContent(function () {
                            cms.getObject(i_data.file, i_language, ContentManager.INCLUDE, function (i_build) {
                                var value = i_build !== undefined ? jsonfx.stringify(jsonfx.reconstruct(i_build), true) : '';
                                textarea.value = value;
                                container.hmi_setContent(textarea, function () {
                                    if (i_build !== undefined) {
                                        textarea.file_build = i_data.file;
                                        handleScrolls(scrolls_build, textarea.file_build, textarea, true);
                                    }
                                    i_success();
                                }, i_error);
                            }, i_error);
                        }, i_error);
                        break;
                    case ContentManager.PARSE:
                        container.hmi_removeContent(function () {
                            cms.getObject(i_data.file, i_language, ContentManager.PARSE, function (i_parsed) {
                                if (i_parsed !== null && typeof i_parsed === 'object' && !Array.isArray(i_parsed)) {
                                    container.hmi_setContent(i_parsed, i_success, i_error);
                                }
                                else if (i_parsed !== undefined) {
                                    container.hmi_setContent({
                                        html: '<b>Invalid hmi-object: "' + i_data.file + '"</b><br>Type is: ' + (Array.isArray(i_parsed) ? 'array' : typeof i_parsed)
                                    }, i_success, i_error);
                                }
                                else {
                                    container.hmi_setContent({
                                        html: '<b>No data available: "' + i_data.file + '"</b>'
                                    }, i_success, i_error);
                                }
                            }, i_error);
                        }, i_error);
                        break;
                }
            }
            else {
                container.hmi_removeContent(i_success, i_error);
            }
        };
        var textarea = {
            x: 0,
            y: 0,
            width: 3,
            height: 1,
            type: 'textarea',
            code: 'javascript',
            editable: false
        };
        var container = {
            x: 0,
            y: 0,
            width: 4,
            height: 1,
            type: 'container'
        };
        var info_lang = {
            x: 0,
            y: 1,
            align: 'left'
        };
        var button_hmi = {
            x: 1,
            y: 1,
            text: 'hmi',
            border: true,
            clicked: function () {
                update_mode(ContentManager.PARSE);
            }
        };
        var button_include = {
            x: 2,
            y: 1,
            text: 'include',
            border: true,
            clicked: function () {
                update_mode(ContentManager.INCLUDE);
            }
        };
        var button_raw = {
            x: 3,
            y: 1,
            text: 'raw',
            border: true,
            selected: true,
            clicked: function () {
                update_mode(ContentManager.RAW);
            }
        };
        return {
            type: 'grid',
            columns: [1, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],
            rows: [1, DEFAULT_ROW_HEIGHT],
            children: [container, info_lang, button_hmi, button_include, button_raw],
            keyChanged: function (i_data, i_language, i_success, i_error) {
                info_lang.hmi_text('language: "' + i_language + '"');
                button_hmi.hmi_setEnabled(false);
                button_include.hmi_setEnabled(false);
                button_raw.hmi_setEnabled(false);
                reload(i_data, i_language, function () {
                    button_hmi.hmi_setEnabled(true);
                    button_include.hmi_setEnabled(true);
                    button_raw.hmi_setEnabled(true);
                    i_success();
                }, function (i_exception) {
                    button_hmi.hmi_setEnabled(true);
                    button_include.hmi_setEnabled(true);
                    button_raw.hmi_setEnabled(true);
                    i_error(i_exception);
                });
            },
            scrolls_raw: scrolls_raw,
            scrolls_build: scrolls_build
        };
    };

    var get_jso_editor = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, scrolls = {}, mode = ContentManager.RAW, update_mode = function (i_mode) {
            mode = i_mode;
            button_hmi.selected = i_mode === ContentManager.PARSE;
            button_hmi.hmi_setSelected(button_hmi.selected);
            button_raw.selected = i_mode === ContentManager.RAW;
            button_raw.hmi_setSelected(button_raw.selected);
            i_adapter.triggerReload();
        };
        var edited = false, object, raw, sel_data;
        var reload = function (i_data, i_language, i_success, i_error) {
            if (textarea.file) {
                handleScrolls(scrolls, textarea.file, textarea, false);
                delete textarea.file;
            }
            raw = undefined;
            if (object) {
                if (typeof object._hmi_removeEditListener === 'function') {
                    object._hmi_removeEditListener(edit_listener);
                }
                object = undefined;
            }
            if (i_data && i_data.file) {
                switch (mode) {
                    case ContentManager.RAW:
                        container.hmi_removeContent(function () {
                            cms.getObject(i_data.file, i_language, ContentManager.RAW, function (i_raw) {
                                raw = i_raw !== undefined ? jsonfx.reconstruct(i_raw) : undefined;
                                textarea.value = raw !== undefined ? jsonfx.stringify(raw, true) : '';
                                container.hmi_setContent(textarea, function () {
                                    if (i_raw !== undefined) {
                                        textarea.file = i_data.file;
                                        handleScrolls(scrolls, textarea.file, textarea, true);
                                    }
                                    i_success();
                                }, i_error);
                            }, i_error);
                        }, i_error);
                        break;
                    case ContentManager.PARSE:
                        container.hmi_removeContent(function () {
                            cms.getObject(i_data.file, i_language, ContentManager.RAW, function (i_raw) {
                                if (i_raw !== undefined) {
                                    raw = jsonfx.reconstruct(i_raw);
                                    cms.getObject(i_data.file, i_language, ContentManager.PARSE, function (i_parsed) {
                                        if (i_parsed !== null && typeof i_parsed === 'object' && !Array.isArray(i_parsed)) {
                                            object = i_parsed;
                                            container.hmi_setContent(object, function () {
                                                if (typeof object._hmi_addEditListener === 'function') {
                                                    object._hmi_addEditListener(edit_listener);
                                                }
                                                i_success();
                                            }, i_error, undefined, true, true);
                                        }
                                        else if (i_parsed !== undefined) {
                                            container.hmi_setContent({
                                                html: '<b>Invalid hmi-object: "' + i_data.file + '"</b><br>Type is: ' + (Array.isArray(i_parsed) ? 'array' : typeof i_parsed)
                                            }, i_success, i_error);
                                        }
                                        else {
                                            container.hmi_setContent({
                                                html: '<b>No data available: "' + i_data.file + '"</b>'
                                            }, i_success, i_error);
                                        }
                                    }, i_error);
                                }
                                else {
                                    container.hmi_setContent({
                                        html: '<b>No data available: "' + i_data.file + '"</b>'
                                    }, i_success, i_error);
                                }
                            }, i_error);
                        }, i_error);
                        break;
                }
            }
            else {
                container.hmi_removeContent(i_success, i_error);
            }
        };
        var textarea = {
            type: 'textarea',
            code: 'javascript',
            beautify: true,
            editable: true,
            value: raw !== undefined ? jsonfx.stringify(raw, true) : '',
            prepare: function (that, i_success, i_error) {
                this._on_change = function () {
                    if (!edited) {
                        edited = true;
                        i_adapter.edited();
                        button_hmi.hmi_setEnabled(false);
                        button_raw.hmi_setEnabled(false);
                    }
                };
                this.hmi_addChangeListener(this._on_change);
                i_success();
            },
            destroy: function (that, i_success, i_error) {
                this.hmi_removeChangeListener(this._on_change);
                delete this._on_change;
                i_success();
            }
        };
        var edit_listener = {
            notifyEdited: function () {
                if (!edited) {
                    edited = true;
                    i_adapter.edited();
                    button_hmi.hmi_setEnabled(false);
                    button_raw.hmi_setEnabled(false);
                }
            },
            showChildObjectEditor: function (i_index, i_child) {
                if (!edited) {
                    if (Array.isArray(raw.children)) {
                        var obj = raw.children[i_index] || {
                            x: i_child && typeof i_child.x === 'number' ? i_child.x : 0,
                            y: i_child && typeof i_child.y === 'number' ? i_child.y : 0,
                            width: i_child && typeof i_child.width === 'number' ? i_child.width : 1,
                            height: i_child && typeof i_child.height === 'number' ? i_child.height : 1,
                            id: 'enter object node id here',
                            type: 'enter type here',
                            classes: 'highlighted-yellow',
                            text: 'enter text here',
                        };
                        var value = jsonfx.stringify(jsonfx.reconstruct(obj), true);
                        var src_obj = {
                            x: 0,
                            y: 0,
                            type: 'textarea',
                            code: 'javascript',
                            beautify: true,
                            value: value
                        };
                        var info_obj = {
                            x: 0,
                            y: 1,
                            align: 'left'
                        };
                        var popup_obj = {
                            type: 'grid',
                            columns: 1,
                            rows: [1, '30px'],
                            children: [src_obj, info_obj]
                        };
                        i_hmi.showPopup({
                            title: 'Edit',
                            width: Math.floor($(window).width() * 0.9),
                            height: Math.floor($(window).height() * 0.95),
                            object: popup_obj,
                            buttons: [{
                                text: 'commit',
                                click: function (i_close) {
                                    try {
                                        var value = src_obj.hmi_value().trim();
                                        var object = value.length > 0 ? jsonfx.parse(value, true, true) : undefined;
                                        if (object !== undefined) {
                                            raw.children[typeof i_index === 'number' && i_index >= 0 ? i_index : raw.children.length] = object;
                                        }
                                        else if (typeof i_index === 'number' && i_index >= 0) {
                                            raw.children.splice(i_index, 1);
                                        }
                                        i_adapter.performCommit(jsonfx.stringify(raw, false));
                                        i_close();
                                    }
                                    catch (exc) {
                                        info_obj.hmi_addClass('highlighted-red');
                                        info_obj.hmi_text(exc);
                                    }
                                }
                            }, {
                                text: 'cancel',
                                click: function (i_close) {
                                    i_close();
                                }
                            }]
                        });
                    }
                }
            }
        };
        var container = {
            x: 0,
            y: 0,
            type: 'container'
        };
        var info_lang = {
            x: 0,
            y: 0,
            align: 'left'
        };
        var button_hmi = {
            x: 1,
            y: 0,
            text: 'hmi',
            border: true,
            clicked: function () {
                update_mode(ContentManager.PARSE);
            }
        };
        var button_raw = {
            x: 2,
            y: 0,
            text: 'raw',
            border: true,
            selected: true,
            clicked: function () {
                update_mode(ContentManager.RAW);
            }
        };
        var get_value = function () {
            switch (mode) {
                case ContentManager.RAW:
                    var value = textarea.hmi_value().trim();
                    return value.length > 0 ? jsonfx.stringify(jsonfx.parse(value, true, true), false) : '';
                case ContentManager.PARSE:
                    if ((object.type === 'grid' || object.type === 'float') && Array.isArray(raw.children) && Array.isArray(object.children)) {
                        // first we got to update our raw coordinates
                        for (var i = 0, l = raw.children.length; i < l; i++) {
                            var raw_child = raw.children[i];
                            var obj_child = object.children[i];
                            if (typeof obj_child.x === 'number') {
                                raw_child.x = obj_child.x;
                            }
                            if (typeof obj_child.y === 'number') {
                                raw_child.y = obj_child.y;
                            }
                        }
                        return jsonfx.stringify(raw, false);
                    }
                    else {
                        throw new Error('Invalid hmi-edit-content');
                    }
                    break;
                default:
                    throw new Error('Invalid mode: "' + mode + '"');
                    break;
            }
        };
        return {
            type: 'grid',
            columns: 1,
            rows: [1, DEFAULT_ROW_HEIGHT],
            children: [container, {
                x: 0,
                y: 1,
                type: 'grid',
                columns: [1, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],
                rows: 1,
                children: [info_lang, button_hmi, button_raw]
            }],
            keyChanged: function (i_data, i_language, i_success, i_error) {
                edited = false;
                sel_data = i_data;
                info_lang.hmi_text('language: "' + i_language + '"');
                button_hmi.hmi_setEnabled(false);
                button_raw.hmi_setEnabled(false);
                reload(i_data, i_language, function () {
                    button_hmi.hmi_setEnabled(true);
                    button_raw.hmi_setEnabled(true);
                    i_success();
                }, function (i_exception) {
                    button_hmi.hmi_setEnabled(true);
                    button_raw.hmi_setEnabled(true);
                    i_error(i_exception);
                });
            },
            getValue: get_value,
            destroy: function (that, i_success, i_error) {
                if (object && typeof object._hmi_removeEditListener === 'function') {
                    console.log('object._hmi_removeEditListener(edit_listener);');
                    object._hmi_removeEditListener(edit_listener);
                }
                i_success();
            },
            scrolls: scrolls
        };
    };

    // ///////////////////////////////////////////////////////////////////////////////////////////////
    // MAIN - PREVIEW & EDITOR & CONTENT EDITOR
    // ///////////////////////////////////////////////////////////////////////////////////////////////

    var get_preview = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, unstress = Executor.unstress(i_adapter.notifyError, function () {
            i_adapter.notifyTimeout(sel_data);
        }, DEFAULT_TIMEOUT);
        var preview = false, sel_data, language, reload = function () {
            unstress(function (i_success, i_error) {
                var handler = sel_data.extension ? handlers[sel_data.extension] : false;
                var next = handler ? handler.cont : false;
                updateContainer(container, preview, next, sel_data, language, function () {
                    preview = next;
                    i_success();
                }, i_error);
            });
        };
        i_adapter.triggerReload = reload;
        var lab = get_lab_preview(i_hmi, i_adapter);
        var htm = get_htm_preview(i_hmi, i_adapter);
        var txt = get_txt_preview(i_hmi, i_adapter);
        var jso = get_jso_preview(i_hmi, i_adapter);
        var handlers = {};
        cms.getDescriptors(function (i_ext, i_desc) {
            handlers[i_ext] = getHandler(i_desc, lab, htm, txt, jso);
        });
        var container = {
            type: 'container',
            update: function (i_data, i_language) {
                sel_data = i_data;
                language = i_language;
                reload();
            },
            scrolls_txt_raw: txt.scrolls_raw,
            scrolls_txt_build: txt.scrolls_build,
            scrolls_jso_raw: jso.scrolls_raw,
            scrolls_jso_build: jso.scrolls_build
        };
        return container;
    };

    var get_refactoring = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, sel_data = false, mode = false, source = false, enabled = true;
        var update = function () {
            button_move.hmi_setEnabled(enabled && sel_data !== false && (sel_data.file !== undefined || sel_data.folder !== undefined));
            button_move.hmi_setSelected(enabled && source !== false && mode === ContentManager.MOVE);
            button_copy.hmi_setEnabled(enabled && sel_data !== false && (sel_data.file !== undefined || sel_data.folder !== undefined));
            button_copy.hmi_setSelected(enabled && source !== false && mode === ContentManager.COPY);
            var paste_enabled = enabled && source !== false;
            if (source.extension && !sel_data.extension) {
                paste_enabled = false;
            }
            if (source.folder && !sel_data.folder) {
                paste_enabled = false;
            }
            if (source.id === sel_data.id) {
                paste_enabled = false;
            }
            button_paste.hmi_setEnabled(paste_enabled);
            button_delete.hmi_setEnabled(enabled && sel_data !== false && (sel_data.file !== undefined || sel_data.folder !== undefined));
            button_export.hmi_setEnabled(enabled && sel_data !== false && (sel_data.file !== undefined || sel_data.folder !== undefined));
            button_import.hmi_setEnabled(enabled);
            if (mode !== undefined && source !== false) {
                var info = mode;
                info += ': "';
                info += source.id;
                info += '" to: ';
                if (paste_enabled) {
                    info += '"';
                    info += sel_data.id;
                    info += '"';
                }
                else {
                    info += '?';
                }
                i_adapter.updateInfo(info);
            }
        };
        var button_move = {
            x: 1,
            y: 0,
            text: 'move',
            border: true,
            enabled: false,
            clicked: function () {
                source = sel_data;
                mode = ContentManager.MOVE;
                update();
            }
        };
        var button_copy = {
            x: 2,
            y: 0,
            text: 'copy',
            enabled: false,
            border: true,
            clicked: function () {
                source = sel_data;
                mode = ContentManager.COPY;
                update();
            }
        };
        var button_paste = {
            x: 3,
            y: 0,
            text: 'paste',
            enabled: false,
            border: true,
            clicked: function () {
                performRefactoring(i_hmi, source.id, sel_data.id, mode, function (i_params) {
                    var m = mode;
                    mode = false;
                    source = false;
                    update();
                    i_adapter.updateInfo('performed ' + m);
                    i_adapter.updateScrollParams(i_params);
                    i_adapter.reload(sel_data);
                }, function (i_exception) {
                    mode = false;
                    source = false;
                    update();
                    i_adapter.notifyError(i_exception);
                });
            }
        };
        var button_delete = {
            x: 4,
            y: 0,
            text: 'delete',
            enabled: false,
            border: true,
            clicked: function () {
                performRefactoring(i_hmi, sel_data.id, undefined, ContentManager.DELETE, function (i_params) {
                    mode = false;
                    source = false;
                    update();
                    i_adapter.updateInfo('performed remove');
                    i_adapter.updateScrollParams(i_params);
                    i_adapter.reload();
                }, function (i_exception) {
                    mode = false;
                    source = false;
                    update();
                    i_adapter.notifyError(i_exception);
                });
            }
        };
        var button_export = {
            x: 5,
            y: 0,
            text: 'export',
            enabled: false,
            border: true,
            timeout: 1000,
            longClicked: function () {
                var that = this, handler = cms.getExchangeHandler();
                handler.handleExport(sel_data.id, function (i_state) {
                    i_adapter.updateInfo(i_state !== undefined ? 'export ' + i_state : 'export ready');
                }, i_adapter.notifyError);
            }
        };
        var button_import = {
            x: 6,
            y: 0,
            text: 'import',
            border: true,
            clicked: function () {
                var that = this;
                Utilities.loadClientTextFile(function (i_text) {
                    var handler = cms.getExchangeHandler();
                    handler.handleImport(i_hmi, i_text.replace(/\r?\n|\r/g, '\n'), function (i_state) {
                        if (i_state === undefined) {
                            i_adapter.updateInfo('import ' + i_state);
                        }
                        else {
                            i_adapter.updateInfo('import ready');
                            i_adapter.reload();
                        }
                    }, i_adapter.notifyError);
                });
            }
        };
        var container = {
            type: 'grid',
            columns: [1, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],
            rows: 1,
            separator: SEPARATOR,
            children: [{
                x: 0,
                y: 0,
                align: 'right',
                text: 'refactoring:'
            }, button_move, button_copy, button_paste, button_delete, button_export, button_import],
            update: function (i_data) {
                sel_data = i_data;
                update();
            },
            setEnabled: function (i_enabled) {
                enabled = i_enabled;
                if (!i_enabled) {
                    source = false;
                }
                update();
            }
        };
        return container;
    };

    var get_edit_controller = function (i_hmi, i_adapter) {
        var cms = i_hmi.cms, unstress = Executor.unstress(i_adapter.notifyError, function () {
            i_adapter.notifyTimeout(sel_data);
        }, DEFAULT_TIMEOUT);
        var editor = false, handler = false, valid_file = false, sel_data = false, sel_cs = false, edit_data = false, edit_cs = false, sel_lang, edit_lang, reload = function () {
            unstress(function (i_success, i_error) {
                sel_cs = false;
                handler = sel_data !== false && sel_data.extension ? handlers[sel_data.extension] : false;
                var next = handler ? handler.cont : false;
                editListenerEnabled = false;
                updateContainer(edit_container, editor, next, sel_data, sel_lang, function () {
                    editListenerEnabled = true;
                    editor = next;
                    if (sel_data.file) {
                        cms.getChecksum(sel_data.file, function (i_checksum) {
                            sel_cs = i_checksum;
                            i_success();
                        }, i_error)
                    }
                    else {
                        i_success();
                    }
                }, i_error);
            });
        };
        var edited = false, editListenerEnabled = true, pending_commit = false, pending_reset = false;
        var update = function () {
            button_commit.hmi_setEnabled(edited && !pending_commit && !pending_reset && edit_data.extension === sel_data.extension);
            button_reset.hmi_setEnabled(edited && !pending_commit && !pending_reset);
            if (edited && !pending_commit && !pending_reset) {
                var info = 'edited: "';
                info += edit_data.id;
                info += '"';
                if (edit_data.extension === sel_data.extension) {
                    if (edit_data.id === sel_data.id) {
                        info += ' commit enabled';
                    }
                    else {
                        info += ' commit as: "';
                        info += sel_data.id;
                        info += '"';
                    }
                }
                else {
                    info += ' commit disabled - invalid object id';
                }
                i_adapter.updateInfo(info);
            }
        };
        var perform_commit = function (i_value) {
            pending_commit = true;
            update();
            var data = i_adapter.getIdData();
            var lang = sel_data.multiedit ? undefined : edit_lang;
            performModification(i_hmi, edit_cs, edit_data.file, data.file, lang, i_value, function (i_params) {
                pending_commit = false;
                if (i_params) {
                    edited = false;
                    edit_data = false;
                    edit_cs = false;
                    edit_lang = false;
                    update();
                    i_adapter.updateInfo('performed commit');
                    i_adapter.updateScrollParams(i_params);
                    i_adapter.stateChanged(false, data);
                }
                else {
                    update();
                }
            }, function (i_exception) {
                pending_commit = false;
                edit_data = false;
                edit_cs = false;
                edit_lang = false;
                update();
                i_adapter.notifyError(i_exception);
            });
        };
        i_adapter.triggerReload = reload;
        i_adapter.edited = function () {
            if (editListenerEnabled && !edited) {
                edited = true;
                edit_data = sel_data;
                edit_cs = sel_cs;
                edit_lang = sel_lang;
                update();
                i_adapter.stateChanged(true);
            }
        };
        i_adapter.performCommit = function (i_value) {
            edit_data = sel_data;
            edit_cs = sel_cs;
            edit_lang = sel_lang;
            perform_commit(i_value);
        };
        var lab = get_lab_editor(i_hmi, i_adapter);
        var htm = get_htm_editor(i_hmi, i_adapter);
        var txt = get_txt_editor(i_hmi, i_adapter);
        var jso = get_jso_editor(i_hmi, i_adapter);
        var handlers = {};
        cms.getDescriptors(function (i_ext, i_desc) {
            handlers[i_ext] = getHandler(i_desc, lab, htm, txt, jso);
        });
        var edit_container = {
            type: 'container'
        };
        var button_commit = {
            enabled: false,
            x: 1,
            y: 0,
            border: true,
            text: 'commit',
            clicked: function () {
                try {
                    perform_commit(editor.getValue());
                }
                catch (exc) {
                    i_adapter.notifyError(exc);
                }
            }
        };
        var button_reset = {
            x: 2,
            y: 0,
            text: 'reset',
            enabled: false,
            border: true,
            clicked: function () {
                edited = false;
                update();
                i_adapter.stateChanged(false, sel_data);
                i_adapter.updateInfo('performed reset');
            }
        };
        return {
            type: 'grid',
            columns: [1, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],
            rows: 1,
            separator: SEPARATOR,
            children: [{
                x: 0,
                y: 0,
                align: 'right',
                text: 'editor:'
            }, button_commit, button_reset],
            update: function (i_data, i_language) {
                sel_data = i_data;
                sel_lang = i_language;
                if (!edited) {
                    reload();
                }
                update();
            },
            editor: edit_container,
            scrolls_htm: htm.scrolls,
            scrolls_txt: txt.scrolls,
            scrolls_jso: jso.scrolls
        };
    };

    var getContentEditor = function (i_hmi) {
        // For every kind of text editors or previews we store the scroll positions
        // so it it easy to switch between objects and stay where you are.
        var scroll_positions = [];
        // We show messages and show and collect error messages.
        var log_handler = getLogHandler(i_hmi);
        // All editor controls are encapsulated and do not have any knowledge about
        // any other control.
        // The signals between the controls are handled by the following adapters
        // with define the callbacks used inside the respective control.
        var language_selector_adapter = {
            languageChanged: function (i_language) {
                edit_ctrl.update(key_textfield.getIdData(), i_language);
                preview.update(references.getIdData(), i_language);
            }
        };
        var key_textfield_adapter = {
            keyEdited: function (i_data) {
                references.setRootIdData(i_data);
                refactoring.update(i_data);
                edit_ctrl.update(i_data, language_selector.getLanguage());
                preview.update(i_data, language_selector.getLanguage());
            },
            keySelected: function (i_data) {
                if (browser_tree.hmi_isVisible()) {
                    browser_tree.expand(i_data);
                }
                references.setRootIdData(i_data);
                refactoring.update(i_data);
                edit_ctrl.update(i_data, language_selector.getLanguage());
                preview.update(i_data, language_selector.getLanguage());
            }
        };
        var browser_tree_adapter = {
            notifyError: log_handler.pushError,
            notifyTimeout: function (i_data) {
                log_handler.pushTimeout('timeout loading browser: "' + i_data.id + '"');
            },
            keySelected: function (i_data) {
                key_textfield.update(i_data);
                references.setRootIdData(i_data);
                refactoring.update(i_data);
                edit_ctrl.update(i_data, language_selector.getLanguage());
                preview.update(i_data, language_selector.getLanguage());
            }
        };
        var search_container_adapter = {
            notifyError: log_handler.pushError,
            keySelected: function (i_data) {
                key_textfield.update(i_data);
                references.setRootIdData(i_data);
                refactoring.update(i_data);
                edit_ctrl.update(i_data, language_selector.getLanguage());
                preview.update(i_data, language_selector.getLanguage());
            }
        };
        var references_adapter = {
            notifyError: log_handler.pushError,
            notifyTimeout: function (i_data) {
                log_handler.pushTimeout('timeout loading references: "' + i_data.id + '"');
            },
            keySelected: function (i_data) {
                preview.update(i_data, language_selector.getLanguage());
            },
            selectInNavigator: function (i_data) {
                key_textfield.update(i_data);
                navigator.showBrowser();
                browser_tree.expand(i_data);
                references.setRootIdData(i_data);
                refactoring.update(i_data);
                edit_ctrl.update(i_data, language_selector.getLanguage());
                preview.update(i_data, language_selector.getLanguage());
            }
        };
        var refactoring_adapter = {
            updateInfo: log_handler.updateInfo,
            notifyError: log_handler.pushError,
            updateScrollParams: function (i_params) {
                updateScrolls(scroll_positions, i_params);
            },
            reload: function (i_data) {
                if (i_data) {
                    key_textfield.update(i_data);
                }
                var data = key_textfield.getIdData();
                if (browser_tree.hmi_isVisible()) {
                    browser_tree.expand(data);
                }
                references.setRootIdData(data);
                refactoring.update(data);
                edit_ctrl.update(data, language_selector.getLanguage());
                preview.update(data, language_selector.getLanguage());
                // TODO correct to call this here?
                log_handler.reset();
            }
        };
        var navigator_adapter = {
            showBrowserTree: function () {
                search_container.hmi_setVisible(false);
                browser_tree.hmi_setVisible(true);
                browser_tree.hmi_updateLoadedNodes();
            },
            showSearchTable: function () {
                browser_tree.hmi_setVisible(false);
                search_container.hmi_setVisible(true);
            },
            reload: function () {
                if (browser_tree.hmi_isVisible()) {
                    browser_tree.hmi_updateLoadedNodes();
                }
                var data = key_textfield.getIdData();
                references.setRootIdData(data);
                refactoring.update(data);
                edit_ctrl.update(data, language_selector.getLanguage());
                preview.update(data, language_selector.getLanguage());
            }
        };
        var edit_ctrl_adapter = {
            notifyError: log_handler.pushError,
            notifyTimeout: function (i_data) {
                log_handler.pushTimeout('timeout loading editor: "' + i_data.id + '"');
            },
            updateInfo: log_handler.updateInfo,
            getIdData: function () {
                return key_textfield.getIdData();
            },
            updateScrollParams: function (i_params) {
                updateScrolls(scroll_positions, i_params);
            },
            stateChanged: function (i_edited, i_data) {
                refactoring.setEnabled(!i_edited);
                if (!i_edited) {
                    key_textfield.update(i_data);
                    if (browser_tree.hmi_isVisible()) {
                        browser_tree.expand(i_data);
                    }
                    references.setRootIdData(i_data);
                    refactoring.update(i_data);
                    edit_ctrl.update(i_data, language_selector.getLanguage());
                    preview.update(i_data, language_selector.getLanguage());
                    // TODO correct to call this here?
                    log_handler.reset();
                }
            }
        };
        var preview_adapter = {
            notifyError: log_handler.pushError,
            notifyTimeout: function (i_data) {
                log_handler.pushTimeout('timeout loading preview: "' + i_data.id + '"');
            }
        };
        // CONTROLS
        var language_selector = getLanguageSelector(i_hmi, language_selector_adapter);
        var key_textfield = getKeyTextfield(i_hmi, key_textfield_adapter);
        var browser_tree = getBrowserTree(i_hmi, browser_tree_adapter);
        var search_container = getSearchContainer(i_hmi, search_container_adapter);
        var navigator = get_navigator(i_hmi, navigator_adapter, key_textfield, browser_tree, search_container);
        var references = get_references(i_hmi, references_adapter);
        var refactoring = get_refactoring(i_hmi, refactoring_adapter);
        var edit_ctrl = get_edit_controller(i_hmi, edit_ctrl_adapter);
        var preview = get_preview(i_hmi, preview_adapter);
        // SCROLL POSITIONS
        scroll_positions.push(edit_ctrl.scrolls_htm);
        scroll_positions.push(edit_ctrl.scrolls_txt);
        scroll_positions.push(edit_ctrl.scrolls_jso);
        scroll_positions.push(preview.scrolls_txt_raw);
        scroll_positions.push(preview.scrolls_txt_build);
        scroll_positions.push(preview.scrolls_jso_raw);
        scroll_positions.push(preview.scrolls_jso_build);
        // HEADER
        language_selector.x = 0;
        language_selector.y = 0;
        refactoring.x = 1;
        refactoring.y = 0;
        edit_ctrl.x = 2;
        edit_ctrl.y = 0;
        var header = {
            x: 0,
            y: 0,
            type: 'grid',
            columns: [1, 1, 1],
            rows: 1,
            children: [language_selector, refactoring, edit_ctrl]
        };
        // FOOTER
        log_handler.x = 0;
        log_handler.y = 0;
        log_handler.info.x = 1;
        log_handler.info.y = 0;
        var footer = {
            x: 0,
            y: 2,
            type: 'grid',
            columns: ['40px', 1, '160px'],
            rows: 1,
            separator: SEPARATOR,
            border: true,
            children: [log_handler, log_handler.info, {
                x: 2,
                y: 0,
                refresh: function (i_date) {
                    // clock (updates every second)
                    var last = this._last, sec = Math.ceil(i_date.getTime() / 1000);
                    if (last !== sec) {
                        last = sec;
                        this.hmi_text(i_date.toLocaleString());
                    }
                }
            }]
        };
        // CONTENT EDITOR
        navigator.location = 'top';
        references.location = 'bottom';
        edit_ctrl.editor.location = 'top';
        preview.location = 'bottom';
        return {
            type: 'grid',
            rows: [DEFAULT_ROW_HEIGHT, 1, DEFAULT_ROW_HEIGHT],
            children: [header, {
                x: 0,
                y: 1,
                type: 'split',
                rightSize: math.GOLDEN_CUT_INVERTED,
                children: [{
                    location: 'left',
                    type: 'split',
                    topSize: math.GOLDEN_CUT_INVERTED,
                    children: [navigator, references]
                }, {
                    location: 'right',
                    type: 'split',
                    children: [edit_ctrl.editor, preview]
                }]
            }, footer]
        };
    };

    window.getContentEditor = getContentEditor;
}());
