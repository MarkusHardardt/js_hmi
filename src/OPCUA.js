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

    async function startOpcuaClientAsync(client, endpointUrl, nodes) {
        try {
            console.log(`Connecting OPC UC client to endpointUrl: ${endpointUrl}`);
            while (true) {
                try {
                    console.log('Trying to connect...');
                    await client.connect(endpointUrl);
                    console.log('Connected!');
                    break;
                } catch (error) {
                    console.log('Server not available, retrying in 3s...');
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
            const session = await client.createSession();
            console.log('Successfully connected!');

            for (const dataId in nodes) {
                if (nodes.hasOwnProperty(dataId)) {
                    const node = nodes[dataId];
                    try {
                        const dataValue = await session.read({ nodeId: node.nodeId, attributeId: AttributeIds.Value });
                        if (dataValue.statusCode.name === 'Good') {
                            node.value = dataValue.value.value;
                            node.rawType = dataValue.value.dataType;
                            node.type = getAsCoreDataType(dataValue.value.dataType);
                        } else {
                            console.error(`❌  NodeId ${id} exists, but status: ${dataValue.statusCode.name}`);
                        }
                    } catch (err) {
                        console.error(`❌ NodeId ${id} could not be read:`, err.message);
                    }
                }
            }
            return session;
        } catch (error) {
            console.error(`Failed starting OPC UC client: ${error.message}`);
        }
    }

    async function stopOpcuaClientAsync(session, client, subscription, nodes) {
        try {
            console.log('cleaning up ...');
            for (const dataId in nodes) {
                if (nodes.hasOwnProperty(dataId)) {
                    const node = nodes[dataId];
                    if (node.monitoredItem) {
                        await node.monitoredItem.terminate();
                    }
                }
            }
            await subscription.terminate();
            await session.close();
            await client.disconnect();
            console.log('cleanup done');
        } catch (error) {
            console.error(`Failed stopping OPC UC client: ${error.message}`);
        }
    }

    async function updateMonitoredItems(subscription, toRemove, toAdd) {
        /* ChatGPT generated:
        await Promise.all(toRemove.map(id => {
            const mi = activeItems.get(id);
            activeItems.delete(id);
            return mi.terminate();
        }));

        await Promise.all(toAdd.map(async id => {
            const mi = await subscription.monitor(...);
            activeItems.set(id, mi);
        })); */
        await Promise.allSettled(toRemove.map(node => {
            node.monitoredItem.terminate().then(() => {
                console.log(`Un-monitored id '${node.dataId}'`);
            }).catch(error => {
                console.error(`Failed to un-monitor '${node.dataId}': ${error.message}`);
            });
        }));
        console.log(`un-monitored ${toRemove.length} items`);
        toRemove.splice(0, toRemove.length);

        await Promise.allSettled(toAdd.map(async node => {
            await subscription.monitor(
                {
                    nodeId: node.nodeId,
                    attributeId: AttributeIds.Value
                },
                {
                    samplingInterval: 500,  // ms
                    discardOldest: true,
                    queueSize: 10
                },
                TimestampsToReturn.Both
            ).then(monitoredItem => {
                console.log(`Monitored id '${node.dataId}'`);
                node.monitoredItem = monitoredItem;
                monitoredItem.on('changed', dataValue => {
                    const value = dataValue.value.value;
                    console.log(`Value changed: ${value}`);
                    try {
                        node.onRefresh(value);
                    } catch (error) {
                        console.error(`Failed calling onResfresh(value) for id '${node.dataId}'`);
                    }
                });
            }).catch(error => console.error(`Failed to monitor '${node.dataId}': ${error.message}`));
        }));
        console.log(`monitored ${toAdd.length} items`);
        toAdd.splice(0, toAdd.length);
    }

    const UPDATE_MONITORING_DELAY = 200;

    const ClientState = Object.freeze({
        Idle: 0,
        Connect: 1,
        WaitForConnection: 2
    });

    class Client {
        constructor(endpointUrl, namespace, nodesConfig) {
            this._endpointUrl = endpointUrl;
            this._nodes = {};
            for (const dataId in nodesConfig) {
                if (nodesConfig.hasOwnProperty(dataId)) {
                    const rawNodeId = nodesConfig[dataId];
                    const accessString = getAccessString(namespace, rawNodeId);
                    const nodeId = resolveNodeId(accessString);
                    this._nodes[dataId] = { dataId, rawNodeId, accessString, nodeId, value: null, onRefresh: null };
                }
            }
            this._client = OPCUAClient.create({
                endpointMustExist: false, // Do NOT cache and pin the endpoint description from the first successful connection.
                connectionStrategy: {
                    initialDelay: 1000,
                    maxRetry: -1       // infinite retry AFTER first connection
                }
            });
            this._session = null;
            this._updateMonitoringTimer = null;
            this._monitoredItems = {};
            this._state = ClientState.Idle;
        }

        Start() {
            this._state = ClientState.Connect;
        }

        Run() {
            switch (this._state) {
                case ClientState.Connect:
                    this._state = ClientState.WaitForConnection;
                    try {
                        console.log('Trying to connect...');
                        await client.connect(endpointUrl);
                        console.log('Connected!');
                        break;
                    } catch (error) {
                        console.log('Server not available, retrying in 3s...');
                        await new Promise(r => setTimeout(r, 3000));
                    }

            }
        }

        Stop() {

        }

        Initialize(onSuccess, onError) { // TODO: This must noch be called in build, apply, prepare or start because of connecting attemts at startup
            const tasks = [];
            tasks.push((onSuc, onErr) => startOpcuaClientAsync(this._client, this._endpointUrl, this._nodes).then(session => {
                this._session = session;
                onSuc();
            }).catch(onErr));
            tasks.push((onSuc, onErr) => {
                this._subscription = ClientSubscription.create(this._session, {
                    requestedPublishingInterval: 1000,   // ms
                    requestedLifetimeCount: 100,
                    requestedMaxKeepAliveCount: 10,
                    maxNotificationsPerPublish: 100,
                    publishingEnabled: true,
                    priority: 10
                });
                this._subscription.on('started', () => {
                    console.log('Subscription started - ID:', this._subscription.subscriptionId);
                }).on('terminated', () => {
                    console.log('Subscription terminated');
                });
                onSuc();
            });
            Executor.run(tasks, () => {
                // console.log(`Nodes: ${JSON.stringify(this._nodes, undefined, 2)}`);
                onSuccess();
            }, error => {
                onError(error);
            })
        }

        Shutdown(onSuccess, onError) {
            if (this._session) {
                stopOpcuaClientAsync(this._session, this._client, this._subscription, this._nodes).then(onSuccess);
            } else {
                onError('Session not started');
            }
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
                if (!this._updateMonitoringTimer) {
                    this._updateMonitoringTimer = setTimeout(() => {
                        this._updateMonitoringTimer = null;
                        this._updateMonitoring();
                    }, UPDATE_MONITORING_DELAY);
                }
                /* this._subscription.monitor(
                    {
                        nodeId: node.nodeId,
                        attributeId: AttributeIds.Value
                    },
                    {
                        samplingInterval: 500,  // ms
                        discardOldest: true,
                        queueSize: 10
                    },
                    TimestampsToReturn.Both
                ).then(monitoredItem => {
                    console.log(`Monitored id '${node.dataId}'`);
                    node.monitoredItem = monitoredItem;
                    monitoredItem.on('changed', dataValue => {
                        const value = dataValue.value.value;
                        console.log(`Value changed: ${value}`);
                        try {
                            node.onRefresh(value);
                        } catch (error) {
                            console.error(`Failed calling onResfresh(value) for id '${node.dataId}'`);
                        }
                    });
                }).catch(error => console.error(`Failed to monitor '${node.dataId}': ${error.message}`)); */
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
                if (!this._updateMonitoringTimer) {
                    this._updateMonitoringTimer = setTimeout(() => {
                        this._updateMonitoringTimer = null;
                        this._updateMonitoring();
                    }, UPDATE_MONITORING_DELAY);
                }
                /* if (node.monitoredItem) {
                    node.monitoredItem.terminate().then(() => console.log(`Un-monitored id '${node.dataId}'`)).catch(error => console.error(`Failed to un-monitor '${node.dataId}': ${error.message}`));
                } */
            }
        }

        _updateMonitoring() {
            const toAdd = [], toRemove = [];
            for (const dataId in this._nodes) {
                if (this._nodes.hasOwnProperty(dataId)) {
                    const node = this._nodes[dataId];
                    if (node.onRefresh) {
                        if (this._monitoredItems[dataId] === undefined) {
                            this._monitoredItems[dataId] = true;
                            toAdd.push(node);
                        }
                    } else {
                        if (this._monitoredItems[dataId] === true) {
                            delete this._monitoredItems[dataId];
                            toRemove.push(node);
                        }
                    }
                }
            }
            updateMonitoredItems(this._subscription, toRemove, toAdd).then(() => {
                console.log('Updated monitoring');
            }).catch(error => {
                conmsole.error(`Failed updating monitoring: ${error.message}`);
            });
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
                console.error(`❌ NodeId ${accessString} could not be written: ${error.message}`);
            }
            /* writeNodeAsync(this._session, node.accessString, node.rawType, value).then(() => {
                console.log(`✅ Value ${value} written to node '${node.rawNodeId}'`);
            }).catch(error => {
                console.error(`❌ Cannot write value ${value} to node ${node.rawNodeId}: ${error.message}`);
            }); */
        }

        GetDataPoints() {
            const dataPoints = [];
            for (const dataId in this._nodes) {
                if (this._nodes.hasOwnProperty(dataId)) {
                    const node = this._nodes[dataId];
                    dataPoints.push({ id: dataId, type: node.type });
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
