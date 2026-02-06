(function (root) {
    "use strict";
    const OPCUA = {};
    const isNodeJS = typeof require === 'function';
    const fs = require('fs');
    const { OPCUAClient, DataType, AttributeIds, TimestampsToReturn, ClientSubscription, resolveNodeId } = require('node-opcua-client');
    const Executor = require('@markus.hardardt/js_utils/src/Executor.js');
    const Regex = require('@markus.hardardt/js_utils/src/Regex.js');
    const Core = require('@markus.hardardt/js_utils/src/Core.js');

    function getAsCoreDataType(type) {
        switch (type) {
            case DataType.Null:
                return Core.DataType.Null;
            case DataType.Boolean:
                return Core.DataType.Boolean;
            case DataType.SByte:
                return Core.DataType.Int8;
            case DataType.Byte:
                return Core.DataType.UInt8;
            case DataType.Int16:
                return Core.DataType.Int16;
            case DataType.UInt16:
                return Core.DataType.UInt16;
            case DataType.Int32:
                return Core.DataType.Int32;
            case DataType.UInt32:
                return Core.DataType.UInt32;
            case DataType.Int64:
                return Core.DataType.Int64;
            case DataType.UInt64:
                return Core.DataType.UInt64;
            case DataType.Float:
                return Core.DataType.Float;
            case DataType.Double:
                return Core.DataType.Double;
            case DataType.String:
                return Core.DataType.String;
            case DataType.DateTime:
            case DataType.Guid:
            case DataType.ByteString:
            case DataType.XmlElement:
            case DataType.NodeId:
            case DataType.ExpandedNodeId:
            case DataType.StatusCode:
            case DataType.QualifiedName:
            case DataType.LocalizedText:
            case DataType.ExtensionObject:
            case DataType.DataValue:
            case DataType.Variant:
            case DataType.DiagnosticInfo:
            default:
                return Core.DataType.Unknown;
        }
    }
    OPCUA.getAsCoreDataType = getAsCoreDataType;

    const keyValueRegex = /^([_a-z0-9]+);(.+)$/i;
    function loadKeysAndValuesFromCSVFile(file, onSuccess, onError) {
        try {
            const result = {};
            const lines = fs.readFileSync(file, 'utf8').split(Regex.Linebreaks);
            for (const line of lines) {
                const match = keyValueRegex.exec(line);
                if (match) {
                    const key = match[1];
                    if (result[key] !== undefined) {
                        onError(`Duplicate key found: '${key}'`);
                        return;
                    }
                    result[key] = match[2];
                }
            }
            onSuccess(result);
        } catch (error) {
            onError(`Failed reading csv file '${file}': '${error.message}'`);
        }
    }
    OPCUA.loadKeysAndValuesFromCSVFile = loadKeysAndValuesFromCSVFile;

    function getAccessString(namespace, nodeId) {
        return `ns=${namespace};s=${nodeId}`;
    }

    /* ChatGPT generated two versions which are 100% equivalent in behavior:
        await Promise.all(toAdd.map(async id => {
            const mi = await subscription.monitor(...);
            activeItems.set(id, mi);
        })); 
        await Promise.all(toAdd.map(id => 
            subscription.monitor(...).then(mi => {
                activeItems.set(id, mi);
            })
        ));
        Here it makes a difference which one to use because we need the returned mi to add to our collection.  */
    function getEstablishMonitoringTask(subscription, node) {
        return (onSuccess, onError) => subscription.monitor(
            { nodeId: node.nodeId, attributeId: AttributeIds.Value },
            { samplingInterval: 500, discardOldest: true, queueSize: 10 },
            TimestampsToReturn.Both // TODO: Required?
        ).then(monitoredItem => {
            console.log(`Monitored id '${node.dataId}'`);
            node.monitoredItem = monitoredItem;
            monitoredItem.on('changed', dataValue => {
                const value = dataValue.value.value;
                console.log(`Value of node with id '${node.dataId}' changed: ${value}`);
                try {
                    node.onRefresh(value);
                } catch (error) {
                    console.error(`Failed calling onResfresh(value) for id '${node.dataId}'`);
                }
            });
            onSuccess();
        }).catch(error => {
            const message = `Failed to monitor '${node.dataId}': ${error.message}`;
            console.error(message);
            onError(message);
        });

    }

    /* ChatGPT generated two versions which are 100% equivalent in behavior:
        await Promise.all(toRemove.map(id => {
            const mi = activeItems.get(id);
            activeItems.delete(id);
            return mi.terminate();   // ← returns a Promise
        }));
        await Promise.all(toRemove.map(async id => {
            const mi = activeItems.get(id);
            activeItems.delete(id);
            await mi.terminate();
        }));
        Here it makes no difference which one to use.  */
    function getTerminateMonitoringTask(node) {
        return (onSuccess, onError) => node.monitoredItem.terminate().then(() => {
            node.monitoredItem = null;
            console.log(`Un-monitored id '${node.dataId}'`);
            onSuccess();
        }).catch(error => {
            node.monitoredItem = null;
            const message = `Failed to un-monitor '${node.dataId}': ${error.message}`;
            console.error(message);
            onError(message);
        });
    }

    const START_TRY_RECONNECT_DELAY = 2;
    const MAX_TRY_RECONNECT_DELAY = 32;
    const UPDATE_MONITORING_DELAY = 200;

    class Client {
        constructor(endpointUrl, namespace, nodesConfig) {
            this._endpointUrl = endpointUrl;
            this._nodes = {};
            for (const dataId in nodesConfig) {
                if (nodesConfig.hasOwnProperty(dataId)) {
                    const rawNodeId = nodesConfig[dataId];
                    const accessString = getAccessString(namespace, rawNodeId);
                    const nodeId = resolveNodeId(accessString);
                    this._nodes[dataId] = { dataId, rawNodeId, accessString, nodeId, value: null, onRefresh: null, monitoredItem: null };
                }
            }
            this._updateMonitoringTimer = null;
            this._running = false;
            this._connected = false;
            this._subscription = null;
            this._session = null;
            this._client = OPCUAClient.create({
                endpointMustExist: false, // Do NOT cache and pin the endpoint description from the first successful connection.
                connectionStrategy: {
                    initialDelay: 1000,
                    maxRetry: -1       // infinite retry AFTER first connection.
                }
            });
            this._onConnected = null;
            this._onDisconnected = null;
            this._client.on('start_reconnection', () => this._startReconnection());
            this._client.on('after_reconnection', () => this._afterReconnection());
            this._client.on('connection_lost', () => console.log(`TCP connection lost to endpoint url: ${this._endpointUrl}`));
            this._client.on('backoff', (retry, delay) => console.log(`Retry reconnection to endpoint url ${this._endpointUrl}: #${retry} in ${delay} ms`));
        }

        set OnConnected(value) {
            if (value !== null) {
                if (typeof value !== 'function') {
                    throw new Error('onConnected() is not a function');
                }
                this._onConnected = value;
            } else {
                this._onConnected = null;
            }
        }

        set OnDisconnected(value) {
            if (value !== null) {
                if (typeof value !== 'function') {
                    throw new Error('onDisonnected() is not a function');
                }
                this._onDisconnected = value;
            } else {
                this._onDisconnected = null;
            }
        }

        Start(onSuccess, onError) {
            this._running = true;
            const tasks = [];
            tasks.push((onSuc, onErr) => this._connect().then(onSuc).catch(onErr));
            tasks.push((onSuc, onErr) => this._client.createSession().then(session => {
                this._session = session;
                console.log(`Created OPC UC session on endpoint url: ${this._endpointUrl}`);
                onSuc();
            }).catch(onErr));
            // Read all required items and store the data type
            tasks.push((onSuc, onErr) => this._initNodesAsync().then(() => {
                console.log('Initialized nodes');
                onSuc();
            }).catch(onErr));
            tasks.push((onSuc, onErr) => {
                try {
                    // Create subscription
                    this._subscription = ClientSubscription.create(this._session, {
                        requestedPublishingInterval: 1000,   // ms
                        requestedLifetimeCount: 100,
                        requestedMaxKeepAliveCount: 5, // Make the server send keepalives more often.
                        maxNotificationsPerPublish: 100,
                        publishingEnabled: true,
                        priority: 10
                    });
                    this._subscription.on('started', () => console.log(`Subscription started - ID: ${this._subscription.subscriptionId}`));
                    this._subscription.on('terminated', () => console.log(`Subscription terminated - ID: ${this._subscription.subscriptionId}`));
                    onSuc();
                } catch (error) {
                    onErr(`Faild creating subscription: ${error.message}`);
                }
            });
            tasks.push((onSuc, onErr) => {
                // Notify observer
                if (this._onConnected) {
                    try {
                        this._onConnected();
                    } catch (error) {
                        console.error(`Failed calling onConnected(): ${error.message}`)
                    }
                }
                onSuc();
            });
            Executor.run(tasks,
                () => console.log(`Successfully started and subscribed OPC UA client to endpoint url: ${this._endpointUrl}`),
                error => console.error(`Failed starting and subscribing OPC UC client to endpoint url ${this._endpointUrl}: ${error.message}`)
            );
            // When the OPC UA server does not exist at start of this handler the _connect() call may take long.
            // Therefore in this method we do not wait for completion of the tasks above and call onSuccess immediately. 
            onSuccess();
        }

        async _connect() {
            // Start connect loop to OPC UA server (loop because the server might not be alive at the moment)
            console.log(`Connecting OPC UC client to endpoint url: ${this._endpointUrl}`);
            let connectRetryDelay = START_TRY_RECONNECT_DELAY;
            while (this._running) {
                try {
                    console.log('Trying to connect...');
                    await this._client.connect(this._endpointUrl);
                    console.log(`Connected to OPC UC client with endpoint url: ${this._endpointUrl}`);
                    this._connected = true;
                    return;
                } catch (error) {
                    console.log(`Server not available, retrying in ${connectRetryDelay} s...`);
                    await new Promise(resolve => setTimeout(() => {
                        if (connectRetryDelay < MAX_TRY_RECONNECT_DELAY) {
                            connectRetryDelay *= 2;
                        }
                        resolve();
                    }, connectRetryDelay * 1000));
                }
            }
        }

        _startReconnection() {
            this._connected = false;
            console.log(`UPC UA server connection lost to endpoint url: ${this._endpointUrl}`);
            if (this._onDisconnected) {
                try {
                    this._onDisconnected();
                } catch (error) {
                    console.error(`Failed calling onDisonnected(): ${error.message}`)
                }
            }
        }

        _afterReconnection() {
            this._connected = true;
            console.log(`UPC UA server to endpoint url: ${this._endpointUrl} reconnected and everything restored`);
            const tasks = [];
            tasks.push((onSuccess, onError) => this._initNodesAsync().then(onSuccess).catch(error => {
                console.error(`Failed init nodes: ${error.message}`);
                onError();
            }));
            tasks.push((onSuccess, onError) => {
                const toAdd = [];
                for (const dataId in this._nodes) {
                    if (this._nodes.hasOwnProperty(dataId)) {
                        const node = this._nodes[dataId];
                        if (node.onRefresh && !node.monitoredItem) {
                            toAdd.push(getEstablishMonitoringTask(this._subscription, node));
                        }
                    }
                }
                toAdd.parallel = true;
                Executor.run(toAdd, onSuccess, onError);
            });
            tasks.push((onSuccess, onError) => {
                if (this._onConnected) {
                    try {
                        this._onConnected();
                    } catch (error) {
                        console.error(`Failed calling onConnected(): ${error.message}`)
                    }
                }
                onSuccess();
            });
            Executor.run(tasks,
                () => console.log(`Successfully updated after reconnection OPC UA client to endpoint url: ${this._endpointUrl}`),
                error => console.error(`Failed updating after reconnection OPC UC client to endpoint url ${this._endpointUrl}: ${error.message}`)
            );
        }

        async _initNodesAsync() {
            if (this._session) {
                const nodesToRead = [];
                for (const dataId in this._nodes) {
                    if (this._nodes.hasOwnProperty(dataId)) {
                        const node = this._nodes[dataId];
                        nodesToRead.push({ nodeId: node.nodeId, attributeId: AttributeIds.Value });
                    }
                }
                const dataValues = await this._session.read(nodesToRead);
                let index = 0;
                for (const dataId in this._nodes) {
                    if (this._nodes.hasOwnProperty(dataId)) {
                        const node = this._nodes[dataId];
                        const dataValue = dataValues[index++];
                        if (dataValue.statusCode.name === 'Good') {
                            node.value = dataValue.value.value;
                            node.rawType = dataValue.value.dataType;
                            node.type = getAsCoreDataType(dataValue.value.dataType);
                        } else {
                            node.value = null;
                            node.rawType = DataType.Null;
                            node.type = getAsCoreDataType(DataType.Null);
                            console.error(`❌ Bad node '${dataId}' status: ${dataValue.statusCode.name}`);
                        }
                    }
                }
            }
        }

        Stop(onSuccess, onError) {
            this._running = false;
            const tasks = [];
            tasks.push((onSuc, onErr) => {
                if (this._connected && this._onDisconnected) {
                    try {
                        this._onDisconnected();
                    } catch (error) {
                        console.error(`Failed calling onDisonnected(): ${error.message}`)
                    }
                }
                onSuc();
            });
            tasks.push((onSuc, onErr) => {
                const nodes = this._nodes, terminations = [];
                for (const dataId in nodes) {
                    if (nodes.hasOwnProperty(dataId)) {
                        (function () {
                            const node = nodes[dataId];
                            if (node.monitoredItem) {
                                terminations.push(getTerminateMonitoringTask(node));
                            }
                        }());
                    }
                }
                terminations.parallel = true;
                Executor.run(terminations, onSuc, error => {
                    console.error(`Failed to un-monitor ${error.message}`);
                    onSuc();
                });
            });
            if (this._subscription) {
                tasks.push((onSuc, onErr) => {
                    this._subscription.terminate().then(() => {
                        this._subscription = null;
                        onSuc();
                    }).catch(error => {
                        this._subscription = null;
                        console.error(`Failed to terminate subscription ${error.message}`);
                        onSuc();
                    });
                });
            }
            if (this._session) {
                tasks.push((onSuc, onErr) => {
                    this._session.close().then(() => {
                        this._session = null;
                        onSuc();
                    }).catch(error => {
                        this._session = null;
                        console.error(`Failed to close session ${error.message}`);
                        onSuc();
                    });
                });
            }
            tasks.push((onSuc, onErr) => {
                this._client.disconnect().then(onSuc).catch(error => {
                    console.error(`Failed to disconnect ${error.message}`);
                    onSuc();
                });
            });
            Executor.run(tasks, () => {
                console.log(`Successfully stopped OPC UA client to endpoint url: ${this._endpointUrl}`);
                onSuccess();
            }, error => {
                const message = `Failed stopping OPC UC client to endpoint url ${this._endpointUrl}: ${error.message}`;
                console.error(message);
                onError(message);
            });
        }

        GetType(dataId) {
            const node = this._nodes[dataId];
            return node ? node.type : Core.DataType.Unknown;
        }

        SubscribeData(dataId, onRefresh) {
            const node = this._nodes[dataId];
            if (!node) {
                throw new Error(`Unknown data id: '${dataId}'`);
            } else if (node.onRefresh === onRefresh) {
                console.error(`Node with data id: '${dataId}' is already subscribed with same onRefresh(value) callback`);
            } else {
                node.onRefresh = onRefresh;
                if (node.value !== null) {
                    try {
                        onRefresh(node.value);
                    } catch (error) {
                        console.error(`Failed calling onResfresh(value) for id '${node.dataId}'`);
                    }
                }
                if (this._subscription && !this._updateMonitoringTimer) {
                    this._updateMonitoringTimer = setTimeout(() => {
                        this._updateMonitoringTimer = null;
                        this._updateMonitoring();
                    }, UPDATE_MONITORING_DELAY);
                }
            }
        }

        UnsubscribeData(dataId, onRefresh) {
            const node = this._nodes[dataId];
            if (!node) {
                throw new Error(`Unknown data id: '${dataId}'`);
            } else if (node.onRefresh !== onRefresh) {
                console.error(`Node with data id: '${dataId}' is not subscribed with passed onRefresh(value) callback`);
            } else {
                node.onRefresh = null;
                if (this._subscription && !this._updateMonitoringTimer) {
                    this._updateMonitoringTimer = setTimeout(() => {
                        this._updateMonitoringTimer = null;
                        this._updateMonitoring();
                    }, UPDATE_MONITORING_DELAY);
                }
            }
        }

        _updateMonitoring() {
            if (this._subscription) {
                const toAdd = [], toRemove = [];
                for (const dataId in this._nodes) {
                    if (this._nodes.hasOwnProperty(dataId)) {
                        const node = this._nodes[dataId];
                        if (node.onRefresh) {
                            if (!node.monitoredItem) {
                                toAdd.push(getEstablishMonitoringTask(this._subscription, node));
                            }
                        } else {
                            if (node.monitoredItem) {
                                toRemove.push(getTerminateMonitoringTask(node));
                            }
                        }
                    }
                }
                const tasks = [];
                if (toRemove.length > 0) {
                    toRemove.parallel = true;
                    tasks.push((onSuccess, onError) => Executor.run(toRemove, onSuccess, error => onSuccess()));
                }
                if (toAdd.length > 0) {
                    toAdd.parallel = true;
                    tasks.push((onSuccess, onError) => Executor.run(toAdd, onSuccess, error => onSuccess()));
                }
                Executor.run(tasks,
                    () => console.log(`Successfully removed ${toRemove.length} and added ${toAdd.length} monitoring items on OPC UA client with endpoint url: ${this._endpointUrl}`),
                    error => console.error(`Failed removing ${toRemove.length} and adding ${toAdd.length} monitoring items on OPC UC client with endpoint url ${this._endpointUrl}: ${error.message}`)
                );
            }
        }

        Read(dataId, onResponse, onError) {
            const node = this._nodes[dataId];
            if (!node) {
                throw new Error(`Unknown data id: '${dataId}'`);
            }
            try {
                this._session.read({
                    nodeId: node.nodeId,
                    attributeId: AttributeIds.Value
                }).then(dataValue => {
                    if (dataValue.statusCode.name === 'Good') {
                        const value = dataValue.value.value;
                        console.log(`✅ Value ${value} read from node '${node.rawNodeId}'`);
                        onResponse(value);
                    } else {
                        console.error(`⚠️  NodeId ${node.nodeId} exists, but status: ${dataValue.statusCode.name}`);
                    }
                }).catch(error => {
                    console.error(`❌ Cannot read from node ${node.rawNodeId}: ${error.message}`);
                    onError(`Cannot read from node ${node.rawNodeId}: ${error.message}`);
                });
            } catch (error) {
                console.error(`❌ NodeId ${nodeId} could not be read: ${error.message}`);
                onError(`NodeId ${nodeId} could not be read: ${error.message}`);
            }
        }

        Write(dataId, value) {
            const node = this._nodes[dataId];
            if (!node) {
                throw new Error(`Unknown data id '${dataId}' fro write`);
            }
            try {
                this._session.writeSingleNode(
                    node.accessString,
                    { dataType: node.rawType, value }
                ).then(() => {
                    console.log(`✅ Value ${value} written to node '${node.rawNodeId}'`);
                }).catch(error => {
                    console.error(`❌ Cannot write value ${value} to node ${node.rawNodeId}: ${error.message}`);
                });
            } catch (error) {
                console.error(`❌ NodeId ${node.rawNodeId} could not be written: ${error.message}`);
            }
        }

        GetDataPoints() {
            const dataPoints = [];
            for (const dataId in this._nodes) {
                if (this._nodes.hasOwnProperty(dataId)) {
                    const node = this._nodes[dataId];
                    if (typeof node.type === 'number') {
                        dataPoints.push({ id: dataId, type: node.type });
                    }
                }
            }
            return dataPoints;
        }
    }
    OPCUA.Client = Client;

    Object.freeze(OPCUA);
    if (isNodeJS) {
        module.exports = OPCUA;
    } else {
        root.Template = OPCUA;
    }
}(globalThis));
